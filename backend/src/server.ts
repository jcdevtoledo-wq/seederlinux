// =============================================================================
// SeederLinux v3.0 — Backend API (Fastify + Prisma)
// Arquitetura alinhada com Documentação v3.0:
//  - Organization = APENAS metadados
//  - VariableDefinition = catálogo oficial (Doc 06)
//  - OrganizationVariable = ÚNICA fonte de verdade dos valores
// =============================================================================

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { VARIABLE_CATALOG } from './seed/variable-catalog';
import {
  bootstrapTls,
  configureTlsFromSetup,
  getActiveTls,
  exportToDisk,
  type TlsMode,
} from './lib/cert-manager';

const prisma = new PrismaClient();

// =============================================================================
// Helpers
// =============================================================================

function hasRole(userRoles: any[], role: string): boolean {
  return userRoles.some((r: any) => r.role === role);
}

function isAdminGap(userRoles: any[]): boolean {
  return hasRole(userRoles, 'admin_gap');
}

function canAccessOrg(userRoles: any[], orgSigla: string): boolean {
  return (
    isAdminGap(userRoles) ||
    hasRole(userRoles, 'auditor') ||
    userRoles.some((r: any) => r.role === 'operador_om' && r.orgSigla === orgSigla)
  );
}

function canEditOrg(userRoles: any[], orgSigla: string): boolean {
  return (
    isAdminGap(userRoles) ||
    userRoles.some((r: any) => r.role === 'operador_om' && r.orgSigla === orgSigla)
  );
}

/** Garante que o catálogo de variáveis está populado (cria entradas faltantes). */
async function ensureCatalogSeeded(): Promise<void> {
  for (const def of VARIABLE_CATALOG) {
    await prisma.variableDefinition.upsert({
      where: { key: def.key },
      update: {
        label: def.label,
        category: def.category,
        description: def.description,
        type: def.type,
        required: def.required,
        editable: def.editable,
        oficial: def.oficial,
        defaultValue: def.defaultValue,
        exemplo: def.exemplo ?? null,
        validation: def.validation ?? null,
        coreModule: def.coreModule ?? null,
      },
      create: {
        key: def.key,
        label: def.label,
        category: def.category,
        description: def.description,
        type: def.type,
        required: def.required,
        editable: def.editable,
        oficial: def.oficial,
        defaultValue: def.defaultValue,
        exemplo: def.exemplo ?? null,
        validation: def.validation ?? null,
        coreModule: def.coreModule ?? null,
      },
    });
  }
}

/** Cria todas as variáveis do catálogo para uma OM, com seus valores padrão. */
async function createDefaultOrgVariables(
  orgId: string,
  overrides: Record<string, string> = {}
): Promise<void> {
  const definitions = await prisma.variableDefinition.findMany();
  for (const def of definitions) {
    const value =
      overrides[def.key] !== undefined ? overrides[def.key] : def.defaultValue ?? '';
    await prisma.organizationVariable.upsert({
      where: {
        organizationId_definitionId: {
          organizationId: orgId,
          definitionId: def.id,
        },
      },
      update: { value },
      create: {
        organizationId: orgId,
        definitionId: def.id,
        value,
      },
    });
  }
}

function validateValue(value: string, type: string): boolean {
  if (!value) return true;
  switch (type) {
    case 'ip':
      return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
    case 'url':
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    case 'integer':
      return /^-?\d+$/.test(value);
    case 'boolean':
      return ['true', 'false', '1', '0'].includes(value.toLowerCase());
    default:
      return true;
  }
}

// =============================================================================
// Server
// =============================================================================

async function buildServer(httpsOptions?: { cert: string; key: string }) {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    ...(httpsOptions
      ? {
          https: {
            cert: httpsOptions.cert,
            key: httpsOptions.key,
            minVersion: 'TLSv1.2' as const,
          },
        }
      : {}),
  });

  // Serializa BigInt automaticamente
  app.addHook('preSerialization', async (_request, _reply, payload) => {
    function serialize(value: any): any {
      if (value === null || value === undefined) return value;
      if (typeof value === 'bigint') return Number(value);
      if (Array.isArray(value)) return value.map(serialize);
      if (typeof value === 'object' && value.constructor === Object) {
        const result: any = {};
        for (const [k, v] of Object.entries(value)) result[k] = serialize(v);
        return result;
      }
      return value;
    }
    return serialize(payload);
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'seederlinux-jwt-secret',
  });

  const authenticate = async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  };

  app.addHook('onRequest', async (request: any, reply) => {
    if (request.method === 'OPTIONS') return;
    if (
      request.url === '/health' ||
      request.url === '/api/setup' ||
      request.url === '/api/setup/status' ||
      request.url === '/api/auth/login' ||
      request.url.startsWith('/api/public/')
    ) {
      return;
    }
    if (request.url.startsWith('/api/')) {
      await authenticate(request, reply);
    }
  });

  // Garante catálogo populado ao subir
  try {
    await ensureCatalogSeeded();
    app.log.info(`[catalog] ${VARIABLE_CATALOG.length} variable definitions ensured.`);
  } catch (err) {
    app.log.warn({ err }, '[catalog] Failed to seed catalog (DB might be unreachable).');
  }

  // ==========================================================================
  // HEALTH
  // ==========================================================================
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ==========================================================================
  // SETUP (PUBLIC)
  // ==========================================================================
  app.get('/api/setup/status', async () => {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'setup_completed' } });
    return { completed: config?.value === 'true' };
  });

  app.post('/api/setup', async (request, reply) => {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'setup_completed' },
    });
    if (config?.value === 'true') {
      return reply.code(400).send({ error: 'Setup already completed' });
    }

    const {
      setupToken,
      adminEmail,
      adminPassword,
      adminName,
      orgName,
      orgSigla,
      orgDescricao,
      // Variáveis iniciais da OM (opcionais — populadas no Setup Wizard)
      variables: customVariables,
      // TLS (Documento 15 v3.1 — obrigatório)
      tls: tlsPayload,
    } = request.body as any;

    const expectedToken = (process.env.SETUP_TOKEN || '').trim();
    const receivedToken = (setupToken || '').trim();

    if (!expectedToken || receivedToken !== expectedToken) {
      app.log.warn('[setup] Token mismatch');
      return reply.code(401).send({ error: 'Invalid setup token' });
    }

    if (!adminEmail || !adminPassword || !orgName || !orgSigla) {
      return reply
        .code(400)
        .send({ error: 'Missing required fields: adminEmail, adminPassword, orgName, orgSigla' });
    }

    const sigla = String(orgSigla).toUpperCase();

    const existingOrg = await prisma.organization.findUnique({ where: { sigla } });
    if (existingOrg) {
      return reply
        .code(409)
        .send({ error: `Organization ${sigla} already exists. Reset the database.` });
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { email: String(adminEmail).toLowerCase() },
    });
    if (existingAdmin) {
      return reply
        .code(409)
        .send({ error: `Admin user with email ${adminEmail} already exists.` });
    }

    try {
      // 1. Garante catálogo populado
      await ensureCatalogSeeded();

      // 2. Cria organização (APENAS METADADOS)
      const org = await prisma.organization.create({
        data: {
          nome: orgName,
          sigla,
          descricao: orgDescricao || '',
          ativo: true,
          status: 'active',
          serial: 0,
        },
      });

      // 3. Cria TODAS as variáveis da OM (do catálogo) com valores padrão
      await createDefaultOrgVariables(org.id, customVariables || {});

      // 4. Cria branding default
      await prisma.brandingConfig.create({
        data: {
          orgId: org.id,
          displayName: customVariables?.DISPLAY_NAME || orgName,
          theme: customVariables?.THEME || 'Mint-Y-Dark',
          conkyEnabled: false,
          shortcutsEnabled: true,
          conkyConfig: {},
        },
      });

      // 5. Cria admin
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = await prisma.user.create({
        data: {
          email: String(adminEmail).toLowerCase(),
          password: hashedPassword,
          displayName: adminName,
          roles: { create: { role: 'admin_gap' } },
        },
        include: { roles: true },
      });

      // 6. Configura TLS (Documento 15 v3.1 — obrigatório)
      // Default: SELF_SIGNED se o cliente não informar
      const tlsMode: TlsMode = (tlsPayload?.mode || 'SELF_SIGNED') as TlsMode;
      let tlsResult: any = null;
      try {
        const bundle = await configureTlsFromSetup(prisma, {
          mode: tlsMode,
          hostname: tlsPayload?.hostname || `seederlinux.${sigla.toLowerCase()}.local`,
          sans: tlsPayload?.sans || ['localhost', '127.0.0.1', '::1'],
          cert: tlsPayload?.cert,
          key: tlsPayload?.key,
          ca: tlsPayload?.ca,
        });
        // Exporta para o disco se TLS_DIR estiver definido (best-effort)
        if (process.env.TLS_DIR) {
          try {
            await exportToDisk(prisma, process.env.TLS_DIR);
          } catch (err) {
            app.log.warn({ err }, '[tls] Failed to export to disk (non-fatal)');
          }
        }
        tlsResult = {
          mode: tlsMode,
          hostname: bundle.hostname,
          fingerprint: bundle.fingerprint,
          expiresAt: bundle.expiresAt,
        };
      } catch (err: any) {
        app.log.error({ err }, '[setup] TLS configuration failed');
        return reply
          .code(500)
          .send({ success: false, message: `TLS setup failed: ${err.message}` });
      }

      // 7. Marca setup como completo
      await prisma.systemConfig.upsert({
        where: { key: 'setup_completed' },
        update: { value: 'true' },
        create: { key: 'setup_completed', value: 'true' },
      });
      await prisma.systemConfig.upsert({
        where: { key: 'root_organization_id' },
        update: { value: org.id },
        create: { key: 'root_organization_id', value: org.id },
      });
      await prisma.systemConfig.upsert({
        where: { key: 'system_version' },
        update: { value: '3.0.0' },
        create: { key: 'system_version', value: '3.0.0' },
      });

      // 8. Audit
      await prisma.auditEvent.create({
        data: {
          atorId: admin.id,
          atorEmail: admin.email,
          orgId: org.id,
          categoria: 'setup',
          acao: 'complete',
          alvo: sigla,
          detalhes: `Setup wizard completed for ${orgName} (tls=${tlsMode})`,
        },
      });

      const token = app.jwt.sign({
        userId: admin.id,
        email: admin.email,
        roles: admin.roles.map((r: any) => ({ role: r.role, orgSigla: r.orgSigla })),
      });

      return reply.code(201).send({
        success: true,
        token,
        user: {
          id: admin.id,
          email: admin.email,
          displayName: admin.displayName,
          roles: admin.roles,
        },
        organization: org,
        tls: tlsResult,
        restartRequired: true, // servidor precisa reiniciar para ativar HTTPS
      });
    } catch (err: any) {
      app.log.error({ err }, '[setup] Failed');
      return reply.code(500).send({ error: `Setup failed: ${err.message}` });
    }
  });

  // ==========================================================================
  // AUTH
  // ==========================================================================
  app.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body as any;
    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
      include: { roles: true },
    });
    if (!user || user.blocked) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return reply.code(401).send({ error: 'Invalid credentials' });

    const token = app.jwt.sign({
      userId: user.id,
      email: user.email,
      roles: user.roles.map((r: any) => ({ role: r.role, orgSigla: r.orgSigla })),
    });

    await prisma.auditEvent.create({
      data: {
        atorId: user.id,
        atorEmail: user.email,
        categoria: 'auth',
        acao: 'login',
        alvo: user.email,
      },
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
      },
    };
  });

  app.get('/api/auth/me', async (request: any, reply) => {
    const fullUser = await prisma.user.findUnique({
      where: { id: request.user.userId },
      include: { roles: true },
    });
    if (!fullUser) return reply.code(404).send({ error: 'User not found' });
    return {
      id: fullUser.id,
      email: fullUser.email,
      displayName: fullUser.displayName,
      blocked: fullUser.blocked,
      roles: fullUser.roles.map((r: any) => ({
        id: r.id,
        role: r.role,
        orgSigla: r.orgSigla,
      })),
    };
  });

  // ==========================================================================
  // USERS
  // ==========================================================================
  app.get('/api/users', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles)) return reply.code(403).send({ error: 'Forbidden' });
    const users = await prisma.user.findMany({
      include: { roles: true },
      orderBy: { email: 'asc' },
    });
    return users.map((u: any) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      blocked: u.blocked,
      createdAt: u.createdAt,
      roles: u.roles,
    }));
  });

  app.post('/api/users', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles)) return reply.code(403).send({ error: 'Forbidden' });
    const { email, password, displayName, role, orgSigla } = request.body as any;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: String(email).toLowerCase(),
        password: hashedPassword,
        displayName,
        roles: { create: { role, orgSigla } },
      },
      include: { roles: true },
    });
    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        categoria: 'users',
        acao: 'create',
        alvo: email,
      },
    });
    return user;
  });

  app.delete('/api/users/:id', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles)) return reply.code(403).send({ error: 'Forbidden' });
    if (request.params.id === request.user.userId)
      return reply.code(400).send({ error: 'Cannot delete yourself' });
    const user = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!user) return reply.code(404).send({ error: 'Not found' });
    await prisma.user.delete({ where: { id: request.params.id } });
    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        categoria: 'users',
        acao: 'delete',
        alvo: user.email,
      },
    });
    return { success: true };
  });

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================
  app.get('/api/organizations', async (request: any) => {
    const user = request.user;
    if (isAdminGap(user.roles) || hasRole(user.roles, 'auditor')) {
      return prisma.organization.findMany({ orderBy: { sigla: 'asc' } });
    }
    const siglas = user.roles
      .filter((r: any) => r.role === 'operador_om' && r.orgSigla)
      .map((r: any) => r.orgSigla);
    return prisma.organization.findMany({
      where: { sigla: { in: siglas } },
      orderBy: { sigla: 'asc' },
    });
  });

  app.get('/api/organizations/:id', async (request: any, reply) => {
    const org = await prisma.organization.findUnique({
      where: { id: request.params.id },
      include: {
        variables: { include: { definition: true } },
        branding: true,
      },
    });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canAccessOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });

    // Converte variáveis para mapa chave -> valor
    const config: Record<string, string> = {};
    for (const v of org.variables) {
      config[v.definition.key] = v.value ?? '';
    }

    return {
      id: org.id,
      nome: org.nome,
      sigla: org.sigla,
      descricao: org.descricao,
      ativo: org.ativo,
      status: org.status,
      cor: org.cor,
      serial: org.serial,
      estacoes: org.estacoes,
      scriptsAtivos: org.scriptsAtivos,
      config,
      branding: org.branding,
      created_at: org.createdAt,
      updated_at: org.updatedAt,
    };
  });

  app.post('/api/organizations', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles)) return reply.code(403).send({ error: 'Forbidden' });

    const { nome, sigla, descricao, ativo, cor, config } = request.body as any;
    if (!nome || !sigla) {
      return reply.code(400).send({ error: 'nome and sigla are required' });
    }

    const siglaUpper = String(sigla).toUpperCase();
    const existing = await prisma.organization.findUnique({ where: { sigla: siglaUpper } });
    if (existing) return reply.code(400).send({ error: 'Sigla already exists' });

    const org = await prisma.organization.create({
      data: {
        nome,
        sigla: siglaUpper,
        descricao: descricao || '',
        ativo: ativo ?? true,
        cor: cor || 'oklch(0.6 0.15 200)',
        serial: 0,
      },
    });

    // Cria TODAS as variáveis do catálogo para a nova OM
    await createDefaultOrgVariables(org.id, config || {});

    // Branding default
    await prisma.brandingConfig.create({
      data: {
        orgId: org.id,
        displayName: config?.DISPLAY_NAME || nome,
        theme: config?.THEME || 'Mint-Y-Dark',
        conkyEnabled: false,
        shortcutsEnabled: true,
        conkyConfig: {},
      },
    });

    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        orgId: org.id,
        categoria: 'organizations',
        acao: 'create',
        alvo: org.sigla,
      },
    });

    return org;
  });

  app.patch('/api/organizations/:id', async (request: any, reply) => {
    const { id } = request.params as { id: string };
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canEditOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });

    const { nome, sigla, descricao, ativo, cor, config } = request.body as any;

    // 1. Metadados
    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (sigla !== undefined) updateData.sigla = String(sigla).toUpperCase();
    if (descricao !== undefined) updateData.descricao = descricao;
    if (ativo !== undefined) updateData.ativo = ativo;
    if (cor !== undefined) updateData.cor = cor;

    let updated = await prisma.organization.update({ where: { id }, data: updateData });

    // 2. Variáveis (config)
    let variableChanged = false;
    if (config && typeof config === 'object') {
      for (const [key, value] of Object.entries(config)) {
        const def = await prisma.variableDefinition.findUnique({ where: { key } });
        if (!def) continue;
        await prisma.organizationVariable.upsert({
          where: {
            organizationId_definitionId: {
              organizationId: id,
              definitionId: def.id,
            },
          },
          update: { value: String(value ?? '') },
          create: {
            organizationId: id,
            definitionId: def.id,
            value: String(value ?? ''),
          },
        });
        variableChanged = true;
      }
      if (variableChanged) {
        updated = await prisma.organization.update({
          where: { id },
          data: { serial: { increment: 1 } },
        });
      }
    }

    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        orgId: id,
        categoria: 'organizations',
        acao: 'update',
        alvo: org.sigla,
        detalhes: JSON.stringify({
          fields: Object.keys(updateData),
          vars: config ? Object.keys(config) : [],
        }),
      },
    });

    return updated;
  });

  app.delete('/api/organizations/:id', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles)) return reply.code(403).send({ error: 'Forbidden' });
    const org = await prisma.organization.findUnique({ where: { id: request.params.id } });
    if (!org) return reply.code(404).send({ error: 'Not found' });

    const stationCount = await prisma.station.count({ where: { orgId: org.id } });
    if (stationCount > 0) {
      return reply.code(400).send({ error: 'Cannot delete organization with stations' });
    }

    await prisma.organization.delete({ where: { id: request.params.id } });
    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        categoria: 'organizations',
        acao: 'delete',
        alvo: org.sigla,
      },
    });
    return { success: true };
  });

  app.post('/api/organizations/:id/increment-serial', async (request: any, reply) => {
    const { id } = request.params as { id: string };
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canEditOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });

    const updated = await prisma.organization.update({
      where: { id },
      data: { serial: { increment: 1 } },
    });
    return { serial: updated.serial };
  });

  // ==========================================================================
  // ORGANIZATION VALIDATOR (Tarefa 6)
  // ==========================================================================
  app.get('/api/organizations/:id/validate', async (request: any, reply) => {
    const { id } = request.params as { id: string };
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canAccessOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });

    const requiredDefs = await prisma.variableDefinition.findMany({ where: { required: true } });
    const values = await prisma.organizationVariable.findMany({
      where: { organizationId: id },
      include: { definition: true },
    });

    const valueByKey = new Map(values.map((v) => [v.definition.key, v.value || '']));

    const missing: any[] = [];
    const invalid: any[] = [];

    for (const def of requiredDefs) {
      const v = valueByKey.get(def.key);
      if (!v || v.trim() === '') {
        missing.push({
          key: def.key,
          category: def.category,
          description: def.description,
        });
      } else if (!validateValue(v, def.type)) {
        invalid.push({ key: def.key, value: v, expected_type: def.type });
      }
    }

    return {
      valid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid,
      total_required: requiredDefs.length,
      configured: requiredDefs.length - missing.length,
    };
  });

  // ==========================================================================
  // ORGANIZATION EXPORT — gera arquivo .conf (Tarefa 8)
  // ==========================================================================
  app.post('/api/organizations/:id/export', async (request: any, reply) => {
    const { id } = request.params as { id: string };
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        variables: { include: { definition: true } },
      },
    });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canAccessOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });

    const lines: string[] = [
      '# ============================================================',
      `# /opt/seederlinux/etc/${org.sigla.toLowerCase()}.conf`,
      `# Configuracao da OM ${org.sigla} - gerado por SeederLinux v3.0`,
      `# Data: ${new Date().toISOString()}`,
      `# Serial: ${org.serial}`,
      '# ============================================================',
      '',
      `export ORG="${org.sigla.toLowerCase()}"`,
      `export ORG_SIGLA="${org.sigla}"`,
      `export ORG_NOME="${org.nome}"`,
      `export SERIAL="${org.serial}"`,
      '',
    ];

    // Agrupa por categoria
    const byCategory = new Map<string, typeof org.variables>();
    for (const v of org.variables) {
      const cat = v.definition.category;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(v);
    }

    const sortedCategories = [...byCategory.keys()].sort();
    for (const cat of sortedCategories) {
      lines.push(`# ---- ${cat} ----`);
      const sorted = byCategory.get(cat)!.sort((a, b) =>
        a.definition.key.localeCompare(b.definition.key)
      );
      for (const v of sorted) {
        const value = v.value ?? '';
        lines.push(`export ${v.definition.key}="${value}"`);
      }
      lines.push('');
    }

    const content = lines.join('\n');
    const filePath = `/opt/seederlinux/etc/${org.sigla.toLowerCase()}.conf`;

    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        orgId: id,
        categoria: 'organizations',
        acao: 'export_conf',
        alvo: org.sigla,
        detalhes: `serial=${org.serial}`,
      },
    });

    return {
      success: true,
      data: {
        content,
        path: filePath,
        serial: org.serial,
        filename: `${org.sigla.toLowerCase()}.conf`,
      },
    };
  });

  // ==========================================================================
  // VARIABLE DEFINITIONS (catálogo global)
  // ==========================================================================
  app.get('/api/variables/catalog', async () => {
    return prisma.variableDefinition.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  });

  app.post('/api/variables/catalog', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles)) return reply.code(403).send({ error: 'Forbidden' });
    const { key, label, category, description, type, required, editable, defaultValue, exemplo, validation, coreModule } =
      request.body as any;
    if (!key || !label || !category)
      return reply.code(400).send({ error: 'key, label and category are required' });

    const entry = await prisma.variableDefinition.upsert({
      where: { key },
      update: {
        label,
        category,
        description: description || '',
        type: type || 'string',
        required: required ?? false,
        editable: editable ?? true,
        defaultValue: defaultValue ?? null,
        exemplo: exemplo ?? null,
        validation: validation ?? null,
        coreModule: coreModule ?? null,
      },
      create: {
        key,
        label,
        category,
        description: description || '',
        type: type || 'string',
        required: required ?? false,
        editable: editable ?? true,
        oficial: false,
        defaultValue: defaultValue ?? null,
        exemplo: exemplo ?? null,
        validation: validation ?? null,
        coreModule: coreModule ?? null,
      },
    });

    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        categoria: 'variables',
        acao: 'catalog_upsert',
        alvo: key,
      },
    });

    return entry;
  });

  app.delete('/api/variables/catalog/:key', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles)) return reply.code(403).send({ error: 'Forbidden' });
    const entry = await prisma.variableDefinition.findUnique({
      where: { key: request.params.key },
    });
    if (!entry) return reply.code(404).send({ error: 'Not found' });
    if (entry.oficial) return reply.code(403).send({ error: 'Cannot delete oficial catalog variable' });
    await prisma.variableDefinition.delete({ where: { key: request.params.key } });
    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        categoria: 'variables',
        acao: 'catalog_delete',
        alvo: request.params.key,
      },
    });
    return { success: true };
  });

  // ==========================================================================
  // ORGANIZATION VARIABLES (catalogo + valor atual)
  // ==========================================================================
  /**
   * GET /api/organizations/:orgId/variables
   * Retorna o catálogo completo de definições com o valor atual da OM.
   */
  app.get('/api/organizations/:orgId/variables', async (request: any, reply) => {
    const { orgId } = request.params as { orgId: string };
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canAccessOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });

    const definitions = await prisma.variableDefinition.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    const values = await prisma.organizationVariable.findMany({
      where: { organizationId: orgId },
    });
    const valueByDef = new Map(values.map((v) => [v.definitionId, v.value]));

    return definitions.map((def) => ({
      id: def.id,
      key: def.key,
      label: def.label,
      category: def.category,
      description: def.description,
      type: def.type,
      required: def.required,
      editable: def.editable,
      oficial: def.oficial,
      defaultValue: def.defaultValue,
      exemplo: def.exemplo,
      validation: def.validation,
      coreModule: def.coreModule,
      value: valueByDef.get(def.id) ?? def.defaultValue ?? '',
    }));
  });

  /**
   * PUT /api/organizations/:orgId/variables
   * Atualiza múltiplas variáveis em lote. Incrementa o serial da OM.
   */
  app.put('/api/organizations/:orgId/variables', async (request: any, reply) => {
    const { orgId } = request.params as { orgId: string };
    const { variables } = request.body as { variables: Record<string, string> };

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canEditOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });
    if (!variables || typeof variables !== 'object')
      return reply.code(400).send({ error: 'variables (object) is required' });

    let updates = 0;
    for (const [key, value] of Object.entries(variables)) {
      const def = await prisma.variableDefinition.findUnique({ where: { key } });
      if (!def) continue;
      await prisma.organizationVariable.upsert({
        where: {
          organizationId_definitionId: {
            organizationId: orgId,
            definitionId: def.id,
          },
        },
        update: { value: String(value ?? '') },
        create: {
          organizationId: orgId,
          definitionId: def.id,
          value: String(value ?? ''),
        },
      });
      updates += 1;
    }

    // Incrementa serial (Documento 05 - Regra 13)
    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { serial: { increment: 1 } },
    });

    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        orgId,
        categoria: 'variables',
        acao: 'bulk_update',
        alvo: org.sigla,
        detalhes: `updated=${updates}, keys=${Object.keys(variables).join(',')}`,
      },
    });

    return { success: true, updated: updates, serial: updated.serial };
  });

  /**
   * POST /api/organizations/:orgId/variables/:key
   * Atualiza uma única variável.
   */
  app.put('/api/organizations/:orgId/variables/:key', async (request: any, reply) => {
    const { orgId, key } = request.params as { orgId: string; key: string };
    const { value } = request.body as { value: string };

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canEditOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });

    const def = await prisma.variableDefinition.findUnique({ where: { key } });
    if (!def) return reply.code(404).send({ error: `Unknown variable key: ${key}` });

    await prisma.organizationVariable.upsert({
      where: {
        organizationId_definitionId: { organizationId: orgId, definitionId: def.id },
      },
      update: { value: String(value ?? '') },
      create: {
        organizationId: orgId,
        definitionId: def.id,
        value: String(value ?? ''),
      },
    });

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { serial: { increment: 1 } },
    });

    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        orgId,
        categoria: 'variables',
        acao: 'set',
        alvo: `${org.sigla}:${key}`,
      },
    });

    return { success: true, serial: updated.serial };
  });

  // Legacy alias: GET /api/variables/:orgId
  app.get('/api/variables/:orgId', async (request: any, reply) => {
    const { orgId } = request.params as { orgId: string };
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canAccessOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });

    const values = await prisma.organizationVariable.findMany({
      where: { organizationId: orgId },
      include: { definition: true },
    });
    return {
      orgId,
      sigla: org.sigla,
      variables: values.map((v) => ({ key: v.definition.key, value: v.value || '' })),
    };
  });

  // Legacy alias: POST /api/variables { orgId, key, value }
  app.post('/api/variables', async (request: any, reply) => {
    const { orgId, key, value } = request.body as any;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canEditOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });

    const def = await prisma.variableDefinition.findUnique({ where: { key } });
    if (!def) return reply.code(404).send({ error: `Unknown variable key: ${key}` });

    await prisma.organizationVariable.upsert({
      where: {
        organizationId_definitionId: { organizationId: orgId, definitionId: def.id },
      },
      update: { value: String(value ?? '') },
      create: { organizationId: orgId, definitionId: def.id, value: String(value ?? '') },
    });
    await prisma.organization.update({
      where: { id: orgId },
      data: { serial: { increment: 1 } },
    });
    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        orgId,
        categoria: 'variables',
        acao: 'set',
        alvo: `${org.sigla}:${key}`,
      },
    });
    return { success: true };
  });

  app.delete('/api/variables/:orgId/:key', async (request: any, reply) => {
    const { orgId, key } = request.params as any;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canEditOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });
    const def = await prisma.variableDefinition.findUnique({ where: { key } });
    if (!def) return reply.code(404).send({ error: 'Unknown key' });
    if (def.required)
      return reply.code(400).send({ error: 'Cannot delete required variable; clear value instead' });

    await prisma.organizationVariable.delete({
      where: {
        organizationId_definitionId: { organizationId: orgId, definitionId: def.id },
      },
    });
    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        orgId,
        categoria: 'variables',
        acao: 'delete',
        alvo: `${org.sigla}:${key}`,
      },
    });
    return { success: true };
  });

  // ==========================================================================
  // SCRIPTS
  // ==========================================================================
  app.get('/api/scripts', async () => {
    return prisma.script.findMany({ orderBy: [{ oficial: 'desc' }, { nome: 'asc' }] });
  });

  app.get('/api/scripts/:id', async (request: any, reply) => {
    const script = await prisma.script.findUnique({ where: { id: request.params.id } });
    if (!script) return reply.code(404).send({ error: 'Not found' });
    return script;
  });

  app.post('/api/scripts', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles) && !hasRole(request.user.roles, 'operador_om'))
      return reply.code(403).send({ error: 'Forbidden' });
    const script = await prisma.script.create({
      data: { ...(request.body as any), status: 'rascunho' },
    });
    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        categoria: 'scripts',
        acao: 'create',
        alvo: script.nome,
      },
    });
    return script;
  });

  app.patch('/api/scripts/:id', async (request: any, reply) => {
    const script = await prisma.script.findUnique({ where: { id: request.params.id } });
    if (!script) return reply.code(404).send({ error: 'Not found' });
    if (script.oficial)
      return reply.code(403).send({ error: 'Oficial scripts cannot be modified' });
    const updated = await prisma.script.update({
      where: { id: request.params.id },
      data: { ...(request.body as any), atualizadoEm: new Date() },
    });
    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        categoria: 'scripts',
        acao: 'update',
        alvo: script.nome,
      },
    });
    return updated;
  });

  app.delete('/api/scripts/:id', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles)) return reply.code(403).send({ error: 'Forbidden' });
    const script = await prisma.script.findUnique({ where: { id: request.params.id } });
    if (!script) return reply.code(404).send({ error: 'Not found' });
    if (script.oficial) return reply.code(403).send({ error: 'Cannot delete oficial scripts' });
    await prisma.script.delete({ where: { id: request.params.id } });
    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        categoria: 'scripts',
        acao: 'delete',
        alvo: script.nome,
      },
    });
    return { success: true };
  });

  // ==========================================================================
  // BRANDING
  // ==========================================================================
  app.get('/api/branding/:orgId', async (request: any, reply) => {
    const org = await prisma.organization.findUnique({ where: { id: request.params.orgId } });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canAccessOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });
    const branding = await prisma.brandingConfig.findUnique({
      where: { orgId: request.params.orgId },
    });
    return (
      branding || {
        orgId: request.params.orgId,
        wallpaperUrl: null,
        logoUrl: null,
        conkyEnabled: false,
        conkyConfig: {},
        theme: 'Mint-Y-Dark',
      }
    );
  });

  app.post('/api/branding', async (request: any, reply) => {
    const { orgId, ...data } = request.body as any;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canEditOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });
    return prisma.brandingConfig.upsert({
      where: { orgId },
      update: data,
      create: { orgId, ...data } as any,
    });
  });

  // ==========================================================================
  // STATIONS
  // ==========================================================================
  app.get('/api/stations', async (request: any) => {
    const user = request.user;
    const query = request.query as any;
    const where: any = {};
    if (query?.orgId) where.orgId = query.orgId;
    if (!isAdminGap(user.roles) && !hasRole(user.roles, 'auditor')) {
      const siglas = user.roles
        .filter((r: any) => r.role === 'operador_om' && r.orgSigla)
        .map((r: any) => r.orgSigla);
      const orgs = await prisma.organization.findMany({
        where: { sigla: { in: siglas } },
        select: { id: true },
      });
      where.orgId = { in: orgs.map((o: any) => o.id) };
    }
    const stations = await prisma.station.findMany({
      where,
      include: { organization: { select: { sigla: true, nome: true } } },
      orderBy: { hostname: 'asc' },
    });
    return stations.map((s: any) => ({ ...s, serialAplicado: s.serialAplicado.toString() }));
  });

  app.get('/api/stations/:id', async (request: any, reply) => {
    const station = await prisma.station.findUnique({
      where: { id: request.params.id },
      include: { organization: { select: { sigla: true, nome: true } } },
    });
    if (!station) return reply.code(404).send({ error: 'Not found' });
    if (!canAccessOrg(request.user.roles, station.organization.sigla))
      return reply.code(403).send({ error: 'Forbidden' });
    return { ...station, serialAplicado: station.serialAplicado.toString() };
  });

  app.post('/api/stations', async (request: any, reply) => {
    const data = request.body as any;
    const org = await prisma.organization.findUnique({ where: { id: data.orgId } });
    if (!org) return reply.code(404).send({ error: 'Not found' });
    if (!canEditOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });
    const station = await prisma.station.create({ data });
    await prisma.organization.update({
      where: { id: data.orgId },
      data: { estacoes: { increment: 1 } },
    });
    return station;
  });

  app.patch('/api/stations/:id', async (request: any, reply) => {
    const station = await prisma.station.findUnique({
      where: { id: request.params.id },
      include: { organization: true },
    });
    if (!station) return reply.code(404).send({ error: 'Not found' });
    if (!canEditOrg(request.user.roles, station.organization.sigla))
      return reply.code(403).send({ error: 'Forbidden' });
    const updated = await prisma.station.update({
      where: { id: request.params.id },
      data: request.body as any,
    });
    return { ...updated, serialAplicado: updated.serialAplicado.toString() };
  });

  app.delete('/api/stations/:id', async (request: any, reply) => {
    const station = await prisma.station.findUnique({
      where: { id: request.params.id },
      include: { organization: true },
    });
    if (!station) return reply.code(404).send({ error: 'Not found' });
    if (!canEditOrg(request.user.roles, station.organization.sigla))
      return reply.code(403).send({ error: 'Forbidden' });
    await prisma.station.delete({ where: { id: request.params.id } });
    await prisma.organization.update({
      where: { id: station.orgId },
      data: { estacoes: { decrement: 1 } },
    });
    return { success: true };
  });

  // Station tokens
  app.get('/api/stations/:id/tokens', async (request: any, reply) => {
    const station = await prisma.station.findUnique({
      where: { id: request.params.id },
      include: { organization: true },
    });
    if (!station) return reply.code(404).send({ error: 'Not found' });
    if (!canAccessOrg(request.user.roles, station.organization.sigla))
      return reply.code(403).send({ error: 'Forbidden' });
    return prisma.stationToken.findMany({
      where: { stationId: request.params.id, revokedAt: null },
    });
  });

  app.post('/api/stations/:id/tokens', async (request: any, reply) => {
    const station = await prisma.station.findUnique({
      where: { id: request.params.id },
      include: { organization: true },
    });
    if (!station) return reply.code(404).send({ error: 'Not found' });
    if (!canEditOrg(request.user.roles, station.organization.sigla))
      return reply.code(403).send({ error: 'Forbidden' });
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.stationToken.create({
      data: {
        stationId: request.params.id,
        tokenHash,
        label: (request.body as any)?.label || 'agent',
      },
    });
    return { token };
  });

  app.delete('/api/stations/:stationId/tokens/:tokenId', async (request: any) => {
    await prisma.stationToken.update({
      where: { id: request.params.tokenId },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  });

  app.get('/api/stations/:id/runs', async (request: any, reply) => {
    const station = await prisma.station.findUnique({
      where: { id: request.params.id },
      include: { organization: true },
    });
    if (!station) return reply.code(404).send({ error: 'Not found' });
    if (!canAccessOrg(request.user.roles, station.organization.sigla))
      return reply.code(403).send({ error: 'Forbidden' });
    return prisma.stationRun.findMany({
      where: { stationId: request.params.id },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  });

  // Station check-in (public)
  app.post('/api/public/station-checkin', async (request: any, reply) => {
    const { token, hostname, ip, distro, desktop, serial, status, agentVersion } =
      request.body as any;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenRecord = await prisma.stationToken.findUnique({
      where: { tokenHash },
      include: { station: true },
    });
    if (!tokenRecord || tokenRecord.revokedAt) {
      return reply.code(401).send({ error: 'Invalid or revoked token' });
    }
    const station = tokenRecord.station;

    await prisma.station.update({
      where: { id: station.id },
      data: {
        hostname: hostname || station.hostname,
        ip: ip || station.ip,
        distro: distro || station.distro,
        desktop: desktop || station.desktop,
        serialAplicado: BigInt(serial || 0),
        ultimoCheckin: new Date(),
        status: status || 'ok',
      },
    });
    await prisma.stationToken.update({
      where: { id: tokenRecord.id },
      data: { lastUsedAt: new Date() },
    });
    if (serial && BigInt(serial) > station.serialAplicado) {
      await prisma.stationRun.create({
        data: {
          stationId: station.id,
          serialAlvo: BigInt(serial),
          serialAnterior: station.serialAplicado,
          status: 'ok',
          agentVersion,
        },
      });
    }
    return { success: true, stationId: station.id };
  });

  // ==========================================================================
  // AUDIT
  // ==========================================================================
  app.get('/api/audit', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles) && !hasRole(request.user.roles, 'auditor'))
      return reply.code(403).send({ error: 'Forbidden' });
    const events = await prisma.auditEvent.findMany({ take: 200, orderBy: { ts: 'desc' } });
    return { events, total: events.length };
  });

  // ==========================================================================
  // PROFILES
  // ==========================================================================
  app.get('/api/profiles', async (request: any) => {
    const query = request.query as any;
    const where: any = { OR: [{ publico: true }] };
    if (query?.orgId) {
      const org = await prisma.organization.findUnique({ where: { id: query.orgId } });
      if (org) where.OR.push({ organizacaoOrigem: org.sigla });
    }
    return prisma.seederProfile.findMany({ where, orderBy: { nome: 'asc' } });
  });

  app.get('/api/profiles/:id', async (request: any, reply) => {
    const profile = await prisma.seederProfile.findUnique({ where: { id: request.params.id } });
    if (!profile) return reply.code(404).send({ error: 'Not found' });
    return profile;
  });

  app.post('/api/profiles', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles) && !hasRole(request.user.roles, 'operador_om'))
      return reply.code(403).send({ error: 'Forbidden' });
    return prisma.seederProfile.create({ data: request.body as any });
  });

  app.patch('/api/profiles/:id', async (request: any, reply) => {
    const profile = await prisma.seederProfile.findUnique({ where: { id: request.params.id } });
    if (!profile) return reply.code(404).send({ error: 'Not found' });
    return prisma.seederProfile.update({
      where: { id: request.params.id },
      data: request.body as any,
    });
  });

  app.delete('/api/profiles/:id', async (request: any, reply) => {
    const profile = await prisma.seederProfile.findUnique({ where: { id: request.params.id } });
    if (!profile) return reply.code(404).send({ error: 'Not found' });
    await prisma.seederProfile.delete({ where: { id: request.params.id } });
    return { success: true };
  });

  // ==========================================================================
  // PROVISIONING (gera scripts + .conf renderizados)
  // ==========================================================================
  app.post('/api/provisioning/preview', async (request: any, reply) => {
    const { orgId, scriptIds, profileId } = request.body as any;
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { variables: { include: { definition: true } } },
    });
    if (!org) return reply.code(404).send({ error: 'Organization not found' });
    if (!canAccessOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });

    let scripts = await prisma.script.findMany({ where: { status: 'pronto' } });
    if (profileId) {
      const profile = await prisma.seederProfile.findUnique({ where: { id: profileId } });
      if (profile?.scriptIds?.length) {
        scripts = scripts.filter((s) => profile.scriptIds.includes(s.id));
      }
    } else if (scriptIds?.length) {
      scripts = scripts.filter((s: any) => scriptIds.includes(s.id));
    }

    const varMap: Record<string, string> = {};
    for (const v of org.variables) varMap[v.definition.key] = v.value || '';

    const preview = scripts.map((s) => ({
      id: s.id,
      nome: s.nome,
      conteudo: s.conteudo.replace(/\{\{\s*([A-Z][A-Z0-9_]+)\s*\}\}/g, (_, key) =>
        varMap[key] !== undefined ? varMap[key] : `{{${key}}}`
      ),
    }));

    return { org: { id: org.id, sigla: org.sigla, nome: org.nome, serial: org.serial }, scripts: preview, variables: varMap };
  });

  app.post('/api/provisioning/generate', async (request: any, reply) => {
    const { orgId, scriptIds, profileId } = request.body as any;
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { variables: { include: { definition: true } } },
    });
    if (!org) return reply.code(404).send({ error: 'Organization not found' });
    if (!canAccessOrg(request.user.roles, org.sigla))
      return reply.code(403).send({ error: 'Forbidden' });

    let scripts = await prisma.script.findMany({ where: { status: 'pronto' } });
    if (profileId) {
      const profile = await prisma.seederProfile.findUnique({ where: { id: profileId } });
      if (profile?.scriptIds?.length) {
        scripts = scripts.filter((s) => profile.scriptIds.includes(s.id));
      }
    } else if (scriptIds?.length) {
      scripts = scripts.filter((s: any) => scriptIds.includes(s.id));
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { serial: { increment: 1 } },
    });

    const varMap: Record<string, string> = {};
    for (const v of org.variables) varMap[v.definition.key] = v.value || '';

    const processedScripts = scripts.map((s) => ({
      ...s,
      conteudo: s.conteudo.replace(/\{\{\s*([A-Z][A-Z0-9_]+)\s*\}\}/g, (_, key) =>
        varMap[key] !== undefined ? varMap[key] : `{{${key}}}`
      ),
    }));

    const confLines = [
      `# SeederLinux Configuration for ${org.sigla}`,
      `# Generated: ${new Date().toISOString()}`,
      `# Serial: ${updated.serial}`,
      '',
      `export ORG="${org.sigla.toLowerCase()}"`,
      `export SERIAL="${updated.serial}"`,
      '',
    ];
    for (const v of org.variables) {
      confLines.push(`export ${v.definition.key}="${v.value || ''}"`);
    }

    await prisma.auditEvent.create({
      data: {
        atorId: request.user.userId,
        atorEmail: request.user.email,
        orgId,
        categoria: 'provisioning',
        acao: 'generate',
        alvo: org.sigla,
        detalhes: `serial=${updated.serial}, scripts=${scripts.length}`,
      },
    });

    return {
      serial: updated.serial.toString(),
      scripts: processedScripts,
      config: confLines.join('\n'),
    };
  });

  // ==========================================================================
  // TLS ADMIN ENDPOINTS (Documento 15 v3.1)
  // ==========================================================================

  /** Status do TLS atual (admin_gap apenas). */
  app.get('/api/admin/tls', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles)) return reply.code(403).send({ error: 'Forbidden' });
    const active = await getActiveTls(prisma);
    if (!active) {
      return { success: true, data: { active: false, mode: null } };
    }
    return {
      success: true,
      data: {
        active: true,
        mode: active.mode,
        hostname: active.hostname,
        sans: active.sans,
        fingerprint: active.fingerprint,
        serial: active.serial,
        expiresAt: active.expiresAt,
        hasCa: !!active.ca,
      },
    };
  });

  /** Baixa o CA público (PEM) para distribuir às estações.
   *  Endpoint público — apenas o CA, não a chave privada do CA. */
  app.get('/api/public/tls/ca.crt', async (_request, reply) => {
    const active = await getActiveTls(prisma);
    if (!active?.ca) {
      return reply.code(404).send({ error: 'No CA configured (PKI mode or no TLS)' });
    }
    reply.header('Content-Type', 'application/x-x509-ca-cert');
    reply.header('Content-Disposition', 'attachment; filename="seederlinux-ca.crt"');
    return active.ca;
  });

  /** Rotaciona o certificado (gera novo bundle e desativa o anterior). */
  app.post('/api/admin/tls/rotate', async (request: any, reply) => {
    if (!isAdminGap(request.user.roles)) return reply.code(403).send({ error: 'Forbidden' });
    const { mode, hostname, sans, cert, key, ca } = (request.body as any) || {};

    try {
      const newBundle = await configureTlsFromSetup(prisma, {
        mode: (mode || 'SELF_SIGNED') as TlsMode,
        hostname,
        sans,
        cert,
        key,
        ca,
      });
      await prisma.auditEvent.create({
        data: {
          atorId: request.user.userId,
          atorEmail: request.user.email,
          categoria: 'tls',
          acao: 'rotate',
          alvo: newBundle.hostname,
          detalhes: `mode=${mode}, fingerprint=${newBundle.fingerprint}`,
        },
      });
      return {
        success: true,
        data: {
          mode,
          hostname: newBundle.hostname,
          fingerprint: newBundle.fingerprint,
          expiresAt: newBundle.expiresAt,
          restartRequired: true,
        },
      };
    } catch (err: any) {
      return reply.code(400).send({ success: false, message: err.message });
    }
  });

  // ==========================================================================
  // Graceful shutdown
  // ==========================================================================
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    await app.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    await app.close();
    process.exit(0);
  });

  return app;
}

async function start() {
  const port = parseInt(process.env.PORT || '8000', 10);
  const tlsDisabled = process.env.TLS_DISABLED === 'true';

  // Bootstrap TLS: tenta carregar bundle ativo do banco
  let httpsOptions: { cert: string; key: string } | undefined;
  if (!tlsDisabled) {
    try {
      const bundle = await bootstrapTls(prisma);
      if (bundle) {
        httpsOptions = { cert: bundle.cert, key: bundle.key };
        console.log(`🔒 TLS active (mode=${bundle.mode}) — HTTPS enabled`);
      } else {
        console.log('⚠️  No active TLS configuration found — running HTTP (setup mode)');
        console.log('    Run Setup Wizard to provision certificates.');
      }
    } catch (err) {
      console.warn('[tls] Bootstrap failed (DB unreachable?):', (err as Error).message);
    }
  } else {
    console.log('⚠️  TLS_DISABLED=true — running HTTP (dev/test only, NOT for production)');
  }

  const app = await buildServer(httpsOptions);
  try {
    await app.listen({ port, host: '0.0.0.0' });
    const proto = httpsOptions ? 'https' : 'http';
    console.log(`🚀 SeederLinux API v3.0 running on ${proto}://0.0.0.0:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

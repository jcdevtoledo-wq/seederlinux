import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import JSZip from 'jszip';
import crypto from 'crypto';

const generateBundleSchema = z.object({
  orgId: z.string(),
  stationId: z.string().optional(),
  profileId: z.string().optional(),
  scriptIds: z.array(z.string()).optional(),
});

function isAdminGap(roles: any[]) {
  return roles.some((r: any) => r.role === 'admin_gap');
}

// Extract variables from script content
function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const vars: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!vars.includes(match[1])) {
      vars.push(match[1]);
    }
  }
  return vars;
}

// Replace variables in content
function replaceVariables(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] || `{{${key}}}`;
  });
}

export default async function provisioningRoutes(app: FastifyInstance) {
  // Preview bundle (dry-run)
  app.post('/preview', async (request, reply) => {
    const user = (request as any).user;
    const body = generateBundleSchema.parse(request.body);

    const org = await app.prisma.organization.findUnique({
      where: { id: body.orgId },
      include: { variables: true },
    });
    if (!org) {
      return reply.code(404).send({ error: 'Organization not found' });
    }

    // Check permission
    const isAdmin = isAdminGap(user.roles);
    const isOperador = user.roles.some(
      (r: any) => r.role === 'operador_om' && r.orgSigla === org.sigla
    );

    if (!isAdmin && !isOperador) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Build variables map
    const varsMap: Record<string, string> = {
      ORGANIZACAO: org.sigla,
      DOMINIO: org.dominio,
      DC_HOSTNAME: org.dcHostname,
      DC_IP: org.dcIp,
    };
    org.variables.forEach(v => {
      varsMap[v.key] = v.value;
    });

    // Get scripts
    let scripts: any[] = [];
    if (body.profileId) {
      const profile = await app.prisma.seederProfile.findUnique({
        where: { id: body.profileId },
      });
      if (profile) {
        scripts = await app.prisma.script.findMany({
          where: { id: { in: profile.scriptIds } },
        });
      }
    } else if (body.scriptIds) {
      scripts = await app.prisma.script.findMany({
        where: { id: { in: body.scriptIds } },
      });
    }

    // Preview scripts with replaced variables
    const preview = scripts.map(s => ({
      id: s.id,
      nome: s.nome,
      categoria: s.categoria,
      variaveisUsadas: s.variaveisUsadas,
      conteudoOriginal: s.conteudo.substring(0, 200) + '...',
      conteudoProcessado: replaceVariables(s.conteudo, varsMap).substring(0, 200) + '...',
    }));

    return {
      org: { sigla: org.sigla, nome: org.nome, serial: org.serial.toString() },
      scripts: preview,
      variaveis: varsMap,
    };
  });

  // Generate bundle (ZIP)
  app.post('/generate', async (request, reply) => {
    const user = (request as any).user;
    const body = generateBundleSchema.parse(request.body);

    const org = await app.prisma.organization.findUnique({
      where: { id: body.orgId },
      include: { variables: true, branding: true },
    });
    if (!org) {
      return reply.code(404).send({ error: 'Organization not found' });
    }

    // Check permission
    const isAdmin = isAdminGap(user.roles);
    const isOperador = user.roles.some(
      (r: any) => r.role === 'operador_om' && r.orgSigla === org.sigla
    );

    if (!isAdmin && !isOperador) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Get station if provided
    let station = null;
    if (body.stationId) {
      station = await app.prisma.station.findUnique({
        where: { id: body.stationId },
      });
    }

    // Get scripts
    let scripts: any[] = [];
    if (body.profileId) {
      const profile = await app.prisma.seederProfile.findUnique({
        where: { id: body.profileId },
      });
      if (profile) {
        scripts = await app.prisma.script.findMany({
          where: { id: { in: profile.scriptIds }, status: 'pronto' },
        });
      }
    } else if (body.scriptIds) {
      scripts = await app.prisma.script.findMany({
        where: { id: { in: body.scriptIds }, status: 'pronto' },
      });
    }

    // Filter by distro compatibility
    if (station?.distro) {
      scripts = scripts.filter(s =>
        s.compatibilidade.length === 0 || s.compatibilidade.includes(station!.distro)
      );
    }

    // Build variables map
    const varsMap: Record<string, string> = {
      ORGANIZACAO: org.sigla,
      ORG_SIGLA: org.sigla,
      ORG_NOME: org.nome,
      DOMINIO: org.dominio,
      DC_HOSTNAME: org.dcHostname,
      DC_IP: org.dcIp,
      SERIAL: org.serial.toString(),
    };
    if (station) {
      varsMap.HOSTNAME = station.hostname;
      varsMap.STATION_ID = station.id;
      varsMap.IP = station.ip;
    }
    org.variables.forEach(v => {
      varsMap[v.key] = v.value;
    });

    // Create ZIP
    const zip = new JSZip();
    const folderName = `${org.sigla.toLowerCase()}_v${org.serial}`;

    // Generate config file (bash-sourceable)
    const configContent = Object.entries(varsMap)
      .map(([k, v]) => `${k}="${v}"`)
      .join('\n');
    zip.folder(folderName)?.folder('etc')?.file(`${org.sigla.toLowerCase()}.conf`, configContent);

    // Add scripts
    const binFolder = zip.folder(folderName)?.folder('bin');
    const libFolder = zip.folder(folderName)?.folder('lib');
    const userFolder = zip.folder(folderName)?.folder('user');

    const manifest: any = {
      version: '2.0',
      org: org.sigla,
      serial: org.serial.toString(),
      generated: new Date().toISOString(),
      scripts: [],
      checksums: {},
    };

    scripts.forEach(script => {
      const processedContent = replaceVariables(script.conteudo, varsMap);
      const filename = `${script.id}.sh`;
      const hash = crypto.createHash('sha256').update(processedContent).digest('hex');

      // Determine folder based on category
      let targetFolder: any;
      if (['core', 'sistema'].includes(script.categoria)) {
        targetFolder = binFolder;
      } else if (script.categoria === 'usuario' || script.categoria === 'desktop') {
        targetFolder = userFolder;
      } else {
        targetFolder = libFolder;
      }

      targetFolder!.file(filename, processedContent);

      manifest.scripts.push({
        id: script.id,
        nome: script.nome,
        categoria: script.categoria,
        versao: script.versao,
      });
      manifest.checksums[filename] = hash;
    });

    // Add profile if provided
    if (body.profileId) {
      manifest.profile = body.profileId;
    }

    // Add branding
    if (org.branding) {
      manifest.branding = {
        wallpaper: org.branding.wallpaperUrl,
        logo: org.branding.logoUrl,
        theme: org.branding.theme,
        conky: org.branding.conkyEnabled,
      };
    }

    zip.folder(folderName)?.file('manifest.json', JSON.stringify(manifest, null, 2));

    // Add README
    const readme = `# SeederLinux - ${org.sigla}

Pacote gerado em: ${new Date().toISOString()}
Serial: ${org.serial}
Scripts: ${scripts.length}

Uso:
  source etc/${org.sigla.toLowerCase()}.conf
  bash bin/*.sh
`;
    zip.folder(folderName)?.file('README.md', readme);

    // Generate zip
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Audit
    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'provisioning',
        acao: 'generate_bundle',
        alvo: org.sigla,
        detalhes: `scripts: ${scripts.length}, serial: ${org.serial.toString()}`,
      },
    });

    // Increment org serial
    await app.prisma.organization.update({
      where: { id: org.id },
      data: { serial: { increment: 1 } },
    });

    return reply
      .header('Content-Type', 'application/zip')
      .header('Content-Disposition', `attachment; filename="${folderName}.zip"`)
      .send(zipBuffer);
  });

  // Get profiles list
  app.get('/profiles', async (request, reply) => {
    const user = (request as any).user;
    const query = request.query as { orgId?: string };

    const where: any = { OR: [{ publico: true }] };

    if (query.orgId) {
      const org = await app.prisma.organization.findUnique({ where: { id: query.orgId } });
      if (org) {
        where.OR.push({ organizacaoOrigem: org.sigla });
      }
    }

    const profiles = await app.prisma.seederProfile.findMany({
      where,
      orderBy: { nome: 'asc' },
    });

    return profiles;
  });

  // Create profile
  app.post('/profiles', async (request, reply) => {
    const user = (request as any).user;

    const body = z.object({
      nome: z.string().min(1),
      descricao: z.string().optional(),
      scriptIds: z.array(z.string()),
      publico: z.boolean().optional(),
      organizacaoOrigem: z.string().optional(),
    }).parse(request.body);

    // Check permission
    const isAdmin = isAdminGap(user.roles);
    let orgSigla = body.organizacaoOrigem;

    if (!isAdmin && orgSigla) {
      const isOperador = user.roles.some(
        (r: any) => r.role === 'operador_om' && r.orgSigla === orgSigla
      );
      if (!isOperador) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
    }

    const profile = await app.prisma.seederProfile.create({
      data: {
        nome: body.nome,
        descricao: body.descricao || '',
        scriptIds: body.scriptIds,
        publico: body.publico || false,
        organizacaoOrigem: orgSigla,
      },
    });

    return profile;
  });
}

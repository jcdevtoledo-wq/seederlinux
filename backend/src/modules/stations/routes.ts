import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const createStationSchema = z.object({
  hostname: z.string().min(1),
  orgId: z.string(),
  ip: z.string().optional(),
  distro: z.string().optional(),
  desktop: z.string().optional(),
  perfilAtivo: z.string().optional(),
  usuario: z.string().optional(),
});

const updateStationSchema = z.object({
  hostname: z.string().min(1).optional(),
  ip: z.string().optional(),
  distro: z.string().optional(),
  desktop: z.string().optional(),
  perfilAtivo: z.string().optional().nullable(),
  usuario: z.string().optional(),
});

const checkinSchema = z.object({
  stationId: z.string(),
  token: z.string(),
  distro: z.string().optional(),
  desktop: z.string().optional(),
  ip: z.string().optional(),
  hostname: z.string().optional(),
  usuario: z.string().optional(),
  serialAplicado: z.union([z.number(), z.string()]).transform(v => BigInt(v)).optional(),
});

function isAdminGap(roles: any[]) {
  return roles.some((r: any) => r.role === 'admin_gap');
}

export default async function stationsRoutes(app: FastifyInstance) {
  // List stations
  app.get('/', async (request, reply) => {
    const user = (request as any).user;
    const query = request.query as { orgId?: string };

    const isAdmin = isAdminGap(user.roles);
    const isAuditor = user.roles.some((r: any) => r.role === 'auditor');

    let where: any = {};
    if (query.orgId) {
      where.orgId = query.orgId;
    }

    // Operador only sees their org's stations
    if (!isAdmin && !isAuditor) {
      const siglas = user.roles
        .filter((r: any) => r.role === 'operador_om' && r.orgSigla)
        .map((r: any) => r.orgSigla);

      const orgs = await app.prisma.organization.findMany({
        where: { sigla: { in: siglas } },
        select: { id: true },
      });

      where.orgId = { in: orgs.map(o => o.id) };
    }

    const stations = await app.prisma.station.findMany({
      where,
      include: { organization: { select: { sigla: true, nome: true } } },
      orderBy: { hostname: 'asc' },
    });

    return stations.map(s => ({
      ...s,
      serialAplicado: s.serialAplicado.toString(),
    }));
  });

  // Get single station
  app.get('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const station = await app.prisma.station.findUnique({
      where: { id },
      include: {
        organization: true,
        tokens: { where: { revokedAt: null } },
        runs: { take: 10, orderBy: { startedAt: 'desc' } },
      },
    });

    if (!station) {
      return reply.code(404).send({ error: 'Station not found' });
    }

    // Check access
    const isAdmin = isAdminGap(user.roles);
    const isAuditor = user.roles.some((r: any) => r.role === 'auditor');
    const isOperador = user.roles.some(
      (r: any) => r.role === 'operador_om' && r.orgSigla === station.organization.sigla
    );

    if (!isAdmin && !isAuditor && !isOperador) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    return {
      ...station,
      serialAplicado: station.serialAplicado.toString(),
    };
  });

  // Create station (admin or operador)
  app.post('/', async (request, reply) => {
    const user = (request as any).user;
    const body = createStationSchema.parse(request.body);

    const org = await app.prisma.organization.findUnique({ where: { id: body.orgId } });
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

    const station = await app.prisma.station.create({
      data: {
        hostname: body.hostname,
        orgId: body.orgId,
        ip: body.ip || '',
        distro: body.distro || 'ubuntu',
        desktop: body.desktop || 'GNOME',
        perfilAtivo: body.perfilAtivo,
        usuario: body.usuario,
      },
    });

    // Update org estacoes count
    await app.prisma.organization.update({
      where: { id: body.orgId },
      data: { estacoes: { increment: 1 } },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'stations',
        acao: 'create',
        alvo: station.id,
        detalhes: `hostname: ${body.hostname}, org: ${org.sigla}`,
      },
    });

    return { ...station, serialAplicado: station.serialAplicado.toString() };
  });

  // Update station
  app.patch('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const body = updateStationSchema.parse(request.body);

    const station = await app.prisma.station.findUnique({
      where: { id },
      include: { organization: true },
    });
    if (!station) {
      return reply.code(404).send({ error: 'Station not found' });
    }

    // Check permission
    const isAdmin = isAdminGap(user.roles);
    const isOperador = user.roles.some(
      (r: any) => r.role === 'operador_om' && r.orgSigla === station.organization.sigla
    );

    if (!isAdmin && !isOperador) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const updated = await app.prisma.station.update({
      where: { id },
      data: body,
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'stations',
        acao: 'update',
        alvo: id,
        detalhes: JSON.stringify(body),
      },
    });

    return { ...updated, serialAplicado: updated.serialAplicado.toString() };
  });

  // Delete station (admin only)
  app.delete('/:id', async (request, reply) => {
    const user = (request as any).user;
    if (!isAdminGap(user.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    const station = await app.prisma.station.findUnique({ where: { id } });
    if (!station) {
      return reply.code(404).send({ error: 'Station not found' });
    }

    await app.prisma.station.delete({ where: { id } });

    // Update org estacoes count
    await app.prisma.organization.update({
      where: { id: station.orgId },
      data: { estacoes: { decrement: 1 } },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'stations',
        acao: 'delete',
        alvo: id,
      },
    });

    return { success: true };
  });

  // ===== STATION CHECKIN (Public API for agents) =====

  app.post('/checkin', async (request, reply) => {
    const body = checkinSchema.parse(request.body);

    // Validate token
    const tokenHash = await bcrypt.hash(body.token, 10);
    const token = await app.prisma.stationToken.findFirst({
      where: {
        stationId: body.stationId,
        revokedAt: null,
      },
    });

    if (!token) {
      return reply.code(401).send({ error: 'Invalid station or token' });
    }

    // Compare token hash
    const validToken = await bcrypt.compare(body.token, token.tokenHash);
    if (!validToken) {
      return reply.code(401).send({ error: 'Invalid token' });
    }

    // Get station and org
    const station = await app.prisma.station.findUnique({
      where: { id: body.stationId },
      include: { organization: true },
    });

    if (!station) {
      return reply.code(404).send({ error: 'Station not found' });
    }

    // Check if update needed
    const orgSerial = station.organization.serial;
    const stationSerial = body.serialAplicado || station.serialAplicado;
    const needsUpdate = orgSerial > stationSerial;

    // Update station
    const updated = await app.prisma.station.update({
      where: { id: body.stationId },
      data: {
        distro: body.distro,
        desktop: body.desktop,
        ip: body.ip,
        hostname: body.hostname,
        usuario: body.usuario,
        serialAplicado: body.serialAplicado,
        ultimoCheckin: new Date(),
        status: needsUpdate ? 'atrasada' : 'ok',
      },
    });

    // Update token last used
    await app.prisma.stationToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      status: 'ok',
      needsUpdate,
      serialOrg: orgSerial.toString(),
      serialStation: stationSerial.toString(),
    };
  });

  // Generate station token (admin or operador)
  app.post('/:id/tokens', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const body = z.object({ label: z.string().optional() }).parse(request.body);

    const station = await app.prisma.station.findUnique({
      where: { id },
      include: { organization: true },
    });
    if (!station) {
      return reply.code(404).send({ error: 'Station not found' });
    }

    // Check permission
    const isAdmin = isAdminGap(user.roles);
    const isOperador = user.roles.some(
      (r: any) => r.role === 'operador_om' && r.orgSigla === station.organization.sigla
    );

    if (!isAdmin && !isOperador) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Generate random token
    const crypto = await import('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);

    const tokenRecord = await app.prisma.stationToken.create({
      data: {
        stationId: id,
        tokenHash,
        label: body.label || 'agente',
      },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'stations',
        acao: 'create_token',
        alvo: id,
      },
    });

    // Return RAW token (only time it's shown)
    return {
      id: tokenRecord.id,
      label: tokenRecord.label,
      token: rawToken,
    };
  });

  // Revoke station token
  app.delete('/:id/tokens/:tokenId', async (request, reply) => {
    const user = (request as any).user;
    const { id, tokenId } = request.params as { id: string; tokenId: string };

    const station = await app.prisma.station.findUnique({
      where: { id },
      include: { organization: true },
    });
    if (!station) {
      return reply.code(404).send({ error: 'Station not found' });
    }

    // Check permission
    const isAdmin = isAdminGap(user.roles);
    const isOperador = user.roles.some(
      (r: any) => r.role === 'operador_om' && r.orgSigla === station.organization.sigla
    );

    if (!isAdmin && !isOperador) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    await app.prisma.stationToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  });

  // Station runs (recent)
  app.get('/:id/runs', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: string };

    const station = await app.prisma.station.findUnique({
      where: { id },
      include: { organization: true },
    });
    if (!station) {
      return reply.code(404).send({ error: 'Station not found' });
    }

    // Check access
    const isAdmin = isAdminGap(user.roles);
    const isAuditor = user.roles.some((r: any) => r.role === 'auditor');
    const isOperador = user.roles.some(
      (r: any) => r.role === 'operador_om' && r.orgSigla === station.organization.sigla
    );

    if (!isAdmin && !isAuditor && !isOperador) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const runs = await app.prisma.stationRun.findMany({
      where: { stationId: id },
      take: parseInt(query.limit || '20', 10),
      orderBy: { startedAt: 'desc' },
    });

    return runs.map(r => ({
      ...r,
      serialAlvo: r.serialAlvo.toString(),
      serialAnterior: r.serialAnterior.toString(),
    }));
  });
}

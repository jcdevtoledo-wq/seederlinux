import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const createOrgSchema = z.object({
  nome: z.string().min(1),
  sigla: z.string().min(2).max(10),
  dominio: z.string().optional(),
  dcHostname: z.string().optional(),
  dcIp: z.string().optional(),
  metodoAd: z.enum(['sssd', 'winbind', 'auto']).optional(),
  distrosSuportadas: z.array(z.string()).optional(),
  ambientesSuportados: z.array(z.string()).optional(),
  cor: z.string().optional(),
});

const updateOrgSchema = z.object({
  nome: z.string().min(1).optional(),
  dominio: z.string().optional(),
  dcHostname: z.string().optional(),
  dcIp: z.string().optional(),
  metodoAd: z.enum(['sssd', 'winbind', 'auto']).optional(),
  distrosSuportadas: z.array(z.string()).optional(),
  ambientesSuportados: z.array(z.string()).optional(),
  cor: z.string().optional(),
});

function isAdminGap(roles: any[]) {
  return roles.some((r: any) => r.role === 'admin_gap');
}

export default async function organizationsRoutes(app: FastifyInstance) {
  // List organizations
  app.get('/', async (request, reply) => {
    const user = (request as any).user;
    const isAdmin = isAdminGap(user.roles);

    let orgs;
    if (isAdmin || user.roles.some((r: any) => r.role === 'auditor')) {
      orgs = await app.prisma.organization.findMany({
        orderBy: { sigla: 'asc' },
      });
    } else {
      // Operador OM sees only their orgs
      const siglas = user.roles
        .filter((r: any) => r.role === 'operador_om' && r.orgSigla)
        .map((r: any) => r.orgSigla);
      orgs = await app.prisma.organization.findMany({
        where: { sigla: { in: siglas } },
        orderBy: { sigla: 'asc' },
      });
    }

    return orgs;
  });

  // Get single organization
  app.get('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const org = await app.prisma.organization.findUnique({
      where: { id },
      include: { variables: true, branding: true },
    });

    if (!org) {
      return reply.code(404).send({ error: 'Organization not found' });
    }

    // Check access
    const isAdmin = isAdminGap(user.roles);
    const isAuditor = user.roles.some((r: any) => r.role === 'auditor');
    const isOperador = user.roles.some(
      (r: any) => r.role === 'operador_om' && r.orgSigla === org.sigla
    );

    if (!isAdmin && !isAuditor && !isOperador) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    return org;
  });

  // Create organization (admin_gap only)
  app.post('/', async (request, reply) => {
    const user = (request as any).user;
    if (!isAdminGap(user.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const body = createOrgSchema.parse(request.body);

    const existing = await app.prisma.organization.findUnique({
      where: { sigla: body.sigla.toUpperCase() },
    });

    if (existing) {
      return reply.code(400).send({ error: 'Sigla already exists' });
    }

    const org = await app.prisma.organization.create({
      data: {
        nome: body.nome,
        sigla: body.sigla.toUpperCase(),
        dominio: body.dominio || '',
        dcHostname: body.dcHostname || '',
        dcIp: body.dcIp || '',
        metodoAd: body.metodoAd || 'auto',
        distrosSuportadas: body.distrosSuportadas || ['ubuntu', 'linuxmint', 'debian'],
        ambientesSuportados: body.ambientesSuportados || ['GNOME', 'Cinnamon', 'XFCE'],
        cor: body.cor || 'oklch(0.6 0.15 200)',
      },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'organizations',
        acao: 'create',
        alvo: org.sigla,
      },
    });

    return org;
  });

  // Update organization
  app.patch('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const body = updateOrgSchema.parse(request.body);

    const org = await app.prisma.organization.findUnique({ where: { id } });
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

    const updated = await app.prisma.organization.update({
      where: { id },
      data: body,
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'organizations',
        acao: 'update',
        alvo: org.sigla,
        detalhes: JSON.stringify(body),
      },
    });

    return updated;
  });

  // Delete organization (admin_gap only)
  app.delete('/:id', async (request, reply) => {
    const user = (request as any).user;
    if (!isAdminGap(user.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    const org = await app.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return reply.code(404).send({ error: 'Organization not found' });
    }

    // Check if org has stations
    const stationCount = await app.prisma.station.count({
      where: { orgId: id },
    });

    if (stationCount > 0) {
      return reply.code(400).send({
        error: 'Cannot delete organization with stations',
      });
    }

    await app.prisma.organization.delete({ where: { id } });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'organizations',
        acao: 'delete',
        alvo: org.sigla,
      },
    });

    return { success: true };
  });

  // Increment serial
  app.post('/:id/increment-serial', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const org = await app.prisma.organization.findUnique({ where: { id } });
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

    const updated = await app.prisma.organization.update({
      where: { id },
      data: { serial: { increment: 1 } },
    });

    return { serial: Number(updated.serial) };
  });
}

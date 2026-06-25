import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const upsertBrandingSchema = z.object({
  orgId: z.string(),
  wallpaperUrl: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  conkyEnabled: z.boolean().optional(),
  conkyConfig: z.record(z.any()).optional(),
  theme: z.string().optional(),
});

function isAdminGap(roles: any[]) {
  return roles.some((r: any) => r.role === 'admin_gap');
}

export default async function brandingRoutes(app: FastifyInstance) {
  // Get branding for organization
  app.get('/:orgId', async (request, reply) => {
    const user = (request as any).user;
    const { orgId } = request.params as { orgId: string };

    const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
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

    const branding = await app.prisma.brandingConfig.findUnique({
      where: { orgId },
    });

    return branding || { orgId, wallpaperUrl: null, logoUrl: null, conkyEnabled: false, conkyConfig: {}, theme: 'Mint-Y-Dark' };
  });

  // Upsert branding
  app.post('/', async (request, reply) => {
    const user = (request as any).user;
    const body = upsertBrandingSchema.parse(request.body);

    const org = await app.prisma.organization.findUnique({
      where: { id: body.orgId },
    });
    if (!org) {
      return reply.code(404).send({ error: 'Organization not found' });
    }

    // Check permission (admin or operador for this org)
    const isAdmin = isAdminGap(user.roles);
    const isOperador = user.roles.some(
      (r: any) => r.role === 'operador_om' && r.orgSigla === org.sigla
    );

    if (!isAdmin && !isOperador) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const branding = await app.prisma.brandingConfig.upsert({
      where: { orgId: body.orgId },
      update: {
        wallpaperUrl: body.wallpaperUrl,
        logoUrl: body.logoUrl,
        conkyEnabled: body.conkyEnabled,
        conkyConfig: body.conkyConfig || {},
        theme: body.theme,
      },
      create: {
        orgId: body.orgId,
        wallpaperUrl: body.wallpaperUrl,
        logoUrl: body.logoUrl,
        conkyEnabled: body.conkyEnabled || false,
        conkyConfig: body.conkyConfig || {},
        theme: body.theme || 'Mint-Y-Dark',
      },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'branding',
        acao: 'update',
        alvo: org.sigla,
      },
    });

    return branding;
  });

  // Delete branding
  app.delete('/:orgId', async (request, reply) => {
    const user = (request as any).user;
    const { orgId } = request.params as { orgId: string };

    const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
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

    await app.prisma.brandingConfig.delete({ where: { orgId } });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'branding',
        acao: 'delete',
        alvo: org.sigla,
      },
    });

    return { success: true };
  });
}

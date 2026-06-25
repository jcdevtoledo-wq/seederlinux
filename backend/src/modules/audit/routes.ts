import { FastifyInstance } from 'fastify';
import { z } from 'zod';

function isAdminGap(roles: any[]) {
  return roles.some((r: any) => r.role === 'admin_gap');
}

function isAuditor(roles: any[]) {
  return roles.some((r: any) => r.role === 'auditor');
}

export default async function auditRoutes(app: FastifyInstance) {
  // List audit events (admin_gap and auditor)
  app.get('/', async (request, reply) => {
    const user = (request as any).user;
    if (!isAdminGap(user.roles) && !isAuditor(user.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const query = request.query as {
      categoria?: string;
      acao?: string;
      atorId?: string;
      limit?: string;
      offset?: string;
    };

    const where: any = {};
    if (query.categoria) where.categoria = query.categoria;
    if (query.acao) where.acao = query.acao;
    if (query.atorId) where.atorId = query.atorId;

    const limit = parseInt(query.limit || '100', 10);
    const offset = parseInt(query.offset || '0', 10);

    const [events, total] = await Promise.all([
      app.prisma.auditEvent.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { ts: 'desc' },
      }),
      app.prisma.auditEvent.count({ where }),
    ]);

    return { events, total, limit, offset };
  });

  // Get stats
  app.get('/stats', async (request, reply) => {
    const user = (request as any).user;
    if (!isAdminGap(user.roles) && !isAuditor(user.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const query = request.query as { days?: string };
    const days = parseInt(query.days || '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const byCategoria = await app.prisma.$queryRaw`
      SELECT categoria, COUNT(*) as count
      FROM audit_events
      WHERE ts >= ${since}
      GROUP BY categoria
      ORDER BY count DESC
    `;

    const byAcao = await app.prisma.$queryRaw`
      SELECT acao, COUNT(*) as count
      FROM audit_events
      WHERE ts >= ${since}
      GROUP BY acao
      ORDER BY count DESC
      LIMIT 10
    `;

    const byAtor = await app.prisma.$queryRaw`
      SELECT ator_email, COUNT(*) as count
      FROM audit_events
      WHERE ts >= ${since}
      GROUP BY ator_email
      ORDER BY count DESC
      LIMIT 10
    `;

    return { byCategoria, byAcao, byAtor, days };
  });
}

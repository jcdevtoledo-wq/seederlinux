import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const createScriptSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1),
  descricao: z.string().optional(),
  categoria: z.enum(['core', 'sistema', 'rede', 'seguranca', 'usuario', 'desktop', 'automacao', 'custom']).optional(),
  versao: z.string().optional(),
  conteudo: z.string(),
  variaveisUsadas: z.array(z.string()).optional(),
  autor: z.string().optional(),
  compatibilidade: z.array(z.string()).optional(),
  oficial: z.boolean().optional(),
});

const updateScriptSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  categoria: z.enum(['core', 'sistema', 'rede', 'seguranca', 'usuario', 'desktop', 'automacao', 'custom']).optional(),
  versao: z.string().optional(),
  conteudo: z.string().optional(),
  variaveisUsadas: z.array(z.string()).optional(),
  compatibilidade: z.array(z.string()).optional(),
  status: z.enum(['rascunho', 'pronto', 'depreciado']).optional(),
});

function isAdminGap(roles: any[]) {
  return roles.some((r: any) => r.role === 'admin_gap');
}

function isOperador(roles: any[]) {
  return roles.some((r: any) => r.role === 'operador_om');
}

export default async function scriptsRoutes(app: FastifyInstance) {
  // List all scripts
  app.get('/', async (request, reply) => {
    const user = (request as any).user;
    const query = request.query as { oficial?: string; categoria?: string };

    const where: any = {};
    if (query.oficial === 'true') {
      where.oficial = true;
    }
    if (query.categoria) {
      where.categoria = query.categoria;
    }

    const scripts = await app.prisma.script.findMany({
      where,
      orderBy: [{ oficial: 'desc' }, { nome: 'asc' }],
    });

    // Map BigInt serial to number
    return scripts.map(s => ({
      ...s,
      serial: undefined,
    }));
  });

  // Get script by ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const script = await app.prisma.script.findUnique({ where: { id } });
    if (!script) {
      return reply.code(404).send({ error: 'Script not found' });
    }

    return script;
  });

  // Create script (admin or operador)
  app.post('/', async (request, reply) => {
    const user = (request as any).user;
    if (!isAdminGap(user.roles) && !isOperador(user.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const body = createScriptSchema.parse(request.body);

    // Only admin can create oficial scripts
    if (body.oficial && !isAdminGap(user.roles)) {
      return reply.code(403).send({ error: 'Only admin can create oficial scripts' });
    }

    const script = await app.prisma.script.create({
      data: {
        id: body.id,
        nome: body.nome,
        descricao: body.descricao || '',
        categoria: body.categoria || 'custom',
        versao: body.versao || '1.0.0',
        conteudo: body.conteudo,
        variaveisUsadas: body.variaveisUsadas || [],
        autor: body.autor || user.email,
        oficial: body.oficial || false,
        compatibilidade: body.compatibilidade || ['ubuntu', 'linuxmint', 'debian'],
        status: 'rascunho',
      },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'scripts',
        acao: 'create',
        alvo: script.id,
      },
    });

    return script;
  });

  // Update script
  app.patch('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const body = updateScriptSchema.parse(request.body);

    const script = await app.prisma.script.findUnique({ where: { id } });
    if (!script) {
      return reply.code(404).send({ error: 'Script not found' });
    }

    // Oficial scripts cannot be edited (RN-001)
    if (script.oficial) {
      return reply.code(403).send({ error: 'Oficial scripts cannot be modified' });
    }

    // Check permission
    if (!isAdminGap(user.roles) && !isOperador(user.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const updated = await app.prisma.script.update({
      where: { id },
      data: {
        ...body,
        atualizadoEm: new Date(),
      },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'scripts',
        acao: 'update',
        alvo: id,
        detalhes: JSON.stringify(body),
      },
    });

    return updated;
  });

  // Delete script (admin only, and only non-oficial)
  app.delete('/:id', async (request, reply) => {
    const user = (request as any).user;
    if (!isAdminGap(user.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    const script = await app.prisma.script.findUnique({ where: { id } });
    if (!script) {
      return reply.code(404).send({ error: 'Script not found' });
    }

    if (script.oficial) {
      return reply.code(403).send({ error: 'Cannot delete oficial scripts' });
    }

    await app.prisma.script.delete({ where: { id } });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'scripts',
        acao: 'delete',
        alvo: id,
      },
    });

    return { success: true };
  });

  // Set script status (admin only)
  app.post('/:id/status', async (request, reply) => {
    const user = (request as any).user;
    if (!isAdminGap(user.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = z.object({ status: z.enum(['rascunho', 'pronto', 'depreciado']) }).parse(request.body);

    const script = await app.prisma.script.findUnique({ where: { id } });
    if (!script) {
      return reply.code(404).send({ error: 'Script not found' });
    }

    const updated = await app.prisma.script.update({
      where: { id },
      data: { status: body.status },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'scripts',
        acao: 'set_status',
        alvo: id,
        detalhes: `status: ${body.status}`,
      },
    });

    return updated;
  });
}

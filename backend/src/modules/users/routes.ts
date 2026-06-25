import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
  role: z.enum(['admin_gap', 'operador_om', 'auditor']),
  orgSigla: z.string().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  blocked: z.boolean().optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['admin_gap', 'operador_om', 'auditor']),
  orgSigla: z.string().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6),
});

function isAdminGap(roles: any[]) {
  return roles.some((r: any) => r.role === 'admin_gap');
}

export default async function usersRoutes(app: FastifyInstance) {
  // List all users (admin_gap only)
  app.get('/', async (request, reply) => {
    const user = (request as any).user;
    if (!isAdminGap(user.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const users = await app.prisma.user.findMany({
      include: { roles: true },
      orderBy: { email: 'asc' },
    });

    return users.map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      blocked: u.blocked,
      createdAt: u.createdAt,
      roles: u.roles.map(r => ({ id: r.id, role: r.role, orgSigla: r.orgSigla })),
    }));
  });

  // Create user (admin_gap only)
  app.post('/', async (request, reply) => {
    const currentUser = (request as any).user;
    if (!isAdminGap(currentUser.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const body = createUserSchema.parse(request.body);

    // Check if email already exists
    const existing = await app.prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });

    if (existing) {
      return reply.code(400).send({ error: 'Email already registered' });
    }

    // Validate orgSigla for operador_om
    if (body.role === 'operador_om' && !body.orgSigla) {
      return reply.code(400).send({ error: 'orgSigla is required for operador_om role' });
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const newUser = await app.prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        password: hashedPassword,
        displayName: body.displayName,
        roles: {
          create: {
            role: body.role,
            orgSigla: body.orgSigla,
          },
        },
      },
      include: { roles: true },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: currentUser.userId,
        atorEmail: currentUser.email,
        categoria: 'users',
        acao: 'create',
        alvo: newUser.email,
        detalhes: `role: ${body.role}${body.orgSigla ? `, org: ${body.orgSigla}` : ''}`,
      },
    });

    return {
      id: newUser.id,
      email: newUser.email,
      displayName: newUser.displayName,
      blocked: newUser.blocked,
      roles: newUser.roles.map(r => ({ id: r.id, role: r.role, orgSigla: r.orgSigla })),
    };
  });

  // Get single user (admin_gap only)
  app.get('/:id', async (request, reply) => {
    const user = (request as any).user;
    if (!isAdminGap(user.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    const targetUser = await app.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return {
      id: targetUser.id,
      email: targetUser.email,
      displayName: targetUser.displayName,
      blocked: targetUser.blocked,
      createdAt: targetUser.createdAt,
      roles: targetUser.roles.map(r => ({ id: r.id, role: r.role, orgSigla: r.orgSigla })),
    };
  });

  // Update user (admin_gap only)
  app.patch('/:id', async (request, reply) => {
    const currentUser = (request as any).user;
    if (!isAdminGap(currentUser.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = updateUserSchema.parse(request.body);

    const targetUser = await app.prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const updated = await app.prisma.user.update({
      where: { id },
      data: {
        email: body.email?.toLowerCase(),
        displayName: body.displayName,
        blocked: body.blocked,
      },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: currentUser.userId,
        atorEmail: currentUser.email,
        categoria: 'users',
        acao: 'update',
        alvo: updated.email,
        detalhes: JSON.stringify(body),
      },
    });

    return { success: true };
  });

  // Delete user (admin_gap only)
  app.delete('/:id', async (request, reply) => {
    const currentUser = (request as any).user;
    if (!isAdminGap(currentUser.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };

    if (id === currentUser.userId) {
      return reply.code(400).send({ error: 'Cannot delete yourself' });
    }

    const targetUser = await app.prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    await app.prisma.user.delete({ where: { id } });

    await app.prisma.auditEvent.create({
      data: {
        atorId: currentUser.userId,
        atorEmail: currentUser.email,
        categoria: 'users',
        acao: 'delete',
        alvo: targetUser.email,
      },
    });

    return { success: true };
  });

  // Add role to user (admin_gap only)
  app.post('/:id/roles', async (request, reply) => {
    const currentUser = (request as any).user;
    if (!isAdminGap(currentUser.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = updateRoleSchema.parse(request.body);

    const targetUser = await app.prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (body.role === 'operador_om' && !body.orgSigla) {
      return reply.code(400).send({ error: 'orgSigla is required for operador_om' });
    }

    const role = await app.prisma.userRole.create({
      data: {
        userId: id,
        role: body.role,
        orgSigla: body.orgSigla,
      },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: currentUser.userId,
        atorEmail: currentUser.email,
        categoria: 'users',
        acao: 'add_role',
        alvo: targetUser.email,
        detalhes: `role: ${body.role}${body.orgSigla ? `, org: ${body.orgSigla}` : ''}`,
      },
    });

    return { id: role.id, role: role.role, orgSigla: role.orgSigla };
  });

  // Remove role from user (admin_gap only)
  app.delete('/:id/roles/:roleId', async (request, reply) => {
    const currentUser = (request as any).user;
    if (!isAdminGap(currentUser.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { id, roleId } = request.params as { id: string; roleId: string };

    const role = await app.prisma.userRole.findFirst({
      where: { id: roleId, userId: id },
    });

    if (!role) {
      return reply.code(404).send({ error: 'Role not found' });
    }

    await app.prisma.userRole.delete({ where: { id: roleId } });

    await app.prisma.auditEvent.create({
      data: {
        atorId: currentUser.userId,
        atorEmail: currentUser.email,
        categoria: 'users',
        acao: 'remove_role',
        alvo: id,
        detalhes: `role: ${role.role}`,
      },
    });

    return { success: true };
  });

  // Reset password (admin_gap only)
  app.post('/:id/reset-password', async (request, reply) => {
    const currentUser = (request as any).user;
    if (!isAdminGap(currentUser.roles)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { id } = request.params as { id: string };
    const body = resetPasswordSchema.parse(request.body);

    const targetUser = await app.prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    await app.prisma.user.update({
      where: { id },
      data: { password: hashedPassword, blocked: false },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: currentUser.userId,
        atorEmail: currentUser.email,
        categoria: 'users',
        acao: 'reset_password',
        alvo: targetUser.email,
      },
    });

    return { success: true };
  });
}

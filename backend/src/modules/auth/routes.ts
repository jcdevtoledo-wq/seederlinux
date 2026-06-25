import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export default async function authRoutes(app: FastifyInstance) {
  // Login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await app.prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { roles: true },
    });

    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    if (user.blocked) {
      return reply.code(403).send({ error: 'User is blocked' });
    }

    const validPassword = await bcrypt.compare(body.password, user.password);
    if (!validPassword) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign({
      userId: user.id,
      email: user.email,
      roles: user.roles.map(r => ({ role: r.role, orgSigla: r.orgSigla })),
    });

    // Audit log
    await app.prisma.auditEvent.create({
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
        roles: user.roles.map(r => ({ role: r.role, orgSigla: r.orgSigla })),
      },
    };
  });

  // Logout (client-side, just for audit)
  app.post('/logout', async (request, reply) => {
    const user = (request as any).user;
    if (user) {
      await app.prisma.auditEvent.create({
        data: {
          atorId: user.userId,
          atorEmail: user.email,
          categoria: 'auth',
          acao: 'logout',
          alvo: user.email,
        },
      });
    }
    return { success: true };
  });

  // Get current user
  app.get('/me', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const fullUser = await app.prisma.user.findUnique({
      where: { id: user.userId },
      include: { roles: true },
    });

    if (!fullUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return {
      id: fullUser.id,
      email: fullUser.email,
      displayName: fullUser.displayName,
      blocked: fullUser.blocked,
      roles: fullUser.roles.map(r => ({ role: r.role, orgSigla: r.orgSigla })),
    };
  });

  // Change password
  app.post('/change-password', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const body = changePasswordSchema.parse(request.body);

    const fullUser = await app.prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!fullUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(body.currentPassword, fullUser.password);
    if (!validPassword) {
      return reply.code(401).send({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(body.newPassword, 10);
    await app.prisma.user.update({
      where: { id: user.userId },
      data: { password: hashedPassword },
    });

    await app.prisma.auditEvent.create({
      data: {
        atorId: user.userId,
        atorEmail: user.email,
        categoria: 'auth',
        acao: 'change_password',
        alvo: user.email,
      },
    });

    return { success: true };
  });
}

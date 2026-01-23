import type { FastifyInstance } from 'fastify';
import { SessionManagementController } from '../controllers/session-management.controller.js';
import {
  listOwnSessionsSchema,
  sessionDetailsSchema,
  terminateSessionSchema,
  terminateAllSessionsSchema,
  adminListUserSessionsSchema,
  adminTerminateSessionSchema,
  adminTerminateAllSessionsSchema,
} from '../schemas/session-management.schemas.js';
import { requireAuth, requireRole, requireSameTenant } from '../middleware/authorization.js';

export async function registerSessionManagementRoutes(server: FastifyInstance): Promise<void> {
  const controller = (server as FastifyInstance & { sessionManagementController?: SessionManagementController })
    .sessionManagementController;

  if (!controller) {
    server.log.warn('⚠️  Session management routes not registered - controller missing');
    return;
  }

  const authDecorator = (server as any).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️  Session management routes not registered - authentication decorator missing');
    return;
  }

  server.get(
    '/api/sessions',
    {
      schema: listOwnSessionsSchema,
      onRequest: [authDecorator, requireAuth()],
    },
    (request, reply) => controller.listCurrentSessions(request, reply)
  );

  server.get(
    '/api/sessions/:sessionId',
    {
      schema: sessionDetailsSchema,
      onRequest: [authDecorator, requireAuth()],
    },
    (request, reply) => controller.getCurrentSession(request, reply)
  );

  server.post(
    '/api/sessions/:sessionId/terminate',
    {
      schema: terminateSessionSchema,
      onRequest: [authDecorator, requireAuth()],
    },
    (request, reply) => controller.terminateSession(request, reply)
  );

  server.post(
    '/api/sessions/terminate-all',
    {
      schema: terminateAllSessionsSchema,
      onRequest: [authDecorator, requireAuth()],
    },
    (request, reply) => controller.terminateAllSessions(request, reply)
  );

  server.get(
    '/api/tenants/:tenantId/users/:userId/sessions',
    {
      schema: adminListUserSessionsSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireRole('admin', 'owner', 'global_admin'),
        requireSameTenant(),
      ],
    },
    (request, reply) => controller.listUserSessions(request, reply)
  );

  server.post(
    '/api/tenants/:tenantId/users/:userId/sessions/:sessionId/terminate',
    {
      schema: adminTerminateSessionSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireRole('admin', 'owner', 'global_admin'),
        requireSameTenant(),
      ],
    },
    (request, reply) => controller.adminTerminateSession(request, reply)
  );

  server.post(
    '/api/tenants/:tenantId/users/:userId/sessions/terminate-all',
    {
      schema: adminTerminateAllSessionsSchema,
      onRequest: [
        authDecorator,
        requireAuth(),
        requireRole('admin', 'owner', 'global_admin'),
        requireSameTenant(),
      ],
    },
    (request, reply) => controller.adminTerminateAllSessions(request, reply)
  );

  server.log.info('✅ Session management routes registered');
}

import type { FastifyInstance } from 'fastify';
import { UserManagementController } from '../controllers/user-management.controller.js';
import { RoleManagementService } from '../services/auth/role-management.service.js';
import { impersonateUserSchema, updateUserStatusSchema, bulkUserOperationSchema, importUsersSchema } from '../schemas/user-management.schemas.js';
import { requireAuth, requireSameTenant, requireTenantOrGlobalAdmin } from '../middleware/authorization.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
import { SYSTEM_PERMISSIONS } from '@castiel/shared-types';

export async function registerUserManagementRoutes(server: FastifyInstance): Promise<void> {
  const controller = (server as FastifyInstance & { userManagementController?: UserManagementController })
    .userManagementController;

  const roleService = (server as FastifyInstance & { roleManagementService?: RoleManagementService })
    .roleManagementService;

  if (!controller || !roleService) {
    server.log.warn('⚠️  User management routes not registered - controller or role service missing');
    return;
  }

  if (!(server as any).authenticate) {
    server.log.warn('⚠️  User management routes not registered - authentication decorator missing');
    return;
  }

  const checkPerm = createPermissionGuard(roleService);

  // Update user status
  server.patch(
    '/api/users/:userId/status',
    {
      schema: updateUserStatusSchema,
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.UPDATE),
      ],
    },
    (request, reply) => controller.updateUserStatus(request as any, reply)
  );

  server.post(
    '/api/tenants/:tenantId/users/:userId/impersonate',
    {
      schema: impersonateUserSchema,
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireSameTenant(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.IMPERSONATE),
      ],
    },
    (request, reply) => controller.impersonateUser(request as any, reply)
  );

  // Bulk user operations
  server.post(
    '/api/tenants/:tenantId/users/bulk',
    {
      schema: bulkUserOperationSchema,
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.BULK_ACTION),
      ],
    },
    (request, reply) => controller.bulkOperation(request as any, reply)
  );

  // Import Users
  server.post(
    '/api/tenants/:tenantId/users/import',
    {
      schema: importUsersSchema,
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.CREATE),
      ],
    },
    (request, reply) => controller.importUsers(request as any, reply)
  );

  // User CRUD routes
  server.get(
    '/api/tenants/:tenantId/users',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.READ),
      ],
    },
    (request, reply) => controller.listUsers(request as any, reply)
  );

  server.get(
    '/api/tenants/:tenantId/users/:userId',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.READ),
      ],
    },
    (request, reply) => controller.getUser(request as any, reply)
  );

  server.post(
    '/api/tenants/:tenantId/users',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.CREATE),
      ],
    },
    (request, reply) => controller.createUser(request as any, reply)
  );

  server.patch(
    '/api/tenants/:tenantId/users/:userId',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.UPDATE),
      ],
    },
    (request, reply) => controller.updateUser(request as any, reply)
  );

  server.delete(
    '/api/tenants/:tenantId/users/:userId',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.DELETE),
      ],
    },
    (request, reply) => controller.deleteUser(request as any, reply)
  );

  server.log.info('✅ User management routes registered');
}

/**
 * External User IDs Routes
 * Admin endpoints for managing external user IDs
 */

import type { FastifyInstance } from 'fastify';
import { ExternalUserIdsController } from '../controllers/external-user-ids.controller.js';
import {
  getExternalUserIdsSchema,
  createExternalUserIdSchema,
  updateExternalUserIdSchema,
  deleteExternalUserIdSchema,
  syncExternalUserIdSchema,
} from '../schemas/external-user-ids.schemas.js';
import { requireAuth, requireTenantOrGlobalAdmin } from '../middleware/authorization.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
import { RoleManagementService } from '../services/auth/role-management.service.js';
import { SYSTEM_PERMISSIONS } from '@castiel/shared-types';

export async function registerExternalUserIdsRoutes(server: FastifyInstance): Promise<void> {
  const controller = (server as FastifyInstance & { externalUserIdsController?: ExternalUserIdsController })
    .externalUserIdsController;

  const roleService = (server as FastifyInstance & { roleManagementService?: RoleManagementService })
    .roleManagementService;

  if (!controller) {
    server.log.warn('⚠️  External user IDs routes not registered - controller missing');
    return;
  }

  if (!(server as any).authenticate) {
    server.log.warn('⚠️  External user IDs routes not registered - authentication decorator missing');
    return;
  }

  if (!roleService) {
    server.log.warn('⚠️  External user IDs routes not registered - role service missing');
    return;
  }

  const checkPerm = createPermissionGuard(roleService);

  // Get all external user IDs for a user
  server.get(
    '/api/tenants/:tenantId/users/:userId/external-user-ids',
    {
      schema: getExternalUserIdsSchema,
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.READ),
      ],
    },
    (request, reply) => controller.getUserExternalUserIds(request as any, reply)
  );

  // Create or update external user ID
  server.post(
    '/api/tenants/:tenantId/users/:userId/external-user-ids',
    {
      schema: createExternalUserIdSchema,
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.UPDATE),
      ],
    },
    (request, reply) => controller.createOrUpdateExternalUserId(request as any, reply)
  );

  // Update external user ID and metadata
  server.patch(
    '/api/tenants/:tenantId/users/:userId/external-user-ids/:integrationId',
    {
      schema: updateExternalUserIdSchema,
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.UPDATE),
      ],
    },
    (request, reply) => controller.updateExternalUserId(request as any, reply)
  );

  // Delete external user ID
  server.delete(
    '/api/tenants/:tenantId/users/:userId/external-user-ids/:integrationId',
    {
      schema: deleteExternalUserIdSchema,
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.UPDATE),
      ],
    },
    (request, reply) => controller.deleteExternalUserId(request as any, reply)
  );

  // Sync external user ID from integration
  server.post(
    '/api/tenants/:tenantId/users/:userId/external-user-ids/:integrationId/sync',
    {
      schema: syncExternalUserIdSchema,
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
        checkPerm(SYSTEM_PERMISSIONS.USERS.UPDATE),
      ],
    },
    (request, reply) => controller.syncExternalUserId(request as any, reply)
  );

  server.log.info('✅ External user IDs routes registered');
}



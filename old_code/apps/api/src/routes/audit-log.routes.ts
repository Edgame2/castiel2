/**
 * Audit Log Routes
 * API routes for audit log operations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuditLogController } from '../controllers/audit-log.controller.js';
import { RoleManagementService } from '../services/auth/role-management.service.js';
import { requireAuth } from '../middleware/authorization.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
import { SYSTEM_PERMISSIONS } from '@castiel/shared-types';
import {
  listAuditLogsSchema,
  getAuditLogSchema,
  getAuditStatsSchema,
  exportAuditLogsSchema,
  getFilterOptionsSchema,
} from '../schemas/audit-log.schemas.js';

export async function auditLogRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = (fastify as FastifyInstance & { auditLogController?: AuditLogController })
    .auditLogController;

  const roleService = (fastify as FastifyInstance & { roleManagementService?: RoleManagementService })
    .roleManagementService;

  if (!controller) {
    fastify.log.warn('⚠️ Audit log routes not registered - controller missing');
    return;
  }

  if (!roleService) {
    fastify.log.warn('⚠️ Audit log routes not registered - role service missing');
    return;
  }

  // Create permission guard
  const checkPerm = createPermissionGuard(roleService);

  // Base auth for all routes
  const baseGuard = [requireAuth()];

  // GET /audit-logs - List audit logs
  fastify.get(
    '/audit-logs',
    {
      schema: listAuditLogsSchema,
      onRequest: [
        ...baseGuard,
        checkPerm(SYSTEM_PERMISSIONS.AUDIT.READ),
      ] as any,
    },
    controller.listLogs.bind(controller)
  );

  // GET /audit-logs/stats - Get audit statistics
  fastify.get(
    '/audit-logs/stats',
    {
      schema: getAuditStatsSchema,
      onRequest: [
        ...baseGuard,
        checkPerm(SYSTEM_PERMISSIONS.AUDIT.READ),
      ] as any,
    },
    controller.getStats.bind(controller)
  );

  // GET /audit-logs/export - Export audit logs
  fastify.get(
    '/audit-logs/export',
    {
      schema: exportAuditLogsSchema,
      onRequest: [
        ...baseGuard,
        checkPerm(SYSTEM_PERMISSIONS.AUDIT.EXPORT),
      ] as any,
    },
    controller.exportLogs.bind(controller)
  );

  // GET /audit-logs/filters - Get filter options
  fastify.get(
    '/audit-logs/filters',
    {
      schema: getFilterOptionsSchema,
      onRequest: [
        ...baseGuard,
        checkPerm(SYSTEM_PERMISSIONS.AUDIT.READ),
      ] as any,
    },
    controller.getFilterOptions.bind(controller)
  );

  // GET /audit-logs/:id - Get single audit log
  fastify.get(
    '/audit-logs/:id',
    {
      schema: getAuditLogSchema,
      onRequest: [
        ...baseGuard,
        checkPerm(SYSTEM_PERMISSIONS.AUDIT.READ),
      ] as any,
    },
    controller.getLog.bind(controller)
  );

  fastify.log.info('✅ Audit log routes registered');
}

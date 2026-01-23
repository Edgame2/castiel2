/**
 * Tenant Provisioning Routes
 * Management endpoints for tenant SCIM provisioning configuration
 */

import type { FastifyInstance } from 'fastify';
import { TenantProvisioningController } from '../controllers/tenant-provisioning.controller.js';
import type { SCIMService } from '../services/auth/scim.service.js';
import { requireAuth, requireRole, requireTenantOrGlobalAdmin } from '../middleware/authorization.js';

/**
 * Register tenant provisioning routes
 */
export async function registerTenantProvisioningRoutes(
  server: FastifyInstance,
  scimService: SCIMService
): Promise<void> {
  const controller = new TenantProvisioningController(scimService);
  const authDecorator = (server as any).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️  Tenant provisioning routes not registered - authentication decorator missing');
    return;
  }

  const tenantAdminGuards = [
    authDecorator,
    requireAuth(),
    requireRole('owner', 'admin', 'global_admin', 'super-admin', 'super_admin'),
    requireTenantOrGlobalAdmin(),
  ];

  // Get SCIM configuration
  server.get(
    '/api/tenants/:tenantId/provisioning',
    {
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.getConfig(request, reply)
  );

  // Enable SCIM
  server.post(
    '/api/tenants/:tenantId/provisioning/enable',
    {
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.enableSCIM(request, reply)
  );

  // Disable SCIM
  server.post(
    '/api/tenants/:tenantId/provisioning/disable',
    {
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.disableSCIM(request, reply)
  );

  // Rotate SCIM token
  server.post(
    '/api/tenants/:tenantId/provisioning/rotate',
    {
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.rotateToken(request, reply)
  );

  // Test SCIM connection
  server.post(
    '/api/tenants/:tenantId/provisioning/test',
    {
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.testConnection(request, reply)
  );

  // Get SCIM activity logs
  server.get(
    '/api/tenants/:tenantId/provisioning/logs',
    {
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.getLogs(request, reply)
  );

  server.log.info('✅ Tenant provisioning routes registered');
}


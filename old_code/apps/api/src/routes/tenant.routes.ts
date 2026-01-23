import type { FastifyInstance } from 'fastify';
import { TenantController } from '../controllers/tenant.controller.js';
import {
  createTenantSchema,
  getTenantSchema,
  updateTenantSchema,
  deleteTenantSchema,
  activateTenantSchema,
  listTenantsSchema,
  tenantDomainLookupSchema,
} from '../schemas/tenant.schemas.js';
import { requireAuth, requireRole, requireTenantOrGlobalAdmin, requireGlobalAdmin, isGlobalAdmin } from '../middleware/authorization.js';

export async function registerTenantRoutes(server: FastifyInstance): Promise<void> {
  const controller = (server as FastifyInstance & { tenantController?: TenantController }).tenantController;

  if (!controller) {
    server.log.warn('⚠️  Tenant routes not registered - controller missing');
    return;
  }

  const authDecorator = (server as any).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️  Tenant routes not registered - authentication decorator missing');
    return;
  }

  // Global/super admin guards - accepts super-admin, super_admin, global_admin
  const globalAdminGuards = [authDecorator, requireAuth(), requireGlobalAdmin()];
  const tenantAdminGuards = [
    authDecorator,
    requireAuth(),
    requireRole('owner', 'admin', 'global_admin', 'super-admin', 'super_admin'),
    requireTenantOrGlobalAdmin(),
  ];

  server.get(
    '/api/tenants/domain/:domain',
    {
      schema: tenantDomainLookupSchema,
    },
    (request, reply) => controller.lookupTenantByDomain(request as any, reply)
  );

  server.post(
    '/api/tenants',
    {
      schema: createTenantSchema,
      onRequest: globalAdminGuards,
    },
    (request, reply) => controller.createTenant(request as any, reply)
  );

  server.get(
    '/api/tenants',
    {
      schema: listTenantsSchema,
      onRequest: globalAdminGuards,
    },
    (request, reply) => controller.listTenants(request as any, reply)
  );

  server.get(
    '/api/tenants/:tenantId',
    {
      schema: getTenantSchema,
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.getTenant(request as any, reply)
  );

  server.patch(
    '/api/tenants/:tenantId',
    {
      schema: updateTenantSchema,
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.updateTenant(request as any, reply)
  );

  server.delete(
    '/api/tenants/:tenantId',
    {
      schema: deleteTenantSchema,
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.deleteTenant(request as any, reply)
  );

  server.post(
    '/api/tenants/:tenantId/activate',
    {
      schema: activateTenantSchema,
      onRequest: tenantAdminGuards,
    },
    (request, reply) => controller.activateTenant(request as any, reply)
  );

  server.log.info('✅ Tenant routes registered');
}

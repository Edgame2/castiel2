import { createTenantSchema, getTenantSchema, updateTenantSchema, deleteTenantSchema, activateTenantSchema, listTenantsSchema, tenantDomainLookupSchema, } from '../schemas/tenant.schemas.js';
import { requireAuth, requireRole, requireTenantOrGlobalAdmin, requireGlobalAdmin } from '../middleware/authorization.js';
export async function registerTenantRoutes(server) {
    const controller = server.tenantController;
    if (!controller) {
        server.log.warn('⚠️  Tenant routes not registered - controller missing');
        return;
    }
    const authDecorator = server.authenticate;
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
    server.get('/api/tenants/domain/:domain', {
        schema: tenantDomainLookupSchema,
    }, (request, reply) => controller.lookupTenantByDomain(request, reply));
    server.post('/api/tenants', {
        schema: createTenantSchema,
        onRequest: globalAdminGuards,
    }, (request, reply) => controller.createTenant(request, reply));
    server.get('/api/tenants', {
        schema: listTenantsSchema,
        onRequest: globalAdminGuards,
    }, (request, reply) => controller.listTenants(request, reply));
    server.get('/api/tenants/:tenantId', {
        schema: getTenantSchema,
        onRequest: tenantAdminGuards,
    }, (request, reply) => controller.getTenant(request, reply));
    server.patch('/api/tenants/:tenantId', {
        schema: updateTenantSchema,
        onRequest: tenantAdminGuards,
    }, (request, reply) => controller.updateTenant(request, reply));
    server.delete('/api/tenants/:tenantId', {
        schema: deleteTenantSchema,
        onRequest: tenantAdminGuards,
    }, (request, reply) => controller.deleteTenant(request, reply));
    server.post('/api/tenants/:tenantId/activate', {
        schema: activateTenantSchema,
        onRequest: tenantAdminGuards,
    }, (request, reply) => controller.activateTenant(request, reply));
    server.log.info('✅ Tenant routes registered');
}
//# sourceMappingURL=tenant.routes.js.map
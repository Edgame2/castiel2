/**
 * Tenant Controller
 * Handles tenant management endpoints
 */
export class TenantController {
    tenantService;
    constructor(tenantService) {
        this.tenantService = tenantService;
    }
    /**
     * Create tenant
     * POST /api/tenants
     */
    async createTenant(request, reply) {
        try {
            const user = this.getAuthUser(request);
            const createdBy = user?.id;
            const tenant = await this.tenantService.createTenant(request.body, createdBy);
            reply.code(201).send(tenant);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to create tenant');
            if (error?.message?.includes('already exists')) {
                reply.code(409).send({
                    error: 'Conflict',
                    message: error.message,
                });
                return;
            }
            reply.code(400).send({
                error: 'Bad Request',
                message: error?.message || 'Failed to create tenant',
            });
        }
    }
    /**
     * Get tenant
     * GET /api/tenants/:tenantId
     */
    async getTenant(request, reply) {
        try {
            const { tenantId } = request.params;
            const tenant = await this.tenantService.getTenant(tenantId);
            if (!tenant) {
                reply.code(404).send({
                    error: 'Not Found',
                    message: 'Tenant not found',
                });
                return;
            }
            reply.send(tenant);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to get tenant');
            reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to get tenant',
            });
        }
    }
    /**
     * Update tenant
     * PATCH /api/tenants/:tenantId
     */
    async updateTenant(request, reply) {
        try {
            const { tenantId } = request.params;
            const tenant = await this.tenantService.updateTenant(tenantId, request.body);
            reply.send(tenant);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to update tenant');
            if (error?.message === 'Tenant not found') {
                reply.code(404).send({
                    error: 'Not Found',
                    message: error.message,
                });
                return;
            }
            if (error?.message?.includes('already exists')) {
                reply.code(409).send({
                    error: 'Conflict',
                    message: error.message,
                });
                return;
            }
            reply.code(400).send({
                error: 'Bad Request',
                message: error?.message || 'Failed to update tenant',
            });
        }
    }
    /**
     * Delete tenant (soft delete)
     * DELETE /api/tenants/:tenantId
     */
    async deleteTenant(request, reply) {
        try {
            const { tenantId } = request.params;
            await this.tenantService.deleteTenant(tenantId);
            reply.send({
                success: true,
                message: 'Tenant deactivated successfully',
            });
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to delete tenant');
            if (error?.message === 'Tenant not found') {
                reply.code(404).send({
                    error: 'Not Found',
                    message: error.message,
                });
                return;
            }
            reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to delete tenant',
            });
        }
    }
    /**
     * Activate tenant
     * POST /api/tenants/:tenantId/activate
     */
    async activateTenant(request, reply) {
        try {
            const { tenantId } = request.params;
            const tenant = await this.tenantService.activateTenant(tenantId);
            reply.send({
                success: true,
                message: 'Tenant activated successfully',
                activatedAt: tenant.activatedAt,
            });
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to activate tenant');
            if (error?.message === 'Tenant not found') {
                reply.code(404).send({
                    error: 'Not Found',
                    message: error.message,
                });
                return;
            }
            reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to activate tenant',
            });
        }
    }
    /**
     * List tenants
     * GET /api/tenants
     */
    async listTenants(request, reply) {
        try {
            const query = request.query || {};
            const tenants = await this.tenantService.listTenants(query);
            reply.send(tenants);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to list tenants');
            reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to list tenants',
            });
        }
    }
    /**
     * Lookup tenant by domain
     * GET /api/tenants/domain/:domain
     */
    async lookupTenantByDomain(request, reply) {
        try {
            const rawDomain = request.params.domain?.trim().toLowerCase();
            if (!rawDomain) {
                reply.code(400).send({
                    error: 'Bad Request',
                    message: 'Domain is required',
                });
                return;
            }
            const tenant = await this.tenantService.getTenantByDomain(rawDomain);
            if (!tenant) {
                reply.send({ exists: false, tenant: null });
                return;
            }
            reply.send({
                exists: true,
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    domain: tenant.domain,
                    status: tenant.status,
                    plan: tenant.plan,
                    activatedAt: tenant.activatedAt,
                },
            });
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to lookup tenant by domain');
            reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to lookup tenant',
            });
        }
    }
    getAuthUser(request) {
        return request.user;
    }
}
//# sourceMappingURL=tenant.controller.js.map
/**
 * Tenant Controller
 * Handles tenant management endpoints
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { TenantService } from '../services/auth/tenant.service.js';
import type { CreateTenantRequest, UpdateTenantRequest, TenantListQuery } from '../types/tenant.types.js';
interface TenantParams {
    tenantId: string;
}
interface TenantDomainParams {
    domain: string;
}
export declare class TenantController {
    private readonly tenantService;
    constructor(tenantService: TenantService);
    /**
     * Create tenant
     * POST /api/tenants
     */
    createTenant(request: FastifyRequest<{
        Body: CreateTenantRequest;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Get tenant
     * GET /api/tenants/:tenantId
     */
    getTenant(request: FastifyRequest<{
        Params: TenantParams;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Update tenant
     * PATCH /api/tenants/:tenantId
     */
    updateTenant(request: FastifyRequest<{
        Params: TenantParams;
        Body: UpdateTenantRequest;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Delete tenant (soft delete)
     * DELETE /api/tenants/:tenantId
     */
    deleteTenant(request: FastifyRequest<{
        Params: TenantParams;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Activate tenant
     * POST /api/tenants/:tenantId/activate
     */
    activateTenant(request: FastifyRequest<{
        Params: TenantParams;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * List tenants
     * GET /api/tenants
     */
    listTenants(request: FastifyRequest<{
        Querystring: TenantListQuery;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Lookup tenant by domain
     * GET /api/tenants/domain/:domain
     */
    lookupTenantByDomain(request: FastifyRequest<{
        Params: TenantDomainParams;
    }>, reply: FastifyReply): Promise<void>;
    private getAuthUser;
}
export {};
//# sourceMappingURL=tenant.controller.d.ts.map
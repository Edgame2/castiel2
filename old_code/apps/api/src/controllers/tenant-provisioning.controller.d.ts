/**
 * Tenant Provisioning Controller
 * HTTP handlers for tenant SCIM provisioning management
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SCIMService } from '../services/auth/scim.service.js';
/**
 * Tenant Provisioning Controller
 */
export declare class TenantProvisioningController {
    private readonly scimService;
    constructor(scimService: SCIMService);
    /**
     * GET /api/tenants/:tenantId/provisioning
     * Get SCIM configuration for tenant
     */
    getConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/tenants/:tenantId/provisioning/enable
     * Enable SCIM for tenant
     */
    enableSCIM(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/tenants/:tenantId/provisioning/disable
     * Disable SCIM for tenant
     */
    disableSCIM(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/tenants/:tenantId/provisioning/rotate
     * Rotate SCIM token
     */
    rotateToken(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/tenants/:tenantId/provisioning/test
     * Test SCIM connectivity
     */
    testConnection(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/tenants/:tenantId/provisioning/logs
     * Get SCIM activity logs
     */
    getLogs(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=tenant-provisioning.controller.d.ts.map
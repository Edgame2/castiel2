/**
 * SSO Configuration Controller
 *
 * HTTP handlers for SSO configuration management
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SSOConfigService } from '../services/auth/sso-config.service.js';
/**
 * SSO Configuration Controller
 */
export declare class SSOConfigController {
    private readonly ssoConfigService;
    constructor(ssoConfigService: SSOConfigService);
    /**
     * GET /api/admin/sso/config
     * Get SSO configuration for tenant
     */
    getConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/admin/sso/config
     * Create SSO configuration
     */
    createConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * PUT /api/admin/sso/config
     * Update SSO configuration
     */
    updateConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * DELETE /api/admin/sso/config
     * Delete SSO configuration
     */
    deleteConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/admin/sso/config/activate
     * Activate SSO configuration
     */
    activateConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/admin/sso/config/deactivate
     * Deactivate SSO configuration
     */
    deactivateConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/admin/sso/config/validate
     * Validate SSO configuration
     */
    validateConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/admin/sso/config/test
     * Get test SSO URL
     */
    testConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    private isAdmin;
}
//# sourceMappingURL=sso-config.controller.d.ts.map
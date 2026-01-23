/**
 * SSO Controller
 *
 * HTTP handlers for Single Sign-On (SAML) authentication
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SAMLService } from '../services/auth/saml.service.js';
import type { SSOConfigService } from '../services/auth/sso-config.service.js';
import type { UserService } from '../services/auth/user.service.js';
import type { CacheManager } from '../cache/manager.js';
import type { SSOTeamSyncService } from '../services/sso-team-sync.service.js';
import type { IntegrationService } from '../services/integration.service.js';
/**
 * SSO Controller for handling SAML authentication
 */
export declare class SSOController {
    private readonly samlService;
    private readonly ssoConfigService;
    private readonly userService;
    private readonly cacheManager;
    private readonly accessTokenExpiry;
    private readonly frontendUrl;
    private readonly ssoTeamSyncService?;
    private readonly integrationService?;
    constructor(samlService: SAMLService, ssoConfigService: SSOConfigService, userService: UserService, cacheManager: CacheManager, accessTokenExpiry?: string, frontendUrl?: string, ssoTeamSyncService?: SSOTeamSyncService | undefined, integrationService?: IntegrationService | undefined);
    /**
     * GET /auth/sso/:tenantId/login
     * Initiate SAML login for an organization
     */
    initiateLogin(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /auth/sso/:tenantId/callback
     * Handle SAML assertion callback from IdP
     */
    handleCallback(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /auth/sso/:tenantId/metadata
     * Get SAML service provider metadata
     */
    getMetadata(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /auth/sso/:tenantId/logout
     * Initiate SAML single logout
     */
    initiateLogout(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Find integration for SSO provider
     */
    private findIntegrationForSSOProvider;
    /**
     * Redirect with error to frontend
     */
    private redirectWithError;
}
//# sourceMappingURL=sso.controller.d.ts.map
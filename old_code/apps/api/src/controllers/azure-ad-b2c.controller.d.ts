/**
 * Azure AD B2C Controller
 *
 * HTTP handlers for Azure AD B2C authentication flows
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AzureADB2CService } from '../services/auth/azure-ad-b2c.service.js';
import type { UserService } from '../services/auth/user.service.js';
import type { CacheManager } from '../cache/manager.js';
import type { SSOTeamSyncService } from '../services/sso-team-sync.service.js';
import type { IntegrationService } from '../services/integration.service.js';
/**
 * Azure AD B2C Controller
 */
export declare class AzureADB2CController {
    private readonly azureService;
    private readonly userService;
    private readonly cacheManager;
    private readonly accessTokenExpiry;
    private readonly frontendUrl;
    private readonly ssoTeamSyncService?;
    private readonly integrationService?;
    constructor(azureService: AzureADB2CService, userService: UserService, cacheManager: CacheManager, accessTokenExpiry: string, frontendUrl: string, ssoTeamSyncService?: SSOTeamSyncService | undefined, integrationService?: IntegrationService | undefined);
    /**
     * GET /auth/azure-b2c/:tenantId?/login
     * Initiate Azure AD B2C login
     */
    initiateLogin(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /auth/azure-b2c/callback
     * Handle Azure AD B2C callback (form_post response mode)
     */
    handleCallback(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /auth/azure-b2c/logout
     * Initiate logout from Azure AD B2C
     */
    logout(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=azure-ad-b2c.controller.d.ts.map
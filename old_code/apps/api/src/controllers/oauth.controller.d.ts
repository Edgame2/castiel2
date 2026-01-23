import type { FastifyRequest, FastifyReply } from 'fastify';
import { OAuthService } from '../services/auth/oauth.service.js';
import type { UserService } from '../services/auth/user.service.js';
import type { CacheManager } from '../cache/manager.js';
export interface OAuthCallbackQuery {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
}
export interface OAuthInitiateQuery {
    tenantId?: string;
    redirectUrl?: string;
}
/**
 * OAuth Controller
 * Handles Google and GitHub OAuth flows for first-party authentication
 */
export declare class OAuthController {
    private readonly oauthService;
    private readonly userService;
    private readonly cacheManager;
    private readonly accessTokenExpiry;
    constructor(oauthService: OAuthService, userService: UserService, cacheManager: CacheManager, accessTokenExpiry?: string);
    /**
     * Initiate Google OAuth flow
     */
    initiateGoogle(request: FastifyRequest<{
        Querystring: OAuthInitiateQuery;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Handle Google OAuth callback
     */
    handleGoogleCallback(request: FastifyRequest<{
        Querystring: OAuthCallbackQuery;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Initiate GitHub OAuth flow
     */
    initiateGitHub(request: FastifyRequest<{
        Querystring: OAuthInitiateQuery;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Handle GitHub OAuth callback
     */
    handleGitHubCallback(request: FastifyRequest<{
        Querystring: OAuthCallbackQuery;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Initiate Microsoft OAuth flow
     */
    initiateMicrosoft(request: FastifyRequest<{
        Querystring: OAuthInitiateQuery;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Handle Microsoft OAuth callback
     */
    handleMicrosoftCallback(request: FastifyRequest<{
        Querystring: OAuthCallbackQuery;
    }>, reply: FastifyReply): Promise<void>;
    private initiateProviderOAuth;
    private handleProviderCallback;
    private handleOAuthUser;
}
//# sourceMappingURL=oauth.controller.d.ts.map
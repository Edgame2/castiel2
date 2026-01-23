import type { FastifyReply, FastifyRequest } from 'fastify';
import type { OAuth2ClientService } from '../services/auth/oauth2-client.service.js';
import type { OAuth2AuthService } from '../services/auth/oauth2-auth.service.js';
import type { OAuth2AuthorizationRequest, OAuth2AuthorizationCodeTokenRequest, OAuth2ClientCredentialsTokenRequest, OAuth2RefreshTokenRequest, OAuth2RevokeTokenRequest } from '../types/oauth2.types.js';
/**
 * OAuth2 Controller
 */
export declare class OAuth2Controller {
    private oauth2ClientService;
    private oauth2AuthService;
    constructor(oauth2ClientService: OAuth2ClientService, oauth2AuthService: OAuth2AuthService);
    authorize(request: FastifyRequest<{
        Querystring: OAuth2AuthorizationRequest;
    }>, reply: FastifyReply): Promise<void>;
    token(request: FastifyRequest<{
        Body: OAuth2AuthorizationCodeTokenRequest | OAuth2ClientCredentialsTokenRequest | OAuth2RefreshTokenRequest;
    }>, reply: FastifyReply): Promise<void>;
    revoke(request: FastifyRequest<{
        Body: OAuth2RevokeTokenRequest;
    }>, reply: FastifyReply): Promise<void>;
    private handleAuthorizationCodeGrant;
    private handleClientCredentialsGrant;
    private handleRefreshTokenGrant;
    private buildErrorRedirect;
}
//# sourceMappingURL=oauth2.controller.d.ts.map
import { OAuth2GrantType } from '../types/oauth2.types.js';
/**
 * OAuth2 Controller
 */
export class OAuth2Controller {
    oauth2ClientService;
    oauth2AuthService;
    constructor(oauth2ClientService, oauth2AuthService) {
        this.oauth2ClientService = oauth2ClientService;
        this.oauth2AuthService = oauth2AuthService;
    }
    async authorize(request, reply) {
        try {
            const { response_type, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method, } = request.query;
            const user = request.user;
            if (!user) {
                const nodeEnv = (process.env.NODE_ENV || 'development');
                const frontendUrl = process.env.FRONTEND_URL ||
                    process.env.PUBLIC_APP_BASE_URL ||
                    process.env.NEXT_PUBLIC_APP_URL ||
                    (nodeEnv === 'production'
                        ? (() => { throw new Error('FRONTEND_URL is required in production'); })()
                        : 'http://localhost:3000');
                const apiUrl = process.env.PUBLIC_API_BASE_URL ||
                    (nodeEnv === 'production'
                        ? (() => { throw new Error('PUBLIC_API_BASE_URL is required in production'); })()
                        : 'http://localhost:3001');
                const fullAuthorizeUrl = `${apiUrl}${request.url}`;
                const loginUrl = `${frontendUrl}/login?returnUrl=${encodeURIComponent(fullAuthorizeUrl)}`;
                return reply.redirect(loginUrl);
            }
            if (response_type !== 'code') {
                const redirectUrl = this.buildErrorRedirect(redirect_uri, 'unsupported_response_type', 'Only authorization code flow is supported', state);
                return reply.redirect(redirectUrl);
            }
            const client = await this.oauth2ClientService.getClientById(client_id, user.tenantId);
            if (!client) {
                const redirectUrl = this.buildErrorRedirect(redirect_uri, 'invalid_client', 'Client not found', state);
                return reply.redirect(redirectUrl);
            }
            if (client.status !== 'active') {
                const redirectUrl = this.buildErrorRedirect(redirect_uri, 'unauthorized_client', 'Client is not active', state);
                return reply.redirect(redirectUrl);
            }
            if (!client.redirectUris.includes(redirect_uri)) {
                return reply.status(400).send({
                    error: 'invalid_request',
                    error_description: 'Invalid redirect_uri',
                });
            }
            if (!client.allowedGrantTypes.includes(OAuth2GrantType.AUTHORIZATION_CODE)) {
                const redirectUrl = this.buildErrorRedirect(redirect_uri, 'unauthorized_client', 'Client is not authorized to use authorization code flow', state);
                return reply.redirect(redirectUrl);
            }
            const requestedScopes = scope ? scope.split(' ') : [];
            if (requestedScopes.length > 0) {
                const validScopes = requestedScopes.every(s => client.allowedScopes.includes(s));
                if (!validScopes) {
                    const redirectUrl = this.buildErrorRedirect(redirect_uri, 'invalid_scope', 'One or more requested scopes are not allowed', state);
                    return reply.redirect(redirectUrl);
                }
            }
            else {
                requestedScopes.push(...client.allowedScopes);
            }
            if (code_challenge) {
                if (!code_challenge_method || !['plain', 'S256'].includes(code_challenge_method)) {
                    const redirectUrl = this.buildErrorRedirect(redirect_uri, 'invalid_request', 'Invalid code_challenge_method', state);
                    return reply.redirect(redirectUrl);
                }
            }
            const code = await this.oauth2AuthService.generateAuthorizationCode(client_id, user.id, user.tenantId, redirect_uri, requestedScopes, code_challenge, code_challenge_method);
            const redirectUrl = new URL(redirect_uri);
            redirectUrl.searchParams.set('code', code);
            if (state) {
                redirectUrl.searchParams.set('state', state);
            }
            return reply.redirect(redirectUrl.toString());
        }
        catch (error) {
            request.log.error({ error }, 'Error in OAuth2 authorize endpoint');
            return reply.status(500).send({
                error: 'server_error',
                error_description: 'Internal server error',
            });
        }
    }
    async token(request, reply) {
        try {
            const { grant_type, client_id, client_secret } = request.body;
            if (!grant_type) {
                return reply.status(400).send({
                    error: 'invalid_request',
                    error_description: 'grant_type is required',
                });
            }
            let clientId = client_id;
            let clientSecret = client_secret;
            const authHeader = request.headers.authorization;
            if (authHeader && authHeader.startsWith('Basic ')) {
                const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
                const [id, secret] = credentials.split(':');
                clientId = id;
                clientSecret = secret;
            }
            if (!clientId) {
                return reply.status(400).send({
                    error: 'invalid_request',
                    error_description: 'client_id is required',
                });
            }
            if (grant_type === OAuth2GrantType.AUTHORIZATION_CODE) {
                return this.handleAuthorizationCodeGrant(request, reply, clientId, clientSecret);
            }
            if (grant_type === OAuth2GrantType.CLIENT_CREDENTIALS) {
                return this.handleClientCredentialsGrant(request, reply, clientId, clientSecret);
            }
            if (grant_type === OAuth2GrantType.REFRESH_TOKEN) {
                return this.handleRefreshTokenGrant(request, reply, clientId);
            }
            return reply.status(400).send({
                error: 'unsupported_grant_type',
                error_description: `Grant type '${grant_type}' is not supported`,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Error in OAuth2 token endpoint');
            return reply.status(500).send({
                error: 'server_error',
                error_description: 'Internal server error',
            });
        }
    }
    async revoke(request, reply) {
        try {
            const { token, token_type_hint, client_id } = request.body;
            if (!token) {
                return reply.status(400).send({
                    error: 'invalid_request',
                    error_description: 'token is required',
                });
            }
            let clientId = client_id;
            const authHeader = request.headers.authorization;
            if (authHeader && authHeader.startsWith('Basic ')) {
                const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
                const [id] = credentials.split(':');
                clientId = id;
            }
            if (!clientId) {
                return reply.status(400).send({
                    error: 'invalid_request',
                    error_description: 'client_id is required',
                });
            }
            let revoked = false;
            if (token_type_hint === 'access_token' || !token_type_hint) {
                const result = await this.oauth2AuthService.revokeAccessToken(token);
                if (result) {
                    revoked = true;
                }
            }
            if (token_type_hint === 'refresh_token' || (!token_type_hint && !revoked)) {
                const result = await this.oauth2AuthService.revokeRefreshToken(token);
                if (result) {
                    revoked = true;
                }
            }
            return reply.status(200).send();
        }
        catch (error) {
            request.log.error({ error }, 'Error in OAuth2 revoke endpoint');
            return reply.status(500).send({
                error: 'server_error',
                error_description: 'Internal server error',
            });
        }
    }
    async handleAuthorizationCodeGrant(request, reply, clientId, clientSecret) {
        const body = request.body;
        const { code, redirect_uri, code_verifier } = body;
        if (!code || !redirect_uri) {
            return reply.status(400).send({
                error: 'invalid_request',
                error_description: 'code and redirect_uri are required',
            });
        }
        const authCode = await this.oauth2AuthService.validateAuthorizationCode(code, clientId, redirect_uri, code_verifier);
        if (!authCode) {
            return reply.status(400).send({
                error: 'invalid_grant',
                error_description: 'Invalid or expired authorization code',
            });
        }
        const client = await this.oauth2ClientService.getClientById(clientId, authCode.tenantId);
        if (!client) {
            return reply.status(400).send({
                error: 'invalid_client',
                error_description: 'Client not found',
            });
        }
        if (client.type === 'confidential') {
            if (!clientSecret) {
                return reply.status(401).send({
                    error: 'invalid_client',
                    error_description: 'client_secret is required for confidential clients',
                });
            }
            const valid = await this.oauth2ClientService.verifyClientCredentials(clientId, clientSecret, authCode.tenantId);
            if (!valid) {
                return reply.status(401).send({
                    error: 'invalid_client',
                    error_description: 'Invalid client credentials',
                });
            }
        }
        const tokens = await this.oauth2AuthService.generateTokens(client, authCode.scope, authCode.userId);
        await this.oauth2ClientService.updateLastUsed(clientId, authCode.tenantId);
        return reply.status(200).send(tokens);
    }
    async handleClientCredentialsGrant(request, reply, clientId, clientSecret) {
        const body = request.body;
        const { scope } = body;
        if (!clientSecret) {
            return reply.status(401).send({
                error: 'invalid_client',
                error_description: 'client_secret is required',
            });
        }
        const user = request.user;
        const tenantId = user?.tenantId;
        if (!tenantId) {
            return reply.status(400).send({
                error: 'invalid_request',
                error_description: 'Unable to determine tenant',
            });
        }
        const valid = await this.oauth2ClientService.verifyClientCredentials(clientId, clientSecret, tenantId);
        if (!valid) {
            return reply.status(401).send({
                error: 'invalid_client',
                error_description: 'Invalid client credentials',
            });
        }
        const client = await this.oauth2ClientService.getClientById(clientId, tenantId);
        if (!client) {
            return reply.status(400).send({
                error: 'invalid_client',
                error_description: 'Client not found',
            });
        }
        if (!client.allowedGrantTypes.includes(OAuth2GrantType.CLIENT_CREDENTIALS)) {
            return reply.status(400).send({
                error: 'unauthorized_client',
                error_description: 'Client is not authorized to use client credentials flow',
            });
        }
        const requestedScopes = scope ? scope.split(' ') : client.allowedScopes;
        if (requestedScopes.length > 0) {
            const validScopes = requestedScopes.every(s => client.allowedScopes.includes(s));
            if (!validScopes) {
                return reply.status(400).send({
                    error: 'invalid_scope',
                    error_description: 'One or more requested scopes are not allowed',
                });
            }
        }
        const tokens = await this.oauth2AuthService.generateTokens(client, requestedScopes);
        await this.oauth2ClientService.updateLastUsed(clientId, tenantId);
        return reply.status(200).send(tokens);
    }
    async handleRefreshTokenGrant(request, reply, clientId) {
        const body = request.body;
        const { refresh_token, scope } = body;
        if (!refresh_token) {
            return reply.status(400).send({
                error: 'invalid_request',
                error_description: 'refresh_token is required',
            });
        }
        const requestedScopes = scope ? scope.split(' ') : undefined;
        const tokens = await this.oauth2AuthService.refreshAccessToken(refresh_token, clientId, requestedScopes);
        if (!tokens) {
            return reply.status(400).send({
                error: 'invalid_grant',
                error_description: 'Invalid or expired refresh token',
            });
        }
        return reply.status(200).send(tokens);
    }
    buildErrorRedirect(redirectUri, error, errorDescription, state) {
        const url = new URL(redirectUri);
        url.searchParams.set('error', error);
        url.searchParams.set('error_description', errorDescription);
        if (state) {
            url.searchParams.set('state', state);
        }
        return url.toString();
    }
}
//# sourceMappingURL=oauth2.controller.js.map
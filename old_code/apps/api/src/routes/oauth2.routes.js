export async function registerOAuth2Routes(server) {
    const controller = server.oauth2Controller;
    if (!controller) {
        server.log.warn('OAuth2 controller not available - skipping OAuth2 routes');
        return;
    }
    const optionalAuthentication = server.optionalAuthenticate;
    if (!optionalAuthentication) {
        server.log.warn('Optional authenticate middleware not available - OAuth2 endpoints will not parse Bearer tokens automatically');
    }
    server.get('/oauth2/authorize', {
        preHandler: optionalAuthentication ? [optionalAuthentication] : undefined,
        schema: {
            description: 'OAuth2 authorization endpoint (authorization code flow)',
            tags: ['OAuth2'],
            querystring: {
                type: 'object',
                required: ['response_type', 'client_id', 'redirect_uri'],
                properties: {
                    response_type: { type: 'string', enum: ['code'] },
                    client_id: { type: 'string' },
                    redirect_uri: { type: 'string', format: 'uri' },
                    scope: { type: 'string' },
                    state: { type: 'string' },
                    code_challenge: { type: 'string' },
                    code_challenge_method: { type: 'string', enum: ['plain', 'S256'] },
                },
            },
            response: {
                302: { type: 'null', description: 'Redirect response' },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        error_description: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => controller.authorize(request, reply));
    server.post('/oauth2/token', {
        preHandler: optionalAuthentication ? [optionalAuthentication] : undefined,
        schema: {
            description: 'OAuth2 token endpoint (authorization_code, client_credentials, refresh_token)',
            tags: ['OAuth2'],
            body: {
                type: 'object',
                required: ['grant_type'],
                properties: {
                    grant_type: {
                        type: 'string',
                        enum: ['authorization_code', 'client_credentials', 'refresh_token'],
                    },
                    code: { type: 'string' },
                    redirect_uri: { type: 'string' },
                    code_verifier: { type: 'string' },
                    scope: { type: 'string' },
                    refresh_token: { type: 'string' },
                    client_id: { type: 'string' },
                    client_secret: { type: 'string' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        access_token: { type: 'string' },
                        token_type: { type: 'string' },
                        expires_in: { type: 'number' },
                        refresh_token: { type: 'string' },
                        scope: { type: 'string' },
                    },
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        error_description: { type: 'string' },
                    },
                },
                401: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        error_description: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => controller.token(request, reply));
    server.post('/oauth2/revoke', {
        preHandler: optionalAuthentication ? [optionalAuthentication] : undefined,
        schema: {
            description: 'OAuth2 token revocation endpoint',
            tags: ['OAuth2'],
            body: {
                type: 'object',
                required: ['token'],
                properties: {
                    token: { type: 'string' },
                    token_type_hint: { type: 'string', enum: ['access_token', 'refresh_token'] },
                    client_id: { type: 'string' },
                    client_secret: { type: 'string' },
                },
            },
            response: {
                200: { type: 'null' },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        error_description: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => controller.revoke(request, reply));
}
//# sourceMappingURL=oauth2.routes.js.map
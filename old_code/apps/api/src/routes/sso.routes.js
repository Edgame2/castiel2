/**
 * SSO Routes
 *
 * Routes for SAML/SSO authentication
 */
export async function registerSSORoutes(server) {
    const ssoController = server
        .ssoController;
    if (!ssoController) {
        throw new Error('SSOController not found on server instance');
    }
    // Initiate SSO login (public)
    server.get('/auth/sso/:tenantId/login', {
        schema: {
            description: 'Initiate SAML SSO login',
            tags: ['SSO', 'Authentication'],
            params: {
                type: 'object',
                required: ['tenantId'],
                properties: {
                    tenantId: { type: 'string' },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    returnUrl: { type: 'string' },
                },
            },
        },
    }, (request, reply) => ssoController.initiateLogin(request, reply));
    // SSO callback (public - receives SAML assertion)
    server.post('/auth/sso/:tenantId/callback', {
        schema: {
            description: 'Handle SAML assertion callback',
            tags: ['SSO', 'Authentication'],
            params: {
                type: 'object',
                required: ['tenantId'],
                properties: {
                    tenantId: { type: 'string' },
                },
            },
        },
    }, (request, reply) => ssoController.handleCallback(request, reply));
    // Get SP metadata (public - for IdP configuration)
    server.get('/auth/sso/:tenantId/metadata', {
        schema: {
            description: 'Get SAML Service Provider metadata',
            tags: ['SSO', 'Authentication'],
            params: {
                type: 'object',
                required: ['tenantId'],
                properties: {
                    tenantId: { type: 'string' },
                },
            },
            response: {
                200: {
                    type: 'string',
                    description: 'XML metadata',
                },
            },
        },
    }, (request, reply) => ssoController.getMetadata(request, reply));
    // SSO logout (requires authentication)
    server.post('/auth/sso/:tenantId/logout', {
        schema: {
            description: 'Initiate SAML single logout',
            tags: ['SSO', 'Authentication'],
            params: {
                type: 'object',
                required: ['tenantId'],
                properties: {
                    tenantId: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    nameID: { type: 'string' },
                    sessionIndex: { type: 'string' },
                },
            },
        },
    }, (request, reply) => ssoController.initiateLogout(request, reply));
    server.log.info('SSO routes registered');
}
//# sourceMappingURL=sso.routes.js.map
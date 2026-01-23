/**
 * Azure AD B2C Routes
 *
 * Routes for Azure Active Directory B2C authentication
 */
const initiateSchema = {
    params: {
        type: 'object',
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
};
const callbackSchema = {
    body: {
        type: 'object',
        properties: {
            code: { type: 'string' },
            id_token: { type: 'string' },
            state: { type: 'string' },
            error: { type: 'string' },
            error_description: { type: 'string' },
        },
    },
};
export function registerAzureADB2CRoutes(server, azureController) {
    // Initiate login (with optional tenant ID)
    server.get('/auth/azure-b2c/login', { schema: initiateSchema }, (request, reply) => azureController.initiateLogin(request, reply));
    server.get('/auth/azure-b2c/:tenantId/login', { schema: initiateSchema }, (request, reply) => azureController.initiateLogin(request, reply));
    // Callback (form_post from Azure)
    server.post('/auth/azure-b2c/callback', { schema: callbackSchema }, (request, reply) => azureController.handleCallback(request, reply));
    // Logout
    server.get('/auth/azure-b2c/logout', (request, reply) => azureController.logout(request, reply));
}
//# sourceMappingURL=azure-ad-b2c.routes.js.map
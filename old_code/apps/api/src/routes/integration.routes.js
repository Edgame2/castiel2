/**
 * Integration Routes
 * Registers all integration-related API routes
 */
import { requireAuth, requireGlobalAdmin, requireTenantOrGlobalAdmin } from '../middleware/authorization.js';
import { createProviderSchema, updateProviderSchema, changeStatusSchema, changeAudienceSchema, createIntegrationSchema, updateIntegrationSchema, updateDataAccessSchema, updateSearchConfigSchema, searchSchema, createUserConnectionSchema, updateUserConnectionSchema, deleteUserConnectionSchema, testUserConnectionSchema, bulkDeleteUserConnectionsSchema, bulkTestUserConnectionsSchema, } from '../schemas/integration.schemas.js';
import { createUserConnectionCreateRateLimitMiddleware, createUserConnectionUpdateRateLimitMiddleware, createUserConnectionDeleteRateLimitMiddleware, createUserConnectionTestRateLimitMiddleware, } from '../middleware/rate-limit.middleware.js';
export async function registerIntegrationRoutes(server) {
    const providerController = server
        .integrationProviderController;
    const integrationController = server
        .integrationController;
    const searchController = server
        .integrationSearchController;
    if (!providerController || !integrationController || !searchController) {
        server.log.warn('⚠️  Integration routes not registered - controllers missing');
        return;
    }
    if (!server.authenticate) {
        server.log.warn('⚠️  Integration routes not registered - authentication decorator missing');
        return;
    }
    // ============================================================================
    // Provider Routes (Super Admin only)
    // ============================================================================
    server.post('/api/admin/integrations', {
        schema: createProviderSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireGlobalAdmin(),
        ],
    }, (request, reply) => providerController.createProvider(request, reply));
    server.get('/api/admin/integrations', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireGlobalAdmin(),
        ],
    }, (request, reply) => providerController.listProviders(request, reply));
    server.get('/api/admin/integrations/:category/:id', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireGlobalAdmin(),
        ],
    }, (request, reply) => providerController.getProvider(request, reply));
    server.get('/api/admin/integrations/by-name/:providerName', {
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => providerController.getProviderByName(request, reply));
    server.patch('/api/admin/integrations/:category/:id', {
        schema: updateProviderSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireGlobalAdmin(),
        ],
    }, (request, reply) => providerController.updateProvider(request, reply));
    server.delete('/api/admin/integrations/:category/:id', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireGlobalAdmin(),
        ],
    }, (request, reply) => providerController.deleteProvider(request, reply));
    server.patch('/api/admin/integrations/:category/:id/status', {
        schema: changeStatusSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireGlobalAdmin(),
        ],
    }, (request, reply) => providerController.changeStatus(request, reply));
    server.patch('/api/admin/integrations/:category/:id/audience', {
        schema: changeAudienceSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireGlobalAdmin(),
        ],
    }, (request, reply) => providerController.changeAudience(request, reply));
    // ============================================================================
    // Integration Routes (Tenant Admin)
    // ============================================================================
    server.get('/api/integrations', {
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => integrationController.list(request, reply));
    server.post('/api/integrations', {
        schema: createIntegrationSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
        ],
    }, (request, reply) => integrationController.create(request, reply));
    server.get('/api/integrations/:id', {
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => integrationController.get(request, reply));
    server.patch('/api/integrations/:id', {
        schema: updateIntegrationSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
        ],
    }, (request, reply) => integrationController.update(request, reply));
    server.delete('/api/integrations/:id', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
        ],
    }, (request, reply) => integrationController.delete(request, reply));
    server.post('/api/integrations/:id/activate', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
        ],
    }, (request, reply) => integrationController.activate(request, reply));
    server.post('/api/integrations/:id/deactivate', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
        ],
    }, (request, reply) => integrationController.deactivate(request, reply));
    server.post('/api/integrations/:id/test-connection', {
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
        ],
    }, (request, reply) => integrationController.testConnection(request, reply));
    server.patch('/api/integrations/:id/data-access', {
        schema: updateDataAccessSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
        ],
    }, (request, reply) => integrationController.updateDataAccess(request, reply));
    server.patch('/api/integrations/:id/search-config', {
        schema: updateSearchConfigSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
            requireTenantOrGlobalAdmin(),
        ],
    }, (request, reply) => integrationController.updateSearchConfig(request, reply));
    // OAuth Endpoints
    server.post('/api/integrations/:id/oauth/authorize', {
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => integrationController.startOAuth(request, reply));
    server.get('/api/integrations/:id/oauth/callback', {
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => integrationController.handleOAuthCallback(request, reply));
    // ============================================================================
    // Search Routes (Authenticated users)
    // ============================================================================
    server.post('/api/integrations/search', {
        schema: searchSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
        // Note: Rate limiting can be added here if needed
        // preHandler: [(server as any).rateLimiter?.checkRateLimit('integration-search', { max: 10, window: 60000 })],
    }, (request, reply) => searchController.search(request, reply));
    server.post('/api/integrations/:id/search', {
        schema: searchSchema,
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => searchController.searchIntegration(request, reply));
    server.get('/api/integrations/searchable', {
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => searchController.getSearchableIntegrations(request, reply));
    // ============================================================================
    // User Connection Routes (Authenticated users)
    // ============================================================================
    server.get('/api/integrations/:id/connections', {
        schema: {
            description: 'List user connections for an integration',
            tags: ['Integrations', 'Connections'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', description: 'Integration ID' },
                },
            },
            response: {
                200: {
                    description: 'List of user connections',
                    type: 'object',
                },
            },
        },
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => integrationController.getUserConnections(request, reply));
    // Get rate limiter from server if available
    const rateLimiter = server.rateLimiter;
    const userConnectionCreateRateLimit = rateLimiter
        ? createUserConnectionCreateRateLimitMiddleware(rateLimiter)
        : undefined;
    const userConnectionUpdateRateLimit = rateLimiter
        ? createUserConnectionUpdateRateLimitMiddleware(rateLimiter)
        : undefined;
    const userConnectionDeleteRateLimit = rateLimiter
        ? createUserConnectionDeleteRateLimitMiddleware(rateLimiter)
        : undefined;
    const userConnectionTestRateLimit = rateLimiter
        ? createUserConnectionTestRateLimitMiddleware(rateLimiter)
        : undefined;
    server.post('/api/integrations/:id/connections', {
        schema: createUserConnectionSchema,
        preHandler: userConnectionCreateRateLimit ? [userConnectionCreateRateLimit] : undefined,
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => integrationController.createUserConnection(request, reply));
    server.patch('/api/integrations/:id/connections/:connectionId', {
        schema: updateUserConnectionSchema,
        preHandler: userConnectionUpdateRateLimit ? [userConnectionUpdateRateLimit] : undefined,
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => integrationController.updateUserConnection(request, reply));
    server.delete('/api/integrations/:id/connections/:connectionId', {
        schema: deleteUserConnectionSchema,
        preHandler: userConnectionDeleteRateLimit ? [userConnectionDeleteRateLimit] : undefined,
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => integrationController.deleteUserConnection(request, reply));
    server.post('/api/integrations/:id/connections/:connectionId/test', {
        schema: testUserConnectionSchema,
        preHandler: userConnectionTestRateLimit ? [userConnectionTestRateLimit] : undefined,
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => integrationController.testUserConnection(request, reply));
    server.get('/api/integrations/:id/connections/stats', {
        schema: {
            description: 'Get connection usage statistics',
            tags: ['Integrations', 'Connections'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: {
                        type: 'string',
                        description: 'Integration ID or "all" for all integrations'
                    },
                },
            },
            response: {
                200: {
                    description: 'Connection usage statistics',
                    type: 'object',
                },
            },
        },
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => integrationController.getConnectionUsageStats(request, reply));
    server.post('/api/integrations/:id/connections/bulk/delete', {
        schema: bulkDeleteUserConnectionsSchema,
        preHandler: userConnectionDeleteRateLimit ? [userConnectionDeleteRateLimit] : undefined,
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => integrationController.bulkDeleteUserConnections(request, reply));
    server.post('/api/integrations/:id/connections/bulk/test', {
        schema: bulkTestUserConnectionsSchema,
        preHandler: userConnectionTestRateLimit ? [userConnectionTestRateLimit] : undefined,
        onRequest: [
            server.authenticate,
            requireAuth(),
        ],
    }, (request, reply) => integrationController.bulkTestUserConnections(request, reply));
}
//# sourceMappingURL=integration.routes.js.map
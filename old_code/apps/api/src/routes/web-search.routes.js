/**
 * Web Search Routes
 * REST API endpoints for web search and deep search functionality
 */
import { requireAuth } from '../middleware/authorization.js';
import { WebSearchController } from '../controllers/web-search.controller.js';
/**
 * Register web search routes
 */
export async function registerWebSearchRoutes(server, monitoring, webSearchModule) {
    const controller = new WebSearchController(webSearchModule, monitoring);
    // ========================================================================
    // Search Endpoints
    // ========================================================================
    /**
     * POST /api/v1/search
     * Execute a web search
     */
    server.post('/search', { preHandler: requireAuth, schema: { description: 'Execute a web search' } }, async (request, reply) => {
        try {
            const { tenantId, userId } = request.user;
            const { q, type, maxResults, useCache, forceRefresh } = request.body;
            // Validate query
            if (!q || q.length < 2) {
                return reply.code(400).send({ error: 'Query must be at least 2 characters' });
            }
            const result = await controller.search(tenantId, userId, q, {
                type: type,
                maxResults,
                useCache: useCache !== false,
                forceRefresh,
            });
            return reply.code(200).send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
                operation: 'web-search.search',
                tenantId: request.user?.tenantId,
            });
            return reply.code(500).send({ error: errorMessage || 'Internal server error' });
        }
    });
    /**
     * POST /api/v1/search/deep
     * Execute a web search with deep scraping
     */
    server.post('/search/deep', { preHandler: requireAuth, schema: { description: 'Execute a web search with deep scraping' } }, async (request, reply) => {
        try {
            const { tenantId, userId } = request.user;
            const { q, type, maxResults, maxPages } = request.body;
            // Validate query
            if (!q || q.length < 2) {
                return reply.code(400).send({ error: 'Query must be at least 2 characters' });
            }
            const result = await controller.deepSearch(tenantId, userId, q, {
                type: type,
                maxResults,
                maxPages: Math.min(maxPages || 3, 5), // Limit to 5 pages
            });
            return reply.code(200).send(result);
        }
        catch (error) {
            monitoring.trackError('deep-search-error', error);
            return reply.code(500).send({ error: error.message });
        }
    });
    /**
     * GET /api/v1/search/history
     * Get search history for current tenant
     */
    server.get('/search/history', { preHandler: requireAuth, schema: { description: 'Get search history' } }, async (request, reply) => {
        try {
            const { tenantId } = request.user;
            const { limit, offset } = request.query;
            const result = await controller.getSearchHistory(tenantId, {
                limit: limit ? parseInt(limit, 10) : 20,
                offset: offset ? parseInt(offset, 10) : 0,
            });
            return reply.code(200).send(result);
        }
        catch (error) {
            monitoring.trackError('search-history-error', error);
            return reply.code(500).send({ error: error.message });
        }
    });
    /**
     * GET /api/v1/search/stats
     * Get search statistics for current tenant
     */
    server.get('/search/stats', { preHandler: requireAuth, schema: { description: 'Get search statistics' } }, async (request, reply) => {
        try {
            const { tenantId } = request.user;
            const result = await controller.getStatistics(tenantId);
            return reply.code(200).send(result);
        }
        catch (error) {
            monitoring.trackError('search-stats-error', error);
            return reply.code(500).send({ error: error.message });
        }
    });
    /**
     * POST /api/v1/search/cleanup
     * Manually cleanup expired search results
     */
    server.post('/search/cleanup', { preHandler: requireAuth, schema: { description: 'Cleanup expired searches' } }, async (request, reply) => {
        try {
            const { tenantId } = request.user;
            const result = await controller.cleanupExpiredSearches(tenantId);
            return reply.code(200).send(result);
        }
        catch (error) {
            monitoring.trackError('search-cleanup-error', error);
            return reply.code(500).send({ error: error.message });
        }
    });
    // ========================================================================
    // WebSocket Support for Progress Tracking
    // ========================================================================
    /**
     * WebSocket /api/v1/search/deep/ws
     * WebSocket endpoint for deep search with real-time progress tracking
     */
    server.register(async (app) => {
        app.get('/search/deep/ws', { preHandler: requireAuth, websocket: true }, async (socket, request) => {
            try {
                const { tenantId, userId } = request.user;
                const { q, maxPages } = request.query;
                if (!q) {
                    socket.send(JSON.stringify({ error: 'Query parameter required' }));
                    socket.close();
                    return;
                }
                // Subscribe to progress updates
                await controller.deepSearchWithProgress(tenantId, userId, q, {
                    maxPages: Math.min(parseInt(maxPages || '3', 10), 5),
                }, (progress) => {
                    socket.send(JSON.stringify({ type: 'progress', data: progress }));
                }, (result) => {
                    socket.send(JSON.stringify({ type: 'complete', data: result }));
                    socket.close();
                }, (error) => {
                    socket.send(JSON.stringify({ type: 'error', error: error.message }));
                    socket.close();
                });
            }
            catch (error) {
                monitoring.trackError('websocket-error', error);
                socket.send(JSON.stringify({ error: error.message }));
                socket.close();
            }
        });
    });
    // ========================================================================
    // Admin Endpoints
    // ========================================================================
    /**
     * GET /api/v1/search/admin/status
     * Get web search module status (admin only)
     */
    server.get('/search/admin/status', { preHandler: requireAuth, schema: { description: 'Get web search status (admin only)' } }, async (request, reply) => {
        try {
            const { role } = request.user;
            if (role !== 'admin') {
                return reply.code(403).send({ error: 'Admin access required' });
            }
            const status = webSearchModule.getStatus();
            const verification = await webSearchModule.verify();
            return reply.code(200).send({
                status,
                verification,
            });
        }
        catch (error) {
            monitoring.trackError('status-error', error);
            return reply.code(500).send({ error: error.message });
        }
    });
    monitoring.trackEvent('web-search-routes-registered');
}
export default registerWebSearchRoutes;
//# sourceMappingURL=web-search.routes.js.map
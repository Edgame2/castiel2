/**
 * Web Search Routes
 * REST API endpoints for web search and deep search functionality
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { requireAuth } from '../middleware/authorization.js';
import { WebSearchController } from '../controllers/web-search.controller.js';
import type { WebSearchModule } from '../services/web-search/module.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';

/**
 * Query and response types
 */
interface SearchQuery {
    q: string;
    type?: 'web' | 'news' | 'academic';
    maxResults?: number;
    useCache?: boolean;
    forceRefresh?: boolean;
}

interface DeepSearchQuery extends SearchQuery {
    deepSearch?: boolean;
    maxPages?: number;
}

interface SearchResponse {
    search: any;
    deepSearch?: {
        pages: any[];
        totalCost: number;
        duration: number;
    };
    costBreakdown: {
        searchCost: number;
        deepSearchCost?: number;
        totalCost: number;
    };
}

/**
 * Register web search routes
 */
export async function registerWebSearchRoutes(
    server: FastifyInstance,
    monitoring: IMonitoringProvider,
    webSearchModule: WebSearchModule
): Promise<void> {
    const controller = new WebSearchController(webSearchModule, monitoring);

    // ========================================================================
    // Search Endpoints
    // ========================================================================

    /**
     * POST /api/v1/search
     * Execute a web search
     */
    server.post<{ Body: SearchQuery; Reply: SearchResponse }>(
        '/search',
        { preHandler: requireAuth, schema: { description: 'Execute a web search' } },
        async (request: FastifyRequest<{ Body: SearchQuery }>, reply: FastifyReply) => {
            try {
                const authRequest = request as AuthenticatedRequest;
                const tenantId = authRequest.user?.tenantId;
                const userId = authRequest.user?.id;
                
                if (!tenantId || !userId) {
                    return reply.code(401).send({ error: 'Unauthorized: Missing tenant or user context' });
                }
                const { q, type, maxResults, useCache, forceRefresh } = request.body;

                // Validate query
                if (!q || q.length < 2) {
                    return reply.code(400).send({ error: 'Query must be at least 2 characters' });
                }

                const result = await controller.search(tenantId, userId, q, {
                    type: type as 'web' | 'news' | 'academic',
                    maxResults,
                    useCache: useCache !== false,
                    forceRefresh,
                });

                return reply.code(200).send(result);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
                    operation: 'web-search.search',
                    tenantId: (request as AuthenticatedRequest).user?.tenantId,
                });
                return reply.code(500).send({ error: errorMessage || 'Internal server error' });
            }
        }
    );

    /**
     * POST /api/v1/search/deep
     * Execute a web search with deep scraping
     */
    server.post<{ Body: DeepSearchQuery; Reply: SearchResponse }>(
        '/search/deep',
        { preHandler: requireAuth, schema: { description: 'Execute a web search with deep scraping' } },
        async (request: FastifyRequest<{ Body: DeepSearchQuery }>, reply: FastifyReply) => {
            try {
                const authRequest = request as AuthenticatedRequest;
                const tenantId = authRequest.user?.tenantId;
                const userId = authRequest.user?.id;
                
                if (!tenantId || !userId) {
                    return reply.code(401).send({ error: 'Unauthorized: Missing tenant or user context' });
                }
                const { q, type, maxResults, maxPages } = request.body;

                // Validate query
                if (!q || q.length < 2) {
                    return reply.code(400).send({ error: 'Query must be at least 2 characters' });
                }

                const result = await controller.deepSearch(tenantId, userId, q, {
                    type: type as 'web' | 'news' | 'academic',
                    maxResults,
                    maxPages: Math.min(maxPages || 3, 5), // Limit to 5 pages
                });

                return reply.code(200).send(result);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
                    operation: 'web-search.deep-search',
                });
                return reply.code(500).send({ error: errorMessage || 'Internal server error' });
            }
        }
    );

    /**
     * GET /api/v1/search/history
     * Get search history for current tenant
     */
    server.get(
        '/search/history',
        { preHandler: requireAuth, schema: { description: 'Get search history' } },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const authRequest = request as AuthenticatedRequest;
                const tenantId = authRequest.user?.tenantId;
                
                if (!tenantId) {
                    return reply.code(401).send({ error: 'Unauthorized: Missing tenant context' });
                }
                
                const { limit, offset } = request.query as { limit?: string; offset?: string };

                const result = await controller.getSearchHistory(tenantId, {
                    limit: limit ? parseInt(limit, 10) : 20,
                    offset: offset ? parseInt(offset, 10) : 0,
                });

                return reply.code(200).send(result);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
                    operation: 'web-search.get-history',
                });
                return reply.code(500).send({ error: errorMessage || 'Internal server error' });
            }
        }
    );

    /**
     * GET /api/v1/search/stats
     * Get search statistics for current tenant
     */
    server.get(
        '/search/stats',
        { preHandler: requireAuth, schema: { description: 'Get search statistics' } },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const authRequest = request as AuthenticatedRequest;
                const tenantId = authRequest.user?.tenantId;
                
                if (!tenantId) {
                    return reply.code(401).send({ error: 'Unauthorized: Missing tenant context' });
                }

                const result = await controller.getStatistics(tenantId);

                return reply.code(200).send(result);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
                    operation: 'web-search.get-stats',
                });
                return reply.code(500).send({ error: errorMessage || 'Internal server error' });
            }
        }
    );

    /**
     * POST /api/v1/search/cleanup
     * Manually cleanup expired search results
     */
    server.post(
        '/search/cleanup',
        { preHandler: requireAuth, schema: { description: 'Cleanup expired searches' } },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const authRequest = request as AuthenticatedRequest;
                const tenantId = authRequest.user?.tenantId;
                
                if (!tenantId) {
                    return reply.code(401).send({ error: 'Unauthorized: Missing tenant context' });
                }

                const result = await controller.cleanupExpiredSearches(tenantId);

                return reply.code(200).send(result);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
                    operation: 'web-search.cleanup',
                });
                return reply.code(500).send({ error: errorMessage || 'Internal server error' });
            }
        }
    );

    // ========================================================================
    // WebSocket Support for Progress Tracking
    // ========================================================================

    /**
     * WebSocket /api/v1/search/deep/ws
     * WebSocket endpoint for deep search with real-time progress tracking
     */
    server.register(async (app) => {
        app.get(
            '/search/deep/ws',
            { preHandler: requireAuth, websocket: true },
            async (socket, request: FastifyRequest) => {
                try {
                    const authRequest = request as AuthenticatedRequest;
                    const tenantId = authRequest.user?.tenantId;
                    const userId = authRequest.user?.id;
                    
                    if (!tenantId || !userId) {
                        socket.send(JSON.stringify({ error: 'Unauthorized: Missing tenant or user context' }));
                        socket.close();
                        return;
                    }
                    const { q, maxPages } = request.query as { q?: string; maxPages?: string };

                    if (!q) {
                        socket.send(JSON.stringify({ error: 'Query parameter required' }));
                        socket.close();
                        return;
                    }

                    // Subscribe to progress updates
                    await controller.deepSearchWithProgress(
                        tenantId,
                        userId,
                        q,
                        {
                            maxPages: Math.min(parseInt(maxPages || '3', 10), 5),
                        },
                        (progress) => {
                            socket.send(JSON.stringify({ type: 'progress', data: progress }));
                        },
                        (result) => {
                            socket.send(JSON.stringify({ type: 'complete', data: result }));
                            socket.close();
                        },
                        (error) => {
                            socket.send(JSON.stringify({ type: 'error', error: error.message }));
                            socket.close();
                        }
                    );
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
                        operation: 'web-search.websocket',
                    });
                    socket.send(JSON.stringify({ error: errorMessage }));
                    socket.close();
                }
            }
        );
    });

    // ========================================================================
    // Admin Endpoints
    // ========================================================================

    /**
     * GET /api/v1/search/admin/status
     * Get web search module status (admin only)
     */
    server.get(
        '/search/admin/status',
        { preHandler: requireAuth, schema: { description: 'Get web search status (admin only)' } },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const authRequest = request as AuthenticatedRequest;
                const roles = authRequest.user?.roles;
                
                if (!roles || !roles.includes('admin')) {
                    return reply.code(403).send({ error: 'Admin access required' });
                }

                const status = webSearchModule.getStatus();
                const verification = await webSearchModule.verify();

                return reply.code(200).send({
                    status,
                    verification,
                });
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
                    operation: 'web-search.admin-status',
                });
                return reply.code(500).send({ error: errorMessage || 'Internal server error' });
            }
        }
    );

    monitoring.trackEvent('web-search-routes-registered');
}

export default registerWebSearchRoutes;

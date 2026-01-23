/**
 * Vector Search Controller
 * Handles REST API endpoints for semantic and hybrid search
 */
import { isGlobalAdmin } from '../middleware/authorization.js';
import { getUser } from '../middleware/authenticate.js';
const VECTOR_SEARCH_ADMIN_ROLES = ['admin', 'owner'];
/**
 * Vector search controller
 */
export class VectorSearchController {
    vectorSearchService;
    monitoring;
    cacheService;
    uiService;
    analyticsService;
    constructor(vectorSearchService, monitoring, cacheService, uiService, analyticsService) {
        this.vectorSearchService = vectorSearchService;
        this.monitoring = monitoring;
        this.cacheService = cacheService;
        this.uiService = uiService;
        this.analyticsService = analyticsService;
    }
    /**
     * POST /api/v1/search/vector - Semantic vector search
     */
    async semanticSearch(request, reply) {
        const startTime = Date.now();
        const req = request;
        try {
            // Validate authentication
            if (!req.user) {
                return reply.status(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const searchRequest = request.body;
            // Validate required fields
            if (!searchRequest.query || searchRequest.query.trim().length === 0) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Query is required and cannot be empty',
                });
            }
            // Validate filter (must have tenantId)
            if (!searchRequest.filter || !searchRequest.filter.tenantId) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Filter with tenantId is required',
                });
            }
            // Ensure user can only search within their tenant
            if (searchRequest.filter.tenantId !== req.user.tenantId) {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'Cannot search in another tenant',
                });
            }
            // Validate topK
            if (searchRequest.topK !== undefined) {
                if (searchRequest.topK < 1 || searchRequest.topK > 100) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'topK must be between 1 and 100',
                    });
                }
            }
            // Validate minScore
            if (searchRequest.minScore !== undefined) {
                if (searchRequest.minScore < 0 || searchRequest.minScore > 1) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'minScore must be between 0 and 1',
                    });
                }
            }
            // Perform semantic search
            const response = await this.vectorSearchService.semanticSearch(searchRequest, req.user.id);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('vsearch-api-semantic', 1, {
                tenantId: req.user.tenantId,
                userId: req.user.id,
                resultCount: response.results.length,
                fromCache: response.fromCache,
                duration,
            });
            // Record search history (non-blocking)
            if (this.uiService) {
                this.uiService.recordSearchHistory(req.user.id, req.user.tenantId, searchRequest.query, {
                    filters: searchRequest.filter,
                    resultCount: response.results.length,
                    shardTypeId: searchRequest.filter?.shardTypeId,
                    topK: searchRequest.topK,
                    minScore: searchRequest.minScore,
                }).catch(error => {
                    // Non-critical - log but don't fail the request
                    this.monitoring.trackException(error, {
                        operation: 'vector-search.record-history',
                        userId: req.user.id,
                    });
                });
                // Track popular search terms (non-blocking)
                this.uiService.trackPopularSearch(req.user.tenantId, searchRequest.query, {
                    shardTypeId: searchRequest.filter?.shardTypeId,
                }).catch(error => {
                    // Non-critical
                    this.monitoring.trackException(error, {
                        operation: 'vector-search.track-popular',
                        userId: req.user.id,
                    });
                });
            }
            // Record search analytics (non-blocking)
            if (this.analyticsService) {
                this.analyticsService.recordSearchEvent({
                    userId: req.user.id,
                    tenantId: req.user.tenantId,
                    query: searchRequest.query,
                    filters: searchRequest.filter,
                    shardTypeId: searchRequest.filter?.shardTypeId,
                    topK: searchRequest.topK,
                    minScore: searchRequest.minScore,
                    similarityMetric: searchRequest.similarityMetric,
                    resultCount: response.results.length,
                    hasResults: response.results.length > 0,
                    executionTimeMs: duration,
                    fromCache: response.fromCache,
                    timestamp: new Date(),
                }).catch(error => {
                    // Non-critical
                    this.monitoring.trackException(error, {
                        operation: 'vector-search.record-analytics',
                        userId: req.user.id,
                    });
                });
            }
            return reply.status(200).send(response);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackException(error, {
                component: 'VectorSearchController',
                operation: 'semanticSearch',
                userId: req.user?.id,
                tenantId: req.user?.tenantId,
                duration,
            });
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to perform semantic search',
                details: error instanceof Error ? error.message : 'Unknown error',
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
    /**
     * POST /api/v1/search/hybrid - Hybrid search (keyword + vector)
     */
    async hybridSearch(request, reply) {
        const startTime = Date.now();
        const req = request;
        try {
            // Validate authentication
            if (!req.user) {
                return reply.status(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const searchRequest = request.body;
            // Validate required fields
            if (!searchRequest.query || searchRequest.query.trim().length === 0) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Query is required and cannot be empty',
                });
            }
            // Validate filter (must have tenantId)
            if (!searchRequest.filter || !searchRequest.filter.tenantId) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Filter with tenantId is required',
                });
            }
            // Ensure user can only search within their tenant
            if (searchRequest.filter.tenantId !== req.user.tenantId) {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'Cannot search in another tenant',
                });
            }
            // Validate topK
            if (searchRequest.topK !== undefined) {
                if (searchRequest.topK < 1 || searchRequest.topK > 100) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'topK must be between 1 and 100',
                    });
                }
            }
            // Validate minScore
            if (searchRequest.minScore !== undefined) {
                if (searchRequest.minScore < 0 || searchRequest.minScore > 1) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'minScore must be between 0 and 1',
                    });
                }
            }
            // Validate weights
            if (searchRequest.keywordWeight !== undefined) {
                if (searchRequest.keywordWeight < 0 || searchRequest.keywordWeight > 1) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'keywordWeight must be between 0 and 1',
                    });
                }
            }
            if (searchRequest.vectorWeight !== undefined) {
                if (searchRequest.vectorWeight < 0 || searchRequest.vectorWeight > 1) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'vectorWeight must be between 0 and 1',
                    });
                }
            }
            // Validate weights sum to ~1
            const keywordWeight = searchRequest.keywordWeight || 0.3;
            const vectorWeight = searchRequest.vectorWeight || 0.7;
            const weightSum = keywordWeight + vectorWeight;
            if (Math.abs(weightSum - 1.0) > 0.01) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'keywordWeight + vectorWeight must sum to 1.0',
                });
            }
            // Perform hybrid search
            const response = await this.vectorSearchService.hybridSearch(searchRequest, req.user.id);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('vsearch-api-hybrid', 1, {
                tenantId: req.user.tenantId,
                userId: req.user.id,
                resultCount: response.results.length,
                fromCache: response.fromCache,
                duration,
            });
            return reply.status(200).send(response);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackException(error, {
                component: 'VectorSearchController',
                operation: 'hybridSearch',
                userId: req.user?.id,
                tenantId: req.user?.tenantId,
                duration,
            });
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to perform hybrid search',
            });
        }
    }
    /**
     * GET /api/v1/search/stats - Get search statistics (admin only)
     */
    async getStats(request, reply) {
        const req = request;
        try {
            // Validate authentication
            if (!req.user) {
                return reply.status(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            if (!this.hasAdminRole(req.user)) {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'Admin role required to view stats',
                });
            }
            const serviceStats = this.vectorSearchService.getStats();
            // Get cache stats if available
            let cacheStats = null;
            if (this.cacheService) {
                try {
                    cacheStats = await this.cacheService.getStats();
                }
                catch (error) {
                    this.monitoring.trackException(error, {
                        component: 'VectorSearchController',
                        operation: 'getStats.cache',
                    });
                    // Continue without cache stats
                }
            }
            return reply.status(200).send({
                ...serviceStats,
                cache: cacheStats,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchController',
                operation: 'getStats',
                userId: req.user?.id,
            });
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to get search statistics',
            });
        }
    }
    /**
     * POST /api/v1/search/vector/global - Global vector search (Super Admin only)
     */
    async globalSearch(request, reply) {
        const startTime = Date.now();
        const req = request;
        try {
            // Validate authentication
            if (!req.user) {
                return reply.status(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            // Require Super Admin
            const user = getUser(request);
            if (!isGlobalAdmin(user)) {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'Global search requires Super Admin privileges',
                });
            }
            const searchRequest = request.body;
            // Validate required fields
            if (!searchRequest.query || searchRequest.query.trim().length === 0) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Query is required and cannot be empty',
                });
            }
            // Validate topK
            if (searchRequest.topK !== undefined) {
                if (searchRequest.topK < 1 || searchRequest.topK > 200) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'topK must be between 1 and 200 for global search',
                    });
                }
            }
            // Validate minScore
            if (searchRequest.minScore !== undefined) {
                if (searchRequest.minScore < 0 || searchRequest.minScore > 1) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'minScore must be between 0 and 1',
                    });
                }
            }
            // Perform global search
            const response = await this.vectorSearchService.globalSearch(searchRequest, req.user.id);
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('vsearch-api-global', 1, {
                userId: req.user.id,
                resultCount: response.results.length,
                tenantCount: response.metadata?.tenantsSearched?.length || 0,
                duration,
            });
            return reply.status(200).send(response);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchController',
                operation: 'globalSearch',
                userId: req.user?.id,
            });
            return reply.status(error.statusCode || 500).send({
                error: error.name || 'Internal Server Error',
                message: error.message || 'Failed to perform global search',
            });
        }
    }
    hasAdminRole(user) {
        if (!user || !user.roles || user.roles.length === 0) {
            return false;
        }
        return VECTOR_SEARCH_ADMIN_ROLES.some((role) => user.roles.includes(role));
    }
}
//# sourceMappingURL=vector-search.controller.js.map
/**
 * Vector Search Controller
 * Handles REST API endpoints for semantic and hybrid search
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { VectorSearchRequest, HybridSearchRequest } from '../types/vector-search.types.js';
import { VectorSearchService } from '../services/vector-search.service.js';
import { VectorSearchCacheService } from '../services/vector-search-cache.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Vector search controller
 */
export declare class VectorSearchController {
    private readonly vectorSearchService;
    private readonly monitoring;
    private readonly cacheService?;
    private readonly uiService?;
    private readonly analyticsService?;
    constructor(vectorSearchService: VectorSearchService, monitoring: IMonitoringProvider, cacheService?: VectorSearchCacheService | undefined, uiService?: import("../services/vector-search-ui.service.js").VectorSearchUIService | undefined, analyticsService?: import("../services/search-analytics.service.js").SearchAnalyticsService | undefined);
    /**
     * POST /api/v1/search/vector - Semantic vector search
     */
    semanticSearch(request: FastifyRequest<{
        Body: VectorSearchRequest;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/search/hybrid - Hybrid search (keyword + vector)
     */
    hybridSearch(request: FastifyRequest<{
        Body: HybridSearchRequest;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/search/stats - Get search statistics (admin only)
     */
    getStats(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/search/vector/global - Global vector search (Super Admin only)
     */
    globalSearch(request: FastifyRequest<{
        Body: Omit<VectorSearchRequest, 'filter'> & {
            filter?: Omit<VectorSearchRequest['filter'], 'tenantId'>;
        };
    }>, reply: FastifyReply): Promise<void>;
    private hasAdminRole;
}
//# sourceMappingURL=vector-search.controller.d.ts.map
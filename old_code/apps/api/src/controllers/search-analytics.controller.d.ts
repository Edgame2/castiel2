/**
 * Search Analytics Controller
 *
 * Handles HTTP requests for search analytics
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { SearchAnalyticsService } from '../services/search-analytics.service.js';
export declare class SearchAnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: SearchAnalyticsService);
    /**
     * GET /api/v1/search/analytics/query
     * Get analytics for a specific query
     */
    getQueryAnalytics(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/search/analytics/zero-results
     * Get zero-result queries
     */
    getZeroResultQueries(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/search/analytics/satisfaction
     * Get satisfaction metrics
     */
    getSatisfactionMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/search/analytics/dashboard
     * Get popular terms dashboard
     */
    getDashboard(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/search/analytics/interaction
     * Record a user interaction with search results
     */
    recordInteraction(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=search-analytics.controller.d.ts.map
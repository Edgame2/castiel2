/**
 * Project Analytics Controller
 *
 * Handles HTTP requests for project analytics
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProjectAnalyticsService } from '../services/project-analytics.service.js';
export declare class ProjectAnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: ProjectAnalyticsService);
    /**
     * GET /api/v1/projects/:projectId/analytics
     * Get comprehensive analytics for a project
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic.
     */
    getAnalytics(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/projects/:projectId/analytics/health
     * Get health score for a project
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic.
     */
    getHealthScore(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/projects/:projectId/analytics/completion
     * Get predictive completion for a project
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic.
     */
    getPredictiveCompletion(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/projects/:projectId/analytics/optimization
     * Get resource optimization recommendations for a project
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic.
     */
    getOptimization(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=project-analytics.controller.d.ts.map
/**
 * Project Analytics Controller
 *
 * Handles HTTP requests for project analytics
 */
import { getUser } from '../middleware/authenticate.js';
import { AppError, NotFoundError } from '../middleware/error-handler.js';
export class ProjectAnalyticsController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    /**
     * GET /api/v1/projects/:projectId/analytics
     * Get comprehensive analytics for a project
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic.
     */
    async getAnalytics(request, reply) {
        // Fastify schema validation ensures projectId is present
        const params = request.params;
        const user = getUser(request); // Throws if not authenticated
        const query = request.query;
        const analyticsRequest = {
            projectId: params.projectId,
            tenantId: user.tenantId,
            includeHistory: query.includeHistory !== 'false',
            includePredictions: query.includePredictions !== 'false',
            includeOptimization: query.includeOptimization !== 'false',
        };
        try {
            request.log.info({
                projectId: params.projectId,
                tenantId: user.tenantId,
                options: analyticsRequest,
            }, 'Fetching project analytics');
            const analytics = await this.analyticsService.getProjectAnalytics(analyticsRequest);
            request.log.info({
                projectId: params.projectId,
                hasData: !!analytics,
            }, 'Project analytics fetched successfully');
            reply.status(200).send(analytics);
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Check for "not found" errors and transform to NotFoundError
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage?.toLowerCase().includes('not found')) {
                throw new NotFoundError(errorMessage || 'Project not found');
            }
            // Log and transform unknown errors
            request.log.error({ error, projectId: params.projectId, tenantId: user.tenantId }, 'Failed to get project analytics');
            throw new AppError('Failed to get project analytics', 500);
        }
    }
    /**
     * GET /api/v1/projects/:projectId/analytics/health
     * Get health score for a project
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic.
     */
    async getHealthScore(request, reply) {
        const user = getUser(request); // Throws if not authenticated
        // Fastify schema validation ensures projectId is present
        const params = request.params;
        try {
            // Get project shard using service method
            const project = await this.analyticsService.getProject(params.projectId, user.tenantId);
            const healthScore = await this.analyticsService.calculateHealthScore(project);
            reply.status(200).send(healthScore);
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Check for "not found" errors and transform to NotFoundError
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage?.toLowerCase().includes('not found')) {
                throw new NotFoundError(errorMessage || 'Project not found');
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to get health score');
            throw new AppError('Failed to get health score', 500);
        }
    }
    /**
     * GET /api/v1/projects/:projectId/analytics/completion
     * Get predictive completion for a project
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic.
     */
    async getPredictiveCompletion(request, reply) {
        const user = getUser(request); // Throws if not authenticated
        // Fastify schema validation ensures projectId is present
        const params = request.params;
        try {
            // Get project shard using service method
            const project = await this.analyticsService.getProject(params.projectId, user.tenantId);
            const completion = await this.analyticsService.calculatePredictiveCompletion(project);
            reply.status(200).send(completion);
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Check for "not found" errors and transform to NotFoundError
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage?.toLowerCase().includes('not found')) {
                throw new NotFoundError(errorMessage || 'Project not found');
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to get predictive completion');
            throw new AppError('Failed to get predictive completion', 500);
        }
    }
    /**
     * GET /api/v1/projects/:projectId/analytics/optimization
     * Get resource optimization recommendations for a project
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic.
     */
    async getOptimization(request, reply) {
        const user = getUser(request); // Throws if not authenticated
        // Fastify schema validation ensures projectId is present
        const params = request.params;
        try {
            // Get project shard using service method
            const project = await this.analyticsService.getProject(params.projectId, user.tenantId);
            const optimization = await this.analyticsService.calculateResourceOptimization(project);
            reply.status(200).send(optimization);
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Check for "not found" errors and transform to NotFoundError
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage?.toLowerCase().includes('not found')) {
                throw new NotFoundError(errorMessage || 'Project not found');
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to get optimization');
            throw new AppError('Failed to get optimization', 500);
        }
    }
}
//# sourceMappingURL=project-analytics.controller.js.map
/**
 * Project Analytics Routes
 *
 * API routes for project analytics
 */
import { requireAuth } from '../middleware/authorization.js';
export async function registerProjectAnalyticsRoutes(server, controller) {
    const authDecorator = server.authenticate;
    if (!authDecorator) {
        server.log.warn('⚠️ Project Analytics routes not registered - authentication decorator missing');
        return;
    }
    const authGuards = [authDecorator, requireAuth()];
    // Get comprehensive analytics
    server.get('/api/v1/projects/:projectId/analytics', {
        onRequest: authGuards,
        schema: {
            description: 'Get comprehensive analytics for a project',
            tags: ['Project Analytics'],
            params: {
                type: 'object',
                required: ['projectId'],
                properties: {
                    projectId: { type: 'string' },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    includeHistory: {
                        type: 'string',
                        enum: ['true', 'false'],
                        description: 'Include health score (default: true)',
                    },
                    includePredictions: {
                        type: 'string',
                        enum: ['true', 'false'],
                        description: 'Include predictive completion (default: true)',
                    },
                    includeOptimization: {
                        type: 'string',
                        enum: ['true', 'false'],
                        description: 'Include resource optimization (default: true)',
                    },
                },
            },
            response: {
                200: {
                    description: 'Project analytics',
                    type: 'object',
                },
            },
        },
    }, (request, reply) => controller.getAnalytics(request, reply));
    // Get health score
    server.get('/api/v1/projects/:projectId/analytics/health', {
        onRequest: authGuards,
        schema: {
            description: 'Get health score for a project',
            tags: ['Project Analytics'],
            params: {
                type: 'object',
                required: ['projectId'],
                properties: {
                    projectId: { type: 'string' },
                },
            },
            response: {
                200: {
                    description: 'Project health score',
                    type: 'object',
                },
            },
        },
    }, (request, reply) => controller.getHealthScore(request, reply));
    // Get predictive completion
    server.get('/api/v1/projects/:projectId/analytics/completion', {
        onRequest: authGuards,
        schema: {
            description: 'Get predictive completion for a project',
            tags: ['Project Analytics'],
            params: {
                type: 'object',
                required: ['projectId'],
                properties: {
                    projectId: { type: 'string' },
                },
            },
            response: {
                200: {
                    description: 'Predictive completion',
                    type: 'object',
                },
            },
        },
    }, (request, reply) => controller.getPredictiveCompletion(request, reply));
    // Get resource optimization
    server.get('/api/v1/projects/:projectId/analytics/optimization', {
        onRequest: authGuards,
        schema: {
            description: 'Get resource optimization recommendations for a project',
            tags: ['Project Analytics'],
            params: {
                type: 'object',
                required: ['projectId'],
                properties: {
                    projectId: { type: 'string' },
                },
            },
            response: {
                200: {
                    description: 'Resource optimization',
                    type: 'object',
                },
            },
        },
    }, (request, reply) => controller.getOptimization(request, reply));
    server.log.info('✅ Project Analytics routes registered');
}
//# sourceMappingURL=project-analytics.routes.js.map
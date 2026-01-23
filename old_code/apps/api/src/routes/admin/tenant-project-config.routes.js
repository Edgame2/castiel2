/**
 * Admin Routes: Tenant Project Configuration
 * Super admin management of global and per-tenant project settings
 */
import { requireRole } from '../middleware/authorization.js';
export async function tenantProjectConfigRoutes(app) {
    const configService = app.tenantProjectConfigService;
    const monitoringService = app.performanceMonitoringService;
    const catalogService = app.aiChatCatalogService;
    if (!configService || !monitoringService || !catalogService) {
        app.log.warn('⚠️  Tenant project config routes not fully initialized - some services missing');
        return;
    }
    /**
     * GET /api/v1/admin/project-config/global
     * Get global project configuration
     */
    app.get('/api/v1/admin/project-config/global', {
        preHandler: requireRole(['super-admin']),
        schema: {
            description: 'Get global project configuration',
            tags: ['Admin', 'Project Configuration'],
        },
    }, async (request, reply) => {
        const config = await configService.getSystemConfig();
        return reply.send({ data: config });
    });
    /**
     * PATCH /api/v1/admin/project-config/global
     * Update global project configuration
     */
    app.patch('/api/v1/admin/project-config/global', {
        preHandler: requireRole(['super-admin']),
        schema: {
            description: 'Update global project configuration',
            tags: ['Admin', 'Project Configuration'],
            body: {
                type: 'object',
                properties: {
                    defaultMaxLinkedShards: { type: 'number' },
                    defaultChatTokenLimit: { type: 'number' },
                    defaultRecommendationConfig: { type: 'object' },
                    performanceMonitoringEnabled: { type: 'boolean' },
                    anomalyDetectionStdDevThreshold: { type: 'number' },
                },
            },
        },
    }, async (request, reply) => {
        const userId = request.user?.id || request.user?.id;
        const config = await configService.updateSystemConfig(request.body, userId);
        return reply.send({ data: config });
    });
    /**
     * GET /api/v1/admin/tenants/:tenantId/project-config
     * Get tenant project configuration
     */
    app.get('/api/v1/admin/tenants/:tenantId/project-config', {
        preHandler: requireRole(['super-admin']),
        schema: {
            description: 'Get tenant project configuration',
            tags: ['Admin', 'Project Configuration'],
        },
    }, async (request, reply) => {
        const config = await configService.getTenantConfig(request.params.tenantId);
        return reply.send({ data: config });
    });
    /**
     * PATCH /api/v1/admin/tenants/:tenantId/project-config
     * Update tenant project configuration
     */
    app.patch('/api/v1/admin/tenants/:tenantId/project-config', {
        preHandler: requireRole(['super-admin']),
        schema: {
            description: 'Update tenant project configuration',
            tags: ['Admin', 'Project Configuration'],
        },
    }, async (request, reply) => {
        const userId = request.user?.id || request.user?.id;
        const config = await configService.updateTenantConfig(request.params.tenantId, request.body, userId);
        return reply.status(200).send({ data: config });
    });
    /**
     * DELETE /api/v1/admin/tenants/:tenantId/project-config
     * Reset tenant config to global defaults
     */
    app.delete('/api/v1/admin/tenants/:tenantId/project-config', {
        preHandler: requireRole(['super-admin']),
        schema: {
            description: 'Reset tenant project configuration to global defaults',
            tags: ['Admin', 'Project Configuration'],
        },
    }, async (request, reply) => {
        const userId = request.user?.id || request.user?.id;
        const config = await configService.resetToDefaults(request.params.tenantId, userId);
        return reply.send({ data: config });
    });
    /**
     * GET /api/v1/admin/project-chat-questions
     * Get all chat questions
     */
    app.get('/api/v1/admin/project-chat-questions', {
        preHandler: requireRole(['super-admin']),
        schema: {
            description: 'Get all project chat questions',
            tags: ['Admin', 'Chat Catalog'],
        },
    }, async (request, reply) => {
        const questions = await catalogService.getAllQuestions();
        return reply.send({ data: questions });
    });
    /**
     * POST /api/v1/admin/project-chat-questions
     * Create new chat question
     */
    app.post('/api/v1/admin/project-chat-questions', {
        preHandler: requireRole(['super-admin']),
        schema: {
            description: 'Create new project chat question',
            tags: ['Admin', 'Chat Catalog'],
            body: {
                type: 'object',
                required: ['question', 'description', 'category', 'estimatedTokens'],
                properties: {
                    question: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    estimatedTokens: { type: 'number' },
                    isActive: { type: 'boolean' },
                    tags: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    }, async (request, reply) => {
        const userId = request.user?.id || request.user?.id;
        const question = await catalogService.createQuestion(request.body, userId);
        return reply.status(201).send({ data: question });
    });
    /**
     * PATCH /api/v1/admin/project-chat-questions/:questionId
     * Update chat question
     */
    app.patch('/api/v1/admin/project-chat-questions/:questionId', {
        preHandler: requireRole(['super-admin']),
        schema: {
            description: 'Update project chat question',
            tags: ['Admin', 'Chat Catalog'],
        },
    }, async (request, reply) => {
        const userId = request.user?.id || request.user?.id;
        const question = await catalogService.updateQuestion(request.params.questionId, request.body, userId);
        return reply.send({ data: question });
    });
    /**
     * DELETE /api/v1/admin/project-chat-questions/:questionId
     * Delete (deprecate) chat question
     */
    app.delete('/api/v1/admin/project-chat-questions/:questionId', {
        preHandler: requireRole(['super-admin']),
        schema: {
            description: 'Delete project chat question',
            tags: ['Admin', 'Chat Catalog'],
        },
    }, async (request, reply) => {
        const userId = request.user?.id || request.user?.id;
        await catalogService.deleteQuestion(request.params.questionId, userId);
        return reply.status(204).send();
    });
    /**
     * GET /api/v1/admin/project-performance/metrics
     * Get aggregated performance metrics
     */
    app.get('/api/v1/admin/project-performance/metrics', {
        preHandler: requireRole(['super-admin']),
        schema: {
            description: 'Get aggregated project performance metrics',
            tags: ['Admin', 'Performance'],
            querystring: {
                type: 'object',
                properties: {
                    tenantId: { type: 'string' },
                    timeRange: { type: 'number', description: 'Minutes' },
                },
            },
        },
    }, async (request, reply) => {
        const timeRange = request.query.timeRange ? parseInt(request.query.timeRange) : 60;
        const metrics = await monitoringService.getTenantMetricsAggregated(request.query.tenantId, timeRange);
        return reply.send({ data: metrics });
    });
    /**
     * GET /api/v1/admin/project-performance/anomalies
     * Detect performance anomalies
     */
    app.get('/api/v1/admin/project-performance/anomalies', {
        preHandler: requireRole(['super-admin']),
        schema: {
            description: 'Detect performance anomalies for a tenant',
            tags: ['Admin', 'Performance'],
            querystring: {
                type: 'object',
                required: ['tenantId'],
                properties: {
                    tenantId: { type: 'string' },
                    threshold: { type: 'number' },
                },
            },
        },
    }, async (request, reply) => {
        const threshold = request.query.threshold ? parseFloat(request.query.threshold) : 2.0;
        const anomalies = await monitoringService.detectAnomalies(request.query.tenantId, threshold);
        return reply.send({ data: anomalies });
    });
}
//# sourceMappingURL=tenant-project-config.routes.js.map
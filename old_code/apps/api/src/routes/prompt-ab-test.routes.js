/**
 * Prompt A/B Testing Routes
 * API endpoints for managing prompt A/B test experiments
 */
import { PromptABTestStatus, } from '../types/prompt-ab-test.types.js';
import { InsightType } from '../types/ai-insights/prompt.types.js';
import { getUser } from '../middleware/authenticate.js';
import { isGlobalAdmin } from '../middleware/authorization.js';
import { ForbiddenError } from '../middleware/error-handler.js';
import { z } from 'zod';
// ==========================================================================
// Schemas
// ==========================================================================
const CreateExperimentSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    hypothesis: z.string().optional(),
    insightType: z.nativeEnum(InsightType),
    slug: z.string().optional(),
    variants: z
        .array(z.object({
        variantId: z.string().min(1, 'Variant ID is required'),
        promptId: z.string().min(1, 'Prompt ID is required'),
        promptSlug: z.string().min(1, 'Prompt slug is required'),
        name: z.string().min(1, 'Variant name is required'),
        trafficPercentage: z.number().min(0).max(100),
        description: z.string().optional(),
    }))
        .min(2, 'At least 2 variants are required'),
    primaryMetric: z.enum(['quality', 'latency', 'satisfaction', 'cost', 'success_rate']),
    successCriteria: z
        .object({
        metric: z.string(),
        operator: z.enum(['>', '>=', '<', '<=']),
        threshold: z.number(),
        confidenceLevel: z.number().min(0).max(1),
    })
        .optional(),
    targeting: z
        .object({
        tenantIds: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
    })
        .optional(),
    minDuration: z.number().min(1).optional(),
    minSamplesPerVariant: z.number().min(1).optional(),
});
const UpdateExperimentSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    hypothesis: z.string().optional(),
    status: z.nativeEnum(PromptABTestStatus).optional(),
    variants: z
        .array(z.object({
        variantId: z.string().min(1),
        promptId: z.string().min(1),
        promptSlug: z.string().min(1),
        name: z.string().min(1),
        trafficPercentage: z.number().min(0).max(100),
        description: z.string().optional(),
    }))
        .optional(),
    trafficSplit: z.record(z.number().min(0).max(100)).optional(),
    successCriteria: z
        .object({
        metric: z.string(),
        operator: z.enum(['>', '>=', '<', '<=']),
        threshold: z.number(),
        confidenceLevel: z.number().min(0).max(1),
    })
        .optional(),
    targeting: z
        .object({
        tenantIds: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
    })
        .optional(),
    endDate: z.string().datetime().optional(),
});
// ==========================================================================
// Routes
// ==========================================================================
export async function promptABTestRoutes(fastify, options) {
    const { abTestService } = options;
    /**
     * POST /prompts/ab-tests
     * Create a new prompt A/B test experiment (Super Admin only)
     */
    fastify.post('/prompts/ab-tests', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Create a new prompt A/B test experiment',
            tags: ['Prompts - A/B Testing'],
        },
    }, async (request, reply) => {
        try {
            const user = getUser(request);
            if (!isGlobalAdmin(user)) {
                throw new ForbiddenError('Super Admin privileges required');
            }
            const body = CreateExperimentSchema.parse(request.body);
            const experiment = await abTestService.createExperiment(user.tenantId, body, user.id);
            return reply.status(201).send(experiment);
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to create A/B test experiment');
            return reply.status(400).send({
                error: 'Failed to create A/B test experiment',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * GET /prompts/ab-tests
     * List prompt A/B test experiments (Super Admin only)
     */
    fastify.get('/prompts/ab-tests', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'List prompt A/B test experiments',
            tags: ['Prompts - A/B Testing'],
            querystring: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: Object.values(PromptABTestStatus) },
                    insightType: { type: 'string', enum: Object.values(InsightType) },
                    limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
                    continuationToken: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const user = getUser(request);
            if (!isGlobalAdmin(user)) {
                throw new ForbiddenError('Super Admin privileges required');
            }
            const result = await abTestService.listExperiments(user.tenantId, {
                status: request.query.status,
                insightType: request.query.insightType,
                limit: request.query.limit,
                continuationToken: request.query.continuationToken,
            });
            return reply.send(result);
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to list A/B test experiments');
            return reply.status(500).send({
                error: 'Failed to list A/B test experiments',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * GET /prompts/ab-tests/:id
     * Get a specific prompt A/B test experiment (Super Admin only)
     */
    fastify.get('/prompts/ab-tests/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get a specific prompt A/B test experiment',
            tags: ['Prompts - A/B Testing'],
        },
    }, async (request, reply) => {
        try {
            const user = getUser(request);
            if (!isGlobalAdmin(user)) {
                throw new ForbiddenError('Super Admin privileges required');
            }
            const experiment = await abTestService.getExperiment(user.tenantId, request.params.id);
            if (!experiment) {
                return reply.status(404).send({ error: 'Experiment not found' });
            }
            return reply.send(experiment);
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to get A/B test experiment');
            return reply.status(500).send({
                error: 'Failed to get A/B test experiment',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * PATCH /prompts/ab-tests/:id
     * Update a prompt A/B test experiment (Super Admin only)
     */
    fastify.patch('/prompts/ab-tests/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Update a prompt A/B test experiment',
            tags: ['Prompts - A/B Testing'],
        },
    }, async (request, reply) => {
        try {
            const user = getUser(request);
            if (!isGlobalAdmin(user)) {
                throw new ForbiddenError('Super Admin privileges required');
            }
            const body = UpdateExperimentSchema.partial().parse(request.body);
            const experiment = await abTestService.updateExperiment(user.tenantId, request.params.id, body, user.id);
            return reply.send(experiment);
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to update A/B test experiment');
            return reply.status(400).send({
                error: 'Failed to update A/B test experiment',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * POST /prompts/ab-tests/:id/start
     * Start a prompt A/B test experiment (Super Admin only)
     */
    fastify.post('/prompts/ab-tests/:id/start', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Start a prompt A/B test experiment',
            tags: ['Prompts - A/B Testing'],
        },
    }, async (request, reply) => {
        try {
            const user = getUser(request);
            if (!isGlobalAdmin(user)) {
                throw new ForbiddenError('Super Admin privileges required');
            }
            const experiment = await abTestService.startExperiment(user.tenantId, request.params.id, user.id);
            return reply.send(experiment);
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to start A/B test experiment');
            return reply.status(400).send({
                error: 'Failed to start A/B test experiment',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * POST /prompts/ab-tests/:id/pause
     * Pause a prompt A/B test experiment (Super Admin only)
     */
    fastify.post('/prompts/ab-tests/:id/pause', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Pause a prompt A/B test experiment',
            tags: ['Prompts - A/B Testing'],
        },
    }, async (request, reply) => {
        try {
            const user = getUser(request);
            if (!isGlobalAdmin(user)) {
                throw new ForbiddenError('Super Admin privileges required');
            }
            const experiment = await abTestService.pauseExperiment(user.tenantId, request.params.id, user.id);
            return reply.send(experiment);
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to pause A/B test experiment');
            return reply.status(400).send({
                error: 'Failed to pause A/B test experiment',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * POST /prompts/ab-tests/:id/complete
     * Complete a prompt A/B test experiment and calculate results (Super Admin only)
     */
    fastify.post('/prompts/ab-tests/:id/complete', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Complete a prompt A/B test experiment and calculate results',
            tags: ['Prompts - A/B Testing'],
        },
    }, async (request, reply) => {
        try {
            const user = getUser(request);
            if (!isGlobalAdmin(user)) {
                throw new ForbiddenError('Super Admin privileges required');
            }
            const experiment = await abTestService.completeExperiment(user.tenantId, request.params.id, user.id);
            return reply.send(experiment);
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to complete A/B test experiment');
            return reply.status(400).send({
                error: 'Failed to complete A/B test experiment',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * GET /prompts/ab-tests/:id/results
     * Get detailed results for a prompt A/B test experiment (Super Admin only)
     */
    fastify.get('/prompts/ab-tests/:id/results', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get detailed results for a prompt A/B test experiment',
            tags: ['Prompts - A/B Testing'],
        },
    }, async (request, reply) => {
        try {
            const user = getUser(request);
            if (!isGlobalAdmin(user)) {
                throw new ForbiddenError('Super Admin privileges required');
            }
            const results = await abTestService.getResults(user.tenantId, request.params.id);
            return reply.send(results);
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to get A/B test results');
            return reply.status(500).send({
                error: 'Failed to get A/B test results',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * GET /prompts/ab-tests/:id/export
     * Export A/B test results as CSV or JSON (Super Admin only)
     */
    fastify.get('/prompts/ab-tests/:id/export', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Export A/B test results as CSV or JSON',
            tags: ['Prompts - A/B Testing'],
            querystring: {
                type: 'object',
                properties: {
                    format: { type: 'string', enum: ['csv', 'json'], default: 'json' },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const user = getUser(request);
            if (!isGlobalAdmin(user)) {
                throw new ForbiddenError('Super Admin privileges required');
            }
            const format = (request.query.format || 'json');
            const experiment = await abTestService.getExperiment(user.tenantId, request.params.id);
            if (!experiment) {
                return reply.status(404).send({ error: 'Experiment not found' });
            }
            const results = await abTestService.getResults(user.tenantId, request.params.id);
            if (format === 'csv') {
                // Generate CSV
                const rows = [];
                // Header row
                rows.push('Variant ID,Variant Name,Impressions,Success Rate (%),Avg Latency (ms),Avg Tokens,Total Cost ($),Positive Feedback,Negative Feedback');
                // Data rows for each variant
                for (const variant of experiment.variants) {
                    const variantResult = results.variants.find(v => v.variantId === variant.variantId);
                    const metrics = variantResult?.metrics || {
                        impressions: 0,
                        successfulResponses: 0,
                        failedResponses: 0,
                        averageTokens: 0,
                        averageLatencyMs: 0,
                        totalCost: 0,
                        positiveFeedback: 0,
                        negativeFeedback: 0,
                    };
                    const successRate = metrics.impressions > 0
                        ? ((metrics.successfulResponses / metrics.impressions) * 100).toFixed(2)
                        : '0.00';
                    rows.push([
                        variant.variantId,
                        variant.name,
                        metrics.impressions.toString(),
                        successRate,
                        Math.round(metrics.averageLatencyMs || 0).toString(),
                        Math.round(metrics.averageTokens || 0).toString(),
                        (metrics.totalCost || 0).toFixed(4),
                        (metrics.positiveFeedback || 0).toString(),
                        (metrics.negativeFeedback || 0).toString(),
                    ].join(','));
                }
                // Add summary row
                rows.push('');
                rows.push('Summary');
                rows.push(`Winner,${results.comparison?.winner || 'N/A'}`);
                if (results.comparison?.statisticalSignificance !== undefined) {
                    rows.push(`Statistical Significance,${results.comparison.statisticalSignificance.toFixed(4)}`);
                }
                if (results.comparison?.confidenceLevel !== undefined) {
                    rows.push(`Confidence Level,${results.comparison.confidenceLevel.toFixed(4)}`);
                }
                if (results.comparison?.improvement !== undefined) {
                    rows.push(`Improvement,${results.comparison.improvement.toFixed(2)}%`);
                }
                const totalImpressions = results.variants.reduce((sum, v) => sum + (v.metrics?.impressions || 0), 0);
                const totalCost = results.variants.reduce((sum, v) => sum + (v.metrics?.totalCost || 0), 0);
                rows.push(`Total Impressions,${totalImpressions}`);
                rows.push(`Total Cost,${totalCost.toFixed(4)}`);
                const csv = rows.join('\n');
                reply.header('Content-Type', 'text/csv');
                reply.header('Content-Disposition', `attachment; filename="ab-test-${experiment.id}-${new Date().toISOString().split('T')[0]}.csv"`);
                return reply.send(csv);
            }
            else {
                // Generate JSON
                const exportData = {
                    experiment: {
                        id: experiment.id,
                        name: experiment.name,
                        description: experiment.description,
                        hypothesis: experiment.hypothesis,
                        insightType: experiment.insightType,
                        primaryMetric: experiment.primaryMetric,
                        status: experiment.status,
                        startDate: experiment.startDate,
                        endDate: experiment.endDate,
                        createdAt: experiment.createdAt,
                        updatedAt: experiment.updatedAt,
                    },
                    variants: experiment.variants.map(v => ({
                        variantId: v.variantId,
                        name: v.name,
                        description: v.description,
                        promptId: v.promptId,
                        promptSlug: v.promptSlug,
                        trafficPercentage: v.trafficPercentage,
                    })),
                    results: {
                        winner: results.comparison?.winner,
                        statisticalSignificance: results.comparison?.statisticalSignificance,
                        confidenceLevel: results.comparison?.confidenceLevel,
                        improvement: results.comparison?.improvement,
                        variantMetrics: results.variants.reduce((acc, v) => {
                            acc[v.variantId] = v.metrics;
                            return acc;
                        }, {}),
                    },
                    exportedAt: new Date().toISOString(),
                };
                reply.header('Content-Type', 'application/json');
                reply.header('Content-Disposition', `attachment; filename="ab-test-${experiment.id}-${new Date().toISOString().split('T')[0]}.json"`);
                return reply.send(JSON.stringify(exportData, null, 2));
            }
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to export A/B test results');
            return reply.status(500).send({
                error: 'Failed to export A/B test results',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
}
//# sourceMappingURL=prompt-ab-test.routes.js.map
/**
 * Phase 2 Metrics Routes
 *
 * Provides REST endpoints for querying system metrics stored as shards:
 * - GET /api/v1/metrics - Query metrics
 * - GET /api/v1/metrics/aggregated - Get aggregated metrics (P50, P95, P99)
 */
import { requireAuth, requireRole } from '../middleware/authorization.js';
/**
 * Register Phase 2 Metrics routes
 */
export async function registerPhase2MetricsRoutes(server, monitoring) {
    // Get MetricsShardService from server decoration
    const metricsShardService = server.metricsShardService;
    if (!metricsShardService) {
        server.log.warn('⚠️  Phase 2 Metrics routes not registered - MetricsShardService missing');
        return;
    }
    /**
     * GET /api/v1/metrics
     * Query metrics for a time period (requires tenant-admin role)
     */
    server.get('/api/v1/metrics', {
        preHandler: [requireAuth(), requireRole('tenant-admin', 'super-admin')],
        schema: {
            description: 'Query metrics for a time period',
            tags: ['metrics', 'phase-2'],
            querystring: {
                type: 'object',
                required: ['startDate', 'endDate'],
                properties: {
                    metricType: {
                        type: 'string',
                        enum: ['ingestion_lag', 'change_miss_rate', 'vector_hit_ratio', 'insight_confidence_drift'],
                        description: 'Filter by metric type',
                    },
                    startDate: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Start date (ISO 8601)'
                    },
                    endDate: {
                        type: 'string',
                        format: 'date-time',
                        description: 'End date (ISO 8601)'
                    },
                    period: {
                        type: 'string',
                        enum: ['minute', 'hour', 'day'],
                        description: 'Filter by period',
                    },
                    limit: {
                        type: 'string',
                        description: 'Maximum number of results (default: 1000)'
                    },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        metrics: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    metricType: { type: 'string' },
                                    value: { type: ['number', 'object'] },
                                    timestamp: { type: 'string', format: 'date-time' },
                                    period: { type: 'string' },
                                    metadata: { type: 'object' },
                                    createdAt: { type: 'string', format: 'date-time' },
                                },
                            },
                        },
                        count: { type: 'number' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const tenantId = request.user?.tenantId;
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
            }
            const { metricType, startDate, endDate, period, limit, } = request.query;
            if (!startDate || !endDate) {
                return reply.status(400).send({ error: 'startDate and endDate are required' });
            }
            const metrics = await metricsShardService.queryMetrics({
                tenantId,
                metricType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                period,
                limit: limit ? parseInt(limit, 10) : 1000,
            });
            return reply.status(200).send({
                metrics,
                count: metrics.length,
            });
        }
        catch (error) {
            monitoring.trackException(error, {
                component: 'Phase2MetricsRoutes',
                operation: 'query',
                tenantId: request.user?.tenantId,
            });
            return reply.status(500).send({ error: 'Failed to query metrics' });
        }
    });
    /**
     * GET /api/v1/metrics/aggregated
     * Get aggregated metrics (P50, P95, P99) for a time period (requires tenant-admin role)
     */
    server.get('/api/v1/metrics/aggregated', {
        preHandler: [requireAuth(), requireRole('tenant-admin', 'super-admin')],
        schema: {
            description: 'Get aggregated metrics (P50, P95, P99) for a time period',
            tags: ['metrics', 'phase-2'],
            querystring: {
                type: 'object',
                required: ['metricType', 'startDate', 'endDate'],
                properties: {
                    metricType: {
                        type: 'string',
                        enum: ['ingestion_lag', 'change_miss_rate', 'vector_hit_ratio', 'insight_confidence_drift'],
                        description: 'Metric type',
                    },
                    startDate: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Start date (ISO 8601)'
                    },
                    endDate: {
                        type: 'string',
                        format: 'date-time',
                        description: 'End date (ISO 8601)'
                    },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        metricType: { type: 'string' },
                        p50: { type: 'number' },
                        p95: { type: 'number' },
                        p99: { type: 'number' },
                        mean: { type: 'number' },
                        min: { type: 'number' },
                        max: { type: 'number' },
                        count: { type: 'number' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const tenantId = request.user?.tenantId;
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
            }
            const { metricType, startDate, endDate, } = request.query;
            if (!metricType || !startDate || !endDate) {
                return reply.status(400).send({ error: 'metricType, startDate, and endDate are required' });
            }
            const aggregated = await metricsShardService.getAggregatedMetrics({
                tenantId,
                metricType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            });
            return reply.status(200).send({
                metricType,
                ...aggregated,
            });
        }
        catch (error) {
            monitoring.trackException(error, {
                component: 'Phase2MetricsRoutes',
                operation: 'get-aggregated',
                tenantId: request.user?.tenantId,
            });
            return reply.status(500).send({ error: 'Failed to get aggregated metrics' });
        }
    });
    server.log.info('✅ Phase 2 Metrics routes registered');
}
//# sourceMappingURL=phase2-metrics.routes.js.map
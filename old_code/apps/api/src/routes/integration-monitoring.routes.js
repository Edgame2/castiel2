/**
 * Integration Monitoring Admin Routes
 *
 * Provides admin dashboard API endpoints for integration monitoring and operations:
 * - System-wide sync statistics
 * - Integration health status
 * - Sync activity (real-time and history)
 * - Error monitoring
 * - Performance metrics
 *
 * Based on INTEGRATION_MONITORING.md Phase 4 requirements
 */
import { z } from 'zod';
import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';
// Validation schemas
const SyncActivityQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
    offset: z.coerce.number().int().min(0).optional().default(0),
    integrationId: z.string().optional(),
    tenantId: z.string().optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
});
const ErrorQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    integrationId: z.string().optional(),
    tenantId: z.string().optional(),
    errorType: z.string().optional(),
});
const PerformanceQuerySchema = z.object({
    period: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
    integrationId: z.string().optional(),
    tenantId: z.string().optional(),
});
/**
 * Register integration monitoring admin routes
 */
export async function registerIntegrationMonitoringRoutes(server) {
    const monitoring = server.monitoring;
    if (!monitoring) {
        server.log.warn('Monitoring service not available - integration monitoring routes disabled');
        return;
    }
    // Initialize Cosmos DB client for querying sync results
    let cosmosClient = null;
    try {
        if (config.cosmosDb?.endpoint && config.cosmosDb?.key) {
            cosmosClient = new CosmosClient({
                endpoint: config.cosmosDb.endpoint,
                key: config.cosmosDb.key,
            });
        }
    }
    catch (error) {
        server.log.warn('Failed to initialize Cosmos DB client for integration monitoring');
    }
    /**
     * GET /api/admin/integrations/stats
     * Get system-wide sync statistics
     */
    server.get('/api/admin/integrations/stats', {
        schema: {
            description: 'Get system-wide sync statistics',
            tags: ['admin', 'integrations', 'monitoring'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        totalIntegrations: { type: 'number' },
                        activeIntegrations: { type: 'number' },
                        pausedIntegrations: { type: 'number' },
                        errorIntegrations: { type: 'number' },
                        syncJobsLast24h: {
                            type: 'object',
                            properties: {
                                total: { type: 'number' },
                                pending: { type: 'number' },
                                processing: { type: 'number' },
                                completed: { type: 'number' },
                                failed: { type: 'number' },
                            },
                        },
                        topIntegrationsByVolume: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    integrationId: { type: 'string' },
                                    integrationName: { type: 'string' },
                                    syncCount: { type: 'number' },
                                    recordsProcessed: { type: 'number' },
                                },
                            },
                        },
                        errorRate: { type: 'number' },
                        errorRateTrend: { type: 'array', items: { type: 'number' } },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            // Query sync results from Cosmos DB
            const stats = await getSyncStatistics(cosmosClient, monitoring);
            return reply.send(stats);
        }
        catch (error) {
            monitoring?.trackException(error, {
                operation: 'admin.integrations.stats',
            });
            return reply.status(500).send({
                error: 'Failed to get sync statistics',
                message: error instanceof Error ? error.message : String(error),
            });
        }
    });
    /**
     * GET /api/admin/integrations/health
     * Get integration health status
     */
    server.get('/api/admin/integrations/health', {
        schema: {
            description: 'Get integration health status',
            tags: ['admin', 'integrations', 'monitoring'],
            querystring: {
                type: 'object',
                properties: {
                    tenantId: { type: 'string' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        integrations: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    integrationId: { type: 'string' },
                                    integrationName: { type: 'string' },
                                    status: { type: 'string', enum: ['active', 'paused', 'error'] },
                                    lastSuccessfulSync: { type: 'string', nullable: true },
                                    syncFrequency: { type: 'string' },
                                    errorCount: { type: 'number' },
                                    connectionStatus: { type: 'string', enum: ['connected', 'disconnected', 'error'] },
                                    tenantId: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const { tenantId } = request.query;
            const health = await getIntegrationHealth(cosmosClient, tenantId, monitoring);
            return reply.send({ integrations: health });
        }
        catch (error) {
            monitoring?.trackException(error, {
                operation: 'admin.integrations.health',
            });
            return reply.status(500).send({
                error: 'Failed to get integration health',
                message: error instanceof Error ? error.message : String(error),
            });
        }
    });
    /**
     * GET /api/admin/integrations/sync-activity
     * Get sync activity (real-time and history)
     */
    server.get('/api/admin/integrations/sync-activity', {
        schema: {
            description: 'Get sync activity history',
            tags: ['admin', 'integrations', 'monitoring'],
            querystring: SyncActivityQuerySchema,
            response: {
                200: {
                    type: 'object',
                    properties: {
                        jobs: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    integrationId: { type: 'string' },
                                    tenantId: { type: 'string' },
                                    status: { type: 'string' },
                                    recordsProcessed: { type: 'number' },
                                    recordsCreated: { type: 'number' },
                                    recordsUpdated: { type: 'number' },
                                    recordsFailed: { type: 'number' },
                                    duration: { type: 'number' },
                                    startedAt: { type: 'string' },
                                    completedAt: { type: 'string', nullable: true },
                                    error: { type: 'string', nullable: true },
                                },
                            },
                        },
                        total: { type: 'number' },
                        limit: { type: 'number' },
                        offset: { type: 'number' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const query = SyncActivityQuerySchema.parse(request.query);
            const activity = await getSyncActivity(cosmosClient, query, monitoring);
            return reply.send(activity);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    error: 'Invalid query parameters',
                    details: error.errors,
                });
            }
            monitoring?.trackException(error, {
                operation: 'admin.integrations.sync-activity',
            });
            return reply.status(500).send({
                error: 'Failed to get sync activity',
                message: error instanceof Error ? error.message : String(error),
            });
        }
    });
    /**
     * GET /api/admin/integrations/errors
     * Get error summary
     */
    server.get('/api/admin/integrations/errors', {
        schema: {
            description: 'Get error summary for integrations',
            tags: ['admin', 'integrations', 'monitoring'],
            querystring: ErrorQuerySchema,
            response: {
                200: {
                    type: 'object',
                    properties: {
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    integrationId: { type: 'string' },
                                    tenantId: { type: 'string' },
                                    errorMessage: { type: 'string' },
                                    errorType: { type: 'string' },
                                    occurredAt: { type: 'string' },
                                    retryable: { type: 'boolean' },
                                },
                            },
                        },
                        errorRate: { type: 'number' },
                        topErrorTypes: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    errorType: { type: 'string' },
                                    count: { type: 'number' },
                                },
                            },
                        },
                        total: { type: 'number' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const query = ErrorQuerySchema.parse(request.query);
            const errors = await getErrorSummary(cosmosClient, query, monitoring);
            return reply.send(errors);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    error: 'Invalid query parameters',
                    details: error.errors,
                });
            }
            monitoring?.trackException(error, {
                operation: 'admin.integrations.errors',
            });
            return reply.status(500).send({
                error: 'Failed to get error summary',
                message: error instanceof Error ? error.message : String(error),
            });
        }
    });
    /**
     * GET /api/admin/integrations/performance
     * Get performance metrics
     */
    server.get('/api/admin/integrations/performance', {
        schema: {
            description: 'Get performance metrics for integrations',
            tags: ['admin', 'integrations', 'monitoring'],
            querystring: PerformanceQuerySchema,
            response: {
                200: {
                    type: 'object',
                    properties: {
                        metrics: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    integrationId: { type: 'string' },
                                    integrationName: { type: 'string' },
                                    avgSyncDuration: { type: 'number' },
                                    p50SyncDuration: { type: 'number' },
                                    p95SyncDuration: { type: 'number' },
                                    p99SyncDuration: { type: 'number' },
                                    recordsPerSecond: { type: 'number' },
                                    queueDepth: { type: 'number' },
                                    apiLatency: { type: 'number' },
                                },
                            },
                        },
                        period: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const query = PerformanceQuerySchema.parse(request.query);
            const performance = await getPerformanceMetrics(cosmosClient, query, monitoring);
            return reply.send(performance);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({
                    error: 'Invalid query parameters',
                    details: error.errors,
                });
            }
            monitoring?.trackException(error, {
                operation: 'admin.integrations.performance',
            });
            return reply.status(500).send({
                error: 'Failed to get performance metrics',
                message: error instanceof Error ? error.message : String(error),
            });
        }
    });
    server.log.info('✅ Integration monitoring admin routes registered');
}
/**
 * Get sync statistics from Cosmos DB
 */
async function getSyncStatistics(cosmosClient, monitoring) {
    if (!cosmosClient) {
        // Return mock data if Cosmos DB not available
        return {
            totalIntegrations: 0,
            activeIntegrations: 0,
            pausedIntegrations: 0,
            errorIntegrations: 0,
            syncJobsLast24h: {
                total: 0,
                pending: 0,
                processing: 0,
                completed: 0,
                failed: 0,
            },
            topIntegrationsByVolume: [],
            errorRate: 0,
            errorRateTrend: [],
        };
    }
    try {
        const database = cosmosClient.database(config.cosmosDb?.databaseId || 'castiel');
        const resultsContainer = database.container('sync-results');
        // Query sync results from last 24 hours
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const query = `
      SELECT 
        COUNT(1) as total,
        SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN c.status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN c.status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM c
      WHERE c.executedAt >= @last24h
    `;
        const { resources } = await resultsContainer.items.query({
            query,
            parameters: [{ name: '@last24h', value: last24h }],
        }).fetchAll();
        const stats = resources[0] || { total: 0, completed: 0, failed: 0, processing: 0, pending: 0 };
        const errorRate = stats.total > 0 ? (stats.failed / stats.total) * 100 : 0;
        return {
            totalIntegrations: 0, // Would need to query integration connections
            activeIntegrations: 0,
            pausedIntegrations: 0,
            errorIntegrations: 0,
            syncJobsLast24h: {
                total: stats.total || 0,
                pending: stats.pending || 0,
                processing: stats.processing || 0,
                completed: stats.completed || 0,
                failed: stats.failed || 0,
            },
            topIntegrationsByVolume: [], // Would need aggregation query
            errorRate,
            errorRateTrend: [], // Would need time-series query
        };
    }
    catch (error) {
        monitoring?.trackException(error, {
            operation: 'getSyncStatistics',
        });
        throw error;
    }
}
/**
 * Get integration health status
 */
async function getIntegrationHealth(cosmosClient, tenantId, monitoring) {
    if (!cosmosClient) {
        return [];
    }
    try {
        const database = cosmosClient.database(config.cosmosDb?.databaseId || 'castiel');
        const resultsContainer = database.container('sync-results');
        // Query last successful sync for each integration
        const query = tenantId
            ? `
        SELECT 
          c.integrationId,
          MAX(c.executedAt) as lastSuccessfulSync,
          COUNT(1) as totalSyncs,
          SUM(CASE WHEN c.status = 'failed' THEN 1 ELSE 0 END) as errorCount
        FROM c
        WHERE c.tenantId = @tenantId AND c.status = 'completed'
        GROUP BY c.integrationId
      `
            : `
        SELECT 
          c.integrationId,
          MAX(c.executedAt) as lastSuccessfulSync,
          COUNT(1) as totalSyncs,
          SUM(CASE WHEN c.status = 'failed' THEN 1 ELSE 0 END) as errorCount
        FROM c
        WHERE c.status = 'completed'
        GROUP BY c.integrationId
      `;
        const parameters = tenantId ? [{ name: '@tenantId', value: tenantId }] : [];
        const { resources } = await resultsContainer.items.query({
            query,
            parameters,
        }).fetchAll();
        return resources.map((r) => ({
            integrationId: r.integrationId,
            integrationName: r.integrationId, // Would need to join with integration definitions
            status: r.errorCount > 0 ? 'error' : 'active',
            lastSuccessfulSync: r.lastSuccessfulSync,
            syncFrequency: 'unknown', // Would need to query sync task configuration
            errorCount: r.errorCount || 0,
            connectionStatus: 'connected', // Would need to check connection status
            tenantId: tenantId || 'unknown',
        }));
    }
    catch (error) {
        monitoring?.trackException(error, {
            operation: 'getIntegrationHealth',
        });
        return [];
    }
}
/**
 * Get sync activity
 */
async function getSyncActivity(cosmosClient, query, monitoring) {
    if (!cosmosClient) {
        return {
            jobs: [],
            total: 0,
            limit: query.limit,
            offset: query.offset,
        };
    }
    try {
        const database = cosmosClient.database(config.cosmosDb?.databaseId || 'castiel');
        const resultsContainer = database.container('sync-results');
        // Build query with filters
        let sqlQuery = 'SELECT * FROM c WHERE 1=1';
        const parameters = [];
        if (query.integrationId) {
            sqlQuery += ' AND c.integrationId = @integrationId';
            parameters.push({ name: '@integrationId', value: query.integrationId });
        }
        if (query.tenantId) {
            sqlQuery += ' AND c.tenantId = @tenantId';
            parameters.push({ name: '@tenantId', value: query.tenantId });
        }
        if (query.status) {
            sqlQuery += ' AND c.status = @status';
            parameters.push({ name: '@status', value: query.status });
        }
        if (query.startDate) {
            sqlQuery += ' AND c.executedAt >= @startDate';
            parameters.push({ name: '@startDate', value: query.startDate });
        }
        if (query.endDate) {
            sqlQuery += ' AND c.executedAt <= @endDate';
            parameters.push({ name: '@endDate', value: query.endDate });
        }
        sqlQuery += ' ORDER BY c.executedAt DESC OFFSET @offset LIMIT @limit';
        parameters.push({ name: '@offset', value: query.offset }, { name: '@limit', value: query.limit });
        const { resources } = await resultsContainer.items.query({
            query: sqlQuery,
            parameters,
        }).fetchAll();
        // Get total count
        const countQuery = sqlQuery.replace('SELECT *', 'SELECT VALUE COUNT(1)').replace('ORDER BY c.executedAt DESC OFFSET @offset LIMIT @limit', '');
        const countParams = parameters.filter(p => p.name !== '@offset' && p.name !== '@limit');
        const { resources: countResources } = await resultsContainer.items.query({
            query: countQuery,
            parameters: countParams,
        }).fetchAll();
        const total = countResources[0] || 0;
        return {
            jobs: resources.map((r) => ({
                id: r.id,
                integrationId: r.integrationId,
                tenantId: r.tenantId,
                status: r.status,
                recordsProcessed: r.recordsProcessed || 0,
                recordsCreated: r.recordsCreated || 0,
                recordsUpdated: r.recordsUpdated || 0,
                recordsFailed: r.recordsFailed || 0,
                duration: r.duration || 0,
                startedAt: r.executedAt,
                completedAt: r.completedAt || null,
                error: r.errorMessage || null,
            })),
            total,
            limit: query.limit,
            offset: query.offset,
        };
    }
    catch (error) {
        monitoring?.trackException(error, {
            operation: 'getSyncActivity',
        });
        return {
            jobs: [],
            total: 0,
            limit: query.limit,
            offset: query.offset,
        };
    }
}
/**
 * Get error summary
 */
async function getErrorSummary(cosmosClient, query, monitoring) {
    if (!cosmosClient) {
        return {
            errors: [],
            errorRate: 0,
            topErrorTypes: [],
            total: 0,
        };
    }
    try {
        const database = cosmosClient.database(config.cosmosDb?.databaseId || 'castiel');
        const resultsContainer = database.container('sync-results');
        // Query failed syncs
        let sqlQuery = 'SELECT * FROM c WHERE c.status = "failed"';
        const parameters = [];
        if (query.integrationId) {
            sqlQuery += ' AND c.integrationId = @integrationId';
            parameters.push({ name: '@integrationId', value: query.integrationId });
        }
        if (query.tenantId) {
            sqlQuery += ' AND c.tenantId = @tenantId';
            parameters.push({ name: '@tenantId', value: query.tenantId });
        }
        sqlQuery += ' ORDER BY c.executedAt DESC LIMIT @limit';
        parameters.push({ name: '@limit', value: query.limit });
        const { resources } = await resultsContainer.items.query({
            query: sqlQuery,
            parameters,
        }).fetchAll();
        // Calculate error rate (would need total syncs for accurate rate)
        const errorRate = 0; // Placeholder
        // Group by error type
        const errorTypeMap = new Map();
        resources.forEach((r) => {
            const errorType = r.errorType || 'unknown';
            errorTypeMap.set(errorType, (errorTypeMap.get(errorType) || 0) + 1);
        });
        const topErrorTypes = Array.from(errorTypeMap.entries())
            .map(([errorType, count]) => ({ errorType, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        return {
            errors: resources.map((r) => ({
                id: r.id,
                integrationId: r.integrationId,
                tenantId: r.tenantId,
                errorMessage: r.errorMessage || 'Unknown error',
                errorType: r.errorType || 'unknown',
                occurredAt: r.executedAt,
                retryable: r.retryable !== false,
            })),
            errorRate,
            topErrorTypes,
            total: resources.length,
        };
    }
    catch (error) {
        monitoring?.trackException(error, {
            operation: 'getErrorSummary',
        });
        return {
            errors: [],
            errorRate: 0,
            topErrorTypes: [],
            total: 0,
        };
    }
}
/**
 * Get performance metrics
 */
async function getPerformanceMetrics(cosmosClient, query, monitoring) {
    if (!cosmosClient) {
        return {
            metrics: [],
            period: query.period,
        };
    }
    try {
        const database = cosmosClient.database(config.cosmosDb?.databaseId || 'castiel');
        const resultsContainer = database.container('sync-results');
        // Calculate time range based on period
        const now = Date.now();
        const periodMs = {
            hour: 60 * 60 * 1000,
            day: 24 * 60 * 60 * 1000,
            week: 7 * 24 * 60 * 60 * 1000,
            month: 30 * 24 * 60 * 60 * 1000,
        }[query.period];
        const startDate = new Date(now - periodMs).toISOString();
        // Query sync results for performance metrics
        let sqlQuery = `
      SELECT 
        c.integrationId,
        AVG(c.duration) as avgSyncDuration,
        PERCENTILE_CONT(c.duration, 0.5) as p50SyncDuration,
        PERCENTILE_CONT(c.duration, 0.95) as p95SyncDuration,
        PERCENTILE_CONT(c.duration, 0.99) as p99SyncDuration,
        SUM(c.recordsProcessed) / SUM(c.duration) * 1000 as recordsPerSecond
      FROM c
      WHERE c.executedAt >= @startDate AND c.status = 'completed'
    `;
        const parameters = [{ name: '@startDate', value: startDate }];
        if (query.integrationId) {
            sqlQuery += ' AND c.integrationId = @integrationId';
            parameters.push({ name: '@integrationId', value: query.integrationId });
        }
        if (query.tenantId) {
            sqlQuery += ' AND c.tenantId = @tenantId';
            parameters.push({ name: '@tenantId', value: query.tenantId });
        }
        sqlQuery += ' GROUP BY c.integrationId';
        const { resources } = await resultsContainer.items.query({
            query: sqlQuery,
            parameters,
        }).fetchAll();
        return {
            metrics: resources.map((r) => ({
                integrationId: r.integrationId,
                integrationName: r.integrationId, // Would need to join with integration definitions
                avgSyncDuration: r.avgSyncDuration || 0,
                p50SyncDuration: r.p50SyncDuration || 0,
                p95SyncDuration: r.p95SyncDuration || 0,
                p99SyncDuration: r.p99SyncDuration || 0,
                recordsPerSecond: r.recordsPerSecond || 0,
                queueDepth: 0, // Would need to query Service Bus
                apiLatency: 0, // Would need to query adapter metrics
            })),
            period: query.period,
        };
    }
    catch (error) {
        monitoring?.trackException(error, {
            operation: 'getPerformanceMetrics',
        });
        return {
            metrics: [],
            period: query.period,
        };
    }
}
//# sourceMappingURL=integration-monitoring.routes.js.map
/**
 * Performance Monitoring Service
 * Tracks and aggregates performance metrics for project management operations
 */
import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';
export class PerformanceMonitoringService {
    metricsBuffer = [];
    bufferFlushInterval;
    client;
    database;
    metricsContainer;
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
        // Initialize Cosmos client with optimized connection policy
        const connectionPolicy = {
            connectionMode: 'Direct', // Best performance
            requestTimeout: 30000, // 30 seconds
            enableEndpointDiscovery: true, // For multi-region
            retryOptions: {
                maxRetryAttemptCount: 9,
                fixedRetryIntervalInMilliseconds: 0, // Exponential backoff
                maxWaitTimeInSeconds: 30,
            },
        };
        this.client = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
            connectionPolicy,
        });
        this.database = this.client.database(config.cosmosDb.databaseId);
        this.metricsContainer = this.database.container('system-metrics');
        // Flush buffer every 5 seconds
        this.bufferFlushInterval = setInterval(() => this.flushMetricsBuffer(), 5000);
    }
    /**
     * Track recommendation metric
     */
    trackRecommendationMetric(data) {
        this.addMetric({
            tenantId: data.tenantId,
            projectId: data.projectId,
            recommendationLatencyMs: data.latencyMs,
            recommendationCount: data.resultCount,
            recommendationHitRate: data.hitRate,
            timestamp: new Date(),
        });
    }
    /**
     * Track context assembly metric
     */
    trackContextAssemblyMetric(data) {
        this.addMetric({
            tenantId: data.tenantId,
            projectId: data.projectId,
            contextAssemblyLatencyMs: data.latencyMs,
            contextTokensUsed: data.tokensUsed,
            contextTruncationOccurred: data.truncationOccurred,
            linkedShardsInContext: data.linkedShardsIncluded,
            timestamp: new Date(),
        });
    }
    /**
     * Track vector search metric
     */
    trackVectorSearchMetric(data) {
        this.addMetric({
            tenantId: data.tenantId,
            vectorSearchLatencyMs: data.latencyMs,
            vectorSearchResultCount: data.resultCount,
            timestamp: new Date(),
        });
    }
    /**
     * Track AI chat metric
     */
    trackAIChatMetric(data) {
        this.addMetric({
            tenantId: data.tenantId,
            projectId: data.projectId,
            aiResponseTimeMs: data.responseTimeMs,
            aiTokensUsed: data.tokensUsed,
            aiCostEstimate: data.costEstimate,
            timestamp: new Date(),
        });
    }
    /**
     * Track linking operation metric
     */
    trackLinkingMetric(data) {
        this.addMetric({
            tenantId: data.tenantId,
            projectId: data.projectId,
            linkingOperationTimeMs: data.operationTimeMs,
            linkedShardsAdded: data.shardCount,
            timestamp: new Date(),
        });
    }
    /**
     * Get metrics for tenant (latest)
     */
    async getTenantMetrics(tenantId, timeRangeMinutes = 60) {
        try {
            const container = this.metricsContainer;
            const since = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
            const { resources } = await container.items
                .query({
                query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.timestamp > @since ORDER BY c.timestamp DESC`,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@since', value: since.toISOString() },
                ],
            })
                .fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'performance-monitoring.getTenantMetrics', tenantId });
            return [];
        }
    }
    /**
     * Get metrics for specific project
     */
    async getProjectMetrics(tenantId, projectId, timeRangeMinutes = 60) {
        try {
            const container = this.metricsContainer;
            const since = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
            const { resources } = await container.items
                .query({
                query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.projectId = @projectId AND c.timestamp > @since ORDER BY c.timestamp DESC`,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@projectId', value: projectId },
                    { name: '@since', value: since.toISOString() },
                ],
            })
                .fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'performance-monitoring.getProjectMetrics', projectId });
            return [];
        }
    }
    /**
     * Calculate aggregated metrics for tenant
     */
    async getTenantMetricsAggregated(tenantId, timeRangeMinutes = 60) {
        const metrics = await this.getTenantMetrics(tenantId, timeRangeMinutes);
        if (metrics.length === 0) {
            return {
                avgRecommendationLatency: 0,
                avgContextAssemblyLatency: 0,
                avgVectorSearchLatency: 0,
                avgAIResponseTime: 0,
                totalContextTokensUsed: 0,
                truncationFrequency: 0,
                metricCount: 0,
            };
        }
        const recommendations = metrics.filter((m) => m.recommendationLatencyMs !== undefined);
        const contextAssembly = metrics.filter((m) => m.contextAssemblyLatencyMs !== undefined);
        const vectorSearch = metrics.filter((m) => m.vectorSearchLatencyMs !== undefined);
        const aiChat = metrics.filter((m) => m.aiResponseTimeMs !== undefined);
        const truncations = metrics.filter((m) => m.contextTruncationOccurred === true);
        return {
            avgRecommendationLatency: recommendations.length > 0
                ? recommendations.reduce((sum, m) => sum + (m.recommendationLatencyMs || 0), 0) /
                    recommendations.length
                : 0,
            avgContextAssemblyLatency: contextAssembly.length > 0
                ? contextAssembly.reduce((sum, m) => sum + (m.contextAssemblyLatencyMs || 0), 0) /
                    contextAssembly.length
                : 0,
            avgVectorSearchLatency: vectorSearch.length > 0
                ? vectorSearch.reduce((sum, m) => sum + (m.vectorSearchLatencyMs || 0), 0) /
                    vectorSearch.length
                : 0,
            avgAIResponseTime: aiChat.length > 0
                ? aiChat.reduce((sum, m) => sum + (m.aiResponseTimeMs || 0), 0) / aiChat.length
                : 0,
            totalContextTokensUsed: contextAssembly.reduce((sum, m) => sum + (m.contextTokensUsed || 0), 0),
            truncationFrequency: contextAssembly.length > 0
                ? (truncations.length / contextAssembly.length) * 100
                : 0,
            metricCount: metrics.length,
        };
    }
    /**
     * Detect anomalies in metrics
     */
    async detectAnomalies(tenantId, stdDevThreshold = 2.0) {
        const metrics = await this.getTenantMetrics(tenantId, 1440); // 24 hours
        const anomalies = [];
        if (metrics.length < 10) {
            return anomalies;
        }
        // Check recommendation latency
        const latencies = metrics
            .filter((m) => m.recommendationLatencyMs !== undefined)
            .map((m) => m.recommendationLatencyMs);
        if (latencies.length > 0) {
            const avg = latencies.reduce((a, b) => a + b) / latencies.length;
            const variance = latencies.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / latencies.length;
            const stdDev = Math.sqrt(variance);
            const current = latencies[latencies.length - 1];
            if (current > avg + stdDevThreshold * stdDev) {
                anomalies.push({
                    metric: 'recommendation_latency',
                    currentValue: current,
                    threshold: avg + stdDevThreshold * stdDev,
                    severity: current > avg + 3 * stdDev ? 'critical' : 'warning',
                });
            }
        }
        return anomalies;
    }
    /**
     * Add metric to buffer
     */
    addMetric(metric) {
        const fullMetric = {
            id: `${Date.now()}-${Math.random()}`,
            tenantId: metric.tenantId || 'unknown',
            timestamp: metric.timestamp || new Date(),
            ...metric,
        };
        this.metricsBuffer.push(fullMetric);
        // Flush if buffer is large
        if (this.metricsBuffer.length >= 100) {
            this.flushMetricsBuffer();
        }
    }
    /**
     * Flush metrics buffer to database
     */
    async flushMetricsBuffer() {
        if (this.metricsBuffer.length === 0) {
            return;
        }
        const toFlush = [...this.metricsBuffer];
        this.metricsBuffer = [];
        try {
            const container = this.metricsContainer;
            for (const metric of toFlush) {
                await container.items.create(metric);
            }
            this.monitoring.trackEvent('performance-monitoring.metricsFlushed', { count: toFlush.length });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'performance-monitoring.flushMetricsBuffer' });
            // Put metrics back in buffer for retry
            this.metricsBuffer.unshift(...toFlush);
        }
    }
    /**
     * Cleanup old metrics (should be called periodically)
     */
    async cleanupOldMetrics(retentionDays = 30) {
        try {
            const container = this.metricsContainer;
            const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
            const { resources } = await container.items
                .query({
                query: 'SELECT c.id FROM c WHERE c.timestamp < @cutoff',
                parameters: [{ name: '@cutoff', value: cutoffDate.toISOString() }],
            })
                .fetchAll();
            for (const item of resources) {
                await container.item(item.id).delete();
            }
            this.monitoring.trackEvent('performance-monitoring.metricsCleaned', { count: resources.length });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'performance-monitoring.cleanupOldMetrics' });
        }
    }
    /**
     * Destroy cleanup interval on service destruction
     */
    onModuleDestroy() {
        if (this.bufferFlushInterval) {
            clearInterval(this.bufferFlushInterval);
        }
        this.flushMetricsBuffer();
    }
}
//# sourceMappingURL=performance-monitoring.service.js.map
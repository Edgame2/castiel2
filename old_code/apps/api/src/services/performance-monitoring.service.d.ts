/**
 * Performance Monitoring Service
 * Tracks and aggregates performance metrics for project management operations
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import type { PerformanceMetrics } from '../types/tenant-project-config.types.js';
export declare class PerformanceMonitoringService {
    private metricsBuffer;
    private bufferFlushInterval;
    private client;
    private database;
    private metricsContainer;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Track recommendation metric
     */
    trackRecommendationMetric(data: {
        tenantId: string;
        projectId?: string;
        latencyMs: number;
        resultCount: number;
        hitRate?: number;
    }): void;
    /**
     * Track context assembly metric
     */
    trackContextAssemblyMetric(data: {
        tenantId: string;
        projectId: string;
        latencyMs: number;
        tokensUsed: number;
        linkedShardsIncluded: number;
        truncationOccurred: boolean;
    }): void;
    /**
     * Track vector search metric
     */
    trackVectorSearchMetric(data: {
        tenantId: string;
        latencyMs: number;
        resultCount: number;
    }): void;
    /**
     * Track AI chat metric
     */
    trackAIChatMetric(data: {
        tenantId: string;
        projectId?: string;
        responseTimeMs: number;
        tokensUsed: number;
        costEstimate?: number;
    }): void;
    /**
     * Track linking operation metric
     */
    trackLinkingMetric(data: {
        tenantId: string;
        projectId: string;
        operationTimeMs: number;
        shardCount: number;
    }): void;
    /**
     * Get metrics for tenant (latest)
     */
    getTenantMetrics(tenantId: string, timeRangeMinutes?: number): Promise<PerformanceMetrics[]>;
    /**
     * Get metrics for specific project
     */
    getProjectMetrics(tenantId: string, projectId: string, timeRangeMinutes?: number): Promise<PerformanceMetrics[]>;
    /**
     * Calculate aggregated metrics for tenant
     */
    getTenantMetricsAggregated(tenantId: string, timeRangeMinutes?: number): Promise<{
        avgRecommendationLatency: number;
        avgContextAssemblyLatency: number;
        avgVectorSearchLatency: number;
        avgAIResponseTime: number;
        totalContextTokensUsed: number;
        truncationFrequency: number;
        metricCount: number;
    }>;
    /**
     * Detect anomalies in metrics
     */
    detectAnomalies(tenantId: string, stdDevThreshold?: number): Promise<{
        metric: string;
        currentValue: number;
        threshold: number;
        severity: 'warning' | 'critical';
    }[]>;
    /**
     * Add metric to buffer
     */
    private addMetric;
    /**
     * Flush metrics buffer to database
     */
    private flushMetricsBuffer;
    /**
     * Cleanup old metrics (should be called periodically)
     */
    cleanupOldMetrics(retentionDays?: number): Promise<void>;
    /**
     * Destroy cleanup interval on service destruction
     */
    onModuleDestroy(): void;
}
//# sourceMappingURL=performance-monitoring.service.d.ts.map
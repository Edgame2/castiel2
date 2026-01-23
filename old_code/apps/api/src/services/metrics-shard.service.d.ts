/**
 * Metrics-as-Shards Service (Phase 2)
 *
 * Stores observability metrics as shards for historical analysis.
 *
 * Metrics tracked:
 * - Ingestion lag (P50, P95, P99)
 * - Change miss rate
 * - Vector hit ratio
 * - Insight confidence drift
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
/**
 * Metric type
 */
export declare enum MetricType {
    INGESTION_LAG = "ingestion_lag",
    CHANGE_MISS_RATE = "change_miss_rate",
    VECTOR_HIT_RATIO = "vector_hit_ratio",
    INSIGHT_CONFIDENCE_DRIFT = "insight_confidence_drift"
}
/**
 * Metric value with percentiles
 */
export interface MetricValue {
    p50?: number;
    p95?: number;
    p99?: number;
    mean?: number;
    min?: number;
    max?: number;
    count?: number;
}
/**
 * Metric shard data
 */
export interface MetricShardData {
    metricType: MetricType;
    value: number | MetricValue;
    unit?: string;
    timestamp: Date;
    period: 'minute' | 'hour' | 'day';
    metadata?: Record<string, any>;
}
export declare class MetricsShardService {
    private shardRepository;
    private monitoring;
    private enabled;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, enabled?: boolean);
    /**
     * Record a metric as a shard
     */
    recordMetric(tenantId: string, metricType: MetricType, value: number | MetricValue, period?: 'minute' | 'hour' | 'day', metadata?: Record<string, any>): Promise<void>;
    /**
     * Record ingestion lag metric
     */
    recordIngestionLag(tenantId: string, lagMs: number, source: string): Promise<void>;
    /**
     * Record change miss rate
     */
    recordChangeMissRate(tenantId: string, missRate: number): Promise<void>;
    /**
     * Record vector hit ratio
     */
    recordVectorHitRatio(tenantId: string, hitRatio: number): Promise<void>;
    /**
     * Record insight confidence drift
     */
    recordInsightConfidenceDrift(tenantId: string, drift: number, insightId?: string): Promise<void>;
    /**
     * Query metrics for a time period
     */
    queryMetrics(params: {
        tenantId: string;
        metricType?: MetricType;
        startDate: Date;
        endDate: Date;
        period?: 'minute' | 'hour' | 'day';
        limit?: number;
    }): Promise<any[]>;
    /**
     * Get aggregated metrics (P50, P95, P99) for a time period
     */
    getAggregatedMetrics(params: {
        tenantId: string;
        metricType: MetricType;
        startDate: Date;
        endDate: Date;
    }): Promise<MetricValue>;
}
//# sourceMappingURL=metrics-shard.service.d.ts.map
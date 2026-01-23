/**
 * Cache Monitoring Service
 * Aggregates statistics from all cache services and exports metrics
 */
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { AggregatedCacheStats, CacheHealthCheck, CachePerformanceReport } from '../types/cache-stats.types.js';
import type { ShardCacheService } from './shard-cache.service.js';
import type { ACLCacheService } from './acl-cache.service.js';
import type { VectorSearchCacheService } from './vector-search-cache.service.js';
import type { TokenValidationCacheService } from './token-validation-cache.service.js';
export interface CacheMonitorConfig {
    metricsIntervalMs: number;
    trackTopKeys: boolean;
    topKeysCount: number;
    enableAlerts: boolean;
    alertThresholds: {
        lowHitRate: number;
        highMemoryUsage: number;
        highLatency: number;
    };
}
export interface CacheMonitorDependencies {
    redisClient?: Redis;
    monitoring?: IMonitoringProvider;
    shardCache?: ShardCacheService;
    aclCache?: ACLCacheService;
    vectorSearchCache?: VectorSearchCacheService;
    tokenValidationCache?: TokenValidationCacheService;
}
export declare class CacheMonitorService {
    private redisClient?;
    private monitoring?;
    private shardCache?;
    private aclCache?;
    private vectorSearchCache?;
    private tokenValidationCache?;
    private config;
    private metricsInterval?;
    private keyAccessCount;
    constructor(dependencies: CacheMonitorDependencies, config?: Partial<CacheMonitorConfig>);
    /**
     * Start collecting and exporting metrics periodically
     */
    startMonitoring(): void;
    /**
     * Stop collecting metrics
     */
    stopMonitoring(): void;
    /**
     * Get current alert configuration
     */
    getConfig(): CacheMonitorConfig;
    /**
     * Get aggregated statistics from all cache services
     */
    getAggregatedStats(): Promise<AggregatedCacheStats>;
    /**
     * Get statistics from a specific cache service
     */
    private getServiceStats;
    /**
     * Perform health check on cache infrastructure
     */
    performHealthCheck(): Promise<CacheHealthCheck>;
    /**
     * Collect and export metrics to Application Insights
     */
    private collectAndExportMetrics;
    /**
     * Check if any alert thresholds are breached
     */
    private checkAndTriggerAlerts;
    /**
     * Get top accessed cache keys
     */
    private getTopKeys;
    /**
     * Extract cache key pattern (e.g., "tenant:123:shard:456" -> "shard")
     */
    private extractKeyPattern;
    /**
     * Track a cache key access
     */
    trackKeyAccess(key: string): void;
    /**
     * Generate performance report
     */
    generatePerformanceReport(startDate: Date, endDate: Date): Promise<CachePerformanceReport>;
    /**
     * Check Redis connection
     */
    private checkRedisConnection;
    /**
     * Reset statistics
     */
    resetStats(): void;
}
//# sourceMappingURL=cache-monitor.service.d.ts.map
/**
 * Cache Statistics Types
 * Comprehensive monitoring types for all cache services
 */
/**
 * Individual cache service statistics
 */
export interface CacheServiceStats {
    serviceName: string;
    enabled: boolean;
    healthy: boolean;
    totalOperations: number;
    hits: number;
    misses: number;
    hitRate: number;
    evictions?: number;
    invalidations?: number;
    averageLatencyMs?: number;
    totalKeys: number;
    memoryUsageBytes?: number;
    lastResetAt?: Date;
}
/**
 * Aggregated cache statistics across all services
 */
export interface AggregatedCacheStats {
    timestamp: Date;
    redisConnected: boolean;
    services: {
        shardCache?: CacheServiceStats;
        aclCache?: CacheServiceStats;
        vectorSearchCache?: CacheServiceStats;
        tokenValidationCache?: CacheServiceStats;
    };
    aggregated: {
        totalHits: number;
        totalMisses: number;
        overallHitRate: number;
        totalKeys: number;
        totalMemoryBytes?: number;
        totalInvalidations: number;
    };
    performance: {
        averageLatencyMs: number;
        p95LatencyMs?: number;
        p99LatencyMs?: number;
    };
    topKeys?: CacheKeyInfo[];
}
/**
 * Information about popular cache keys
 */
export interface CacheKeyInfo {
    key: string;
    pattern: string;
    hits: number;
    size?: number;
    ttl?: number;
    lastAccessed?: Date;
}
/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
    enabled: boolean;
    strategy: 'frequency' | 'recency' | 'hybrid';
    topN: number;
    tenants?: string[];
    includeShards: boolean;
    includeACL: boolean;
    maxDurationMs: number;
}
/**
 * Cache warming status
 */
export interface CacheWarmingStatus {
    isWarming: boolean;
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
    itemsWarmed: number;
    itemsFailed: number;
    tenantsProcessed: number;
    status: 'idle' | 'in-progress' | 'completed' | 'failed' | 'partial';
    errors?: string[];
}
/**
 * Cache warming result
 */
export interface CacheWarmingResult {
    success: boolean;
    status: CacheWarmingStatus;
    details: {
        shardsWarmed: number;
        aclEntriesWarmed: number;
        tenantsProcessed: string[];
        durationMs: number;
        errors: string[];
    };
}
/**
 * Cache clear options
 */
export interface CacheClearOptions {
    pattern?: string;
    service?: 'shards' | 'acl' | 'vectorSearch' | 'tokenValidation' | 'all';
    tenantId?: string;
    force?: boolean;
}
/**
 * Cache clear result
 */
export interface CacheClearResult {
    success: boolean;
    keysCleared: number;
    services: string[];
    pattern?: string;
    durationMs: number;
    errors?: string[];
}
/**
 * Cache health check result
 */
export interface CacheHealthCheck {
    healthy: boolean;
    redis: {
        connected: boolean;
        latencyMs: number;
        memoryUsedBytes?: number;
        memoryMaxBytes?: number;
        memoryUsagePercent?: number;
    };
    services: {
        [serviceName: string]: {
            healthy: boolean;
            hitRate: number;
            keyCount: number;
        };
    };
    issues: string[];
    recommendations: string[];
}
/**
 * Cache metrics for Application Insights
 */
export interface CacheMetrics {
    timestamp: Date;
    tenantId?: string;
    metrics: {
        hitRate: number;
        missRate: number;
        avgLatencyMs: number;
        keyCount: number;
        memoryUsageBytes: number;
        evictionRate: number;
        invalidationRate: number;
    };
    dimensions: {
        service: string;
        operation: string;
        cacheType: string;
    };
}
/**
 * Cache alert configuration
 */
export interface CacheAlertConfig {
    enabled: boolean;
    thresholds: {
        lowHitRate: number;
        highMemoryUsage: number;
        highLatency: number;
        highEvictionRate: number;
    };
    alertChannels: string[];
}
/**
 * Cache alert event
 */
export interface CacheAlertEvent {
    timestamp: Date;
    severity: 'info' | 'warning' | 'error' | 'critical';
    type: 'low-hit-rate' | 'high-memory' | 'high-latency' | 'high-eviction' | 'redis-down';
    service: string;
    message: string;
    currentValue: number;
    thresholdValue: number;
    details?: Record<string, any>;
}
/**
 * Cache operation tracking
 */
export interface CacheOperation {
    operation: 'get' | 'set' | 'delete' | 'invalidate';
    service: string;
    key: string;
    hit: boolean;
    latencyMs: number;
    timestamp: Date;
    tenantId?: string;
    userId?: string;
}
/**
 * Cache performance report
 */
export interface CachePerformanceReport {
    period: {
        start: Date;
        end: Date;
        durationMs: number;
    };
    services: {
        [serviceName: string]: {
            operations: number;
            hits: number;
            misses: number;
            hitRate: number;
            avgLatencyMs: number;
            maxLatencyMs: number;
            minLatencyMs: number;
            totalMemoryBytes: number;
        };
    };
    insights: {
        mostAccessedKeys: CacheKeyInfo[];
        leastEffectiveService: string;
        highestLatencyService: string;
        recommendations: string[];
    };
}
//# sourceMappingURL=cache-stats.types.d.ts.map
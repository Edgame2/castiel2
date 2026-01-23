/**
 * Cache Optimization Service
 *
 * Analyzes cache performance, identifies optimization opportunities,
 * and implements intelligent cache warming and invalidation strategies.
 *
 * Goals:
 * - Improve cache hit rates (>80% target)
 * - Reduce cache invalidation overhead
 * - Optimize TTL values based on access patterns
 * - Implement predictive cache warming
 */
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CacheMonitorService } from './cache-monitor.service.js';
import type { CacheWarmingService } from './cache-warming.service.js';
export interface CacheOptimizationConfig {
    enabled: boolean;
    targetHitRate: number;
    analysisInterval: number;
    warmingEnabled: boolean;
    warmingThreshold: number;
    ttlOptimizationEnabled: boolean;
}
export interface CacheAccessPattern {
    key: string;
    accessCount: number;
    lastAccessed: Date;
    firstAccessed: Date;
    averageInterval: number;
    cacheHitRate: number;
    recommendedTTL?: number;
    hits?: number;
    misses?: number;
}
export interface CacheOptimizationReport {
    timestamp: Date;
    overallHitRate: number;
    targetHitRate: number;
    hitRateGap: number;
    recommendations: OptimizationRecommendation[];
    accessPatterns: CacheAccessPattern[];
    topMissedKeys: string[];
    optimizationScore: number;
}
export interface OptimizationRecommendation {
    type: 'ttl' | 'warming' | 'invalidation' | 'key-design' | 'memory';
    priority: 'high' | 'medium' | 'low';
    description: string;
    impact: string;
    action: string;
    estimatedImprovement: number;
}
export interface CacheWarmingStrategy {
    strategy: 'frequent' | 'recent' | 'predictive' | 'manual';
    keys: string[];
    priority: number;
    estimatedHitRateImprovement: number;
}
/**
 * Cache Optimization Service
 */
export declare class CacheOptimizationService {
    private redis;
    private monitoring;
    private cacheMonitor?;
    private cacheWarming?;
    private config;
    private accessPatterns;
    private analysisInterval?;
    private lastAnalysis?;
    constructor(redis: Redis, monitoring: IMonitoringProvider, cacheMonitor?: CacheMonitorService | undefined, cacheWarming?: CacheWarmingService | undefined, config?: Partial<CacheOptimizationConfig>);
    /**
     * Start cache optimization analysis
     */
    start(): void;
    /**
     * Stop cache optimization analysis
     */
    stop(): void;
    /**
     * Record cache access for pattern analysis
     */
    recordAccess(key: string, wasHit: boolean, ttl?: number): void;
    /**
     * Analyze cache performance and generate optimization report
     */
    analyzeAndOptimize(): Promise<CacheOptimizationReport>;
    /**
     * Get cache optimization report
     */
    getReport(): Promise<CacheOptimizationReport>;
    /**
     * Generate cache warming strategies based on access patterns
     */
    generateWarmingStrategies(): Promise<CacheWarmingStrategy[]>;
    /**
     * Generate optimization recommendations
     */
    private generateRecommendations;
    /**
     * Identify top missed keys
     */
    private identifyTopMissedKeys;
    /**
     * Calculate optimization score (0-100)
     */
    private calculateOptimizationScore;
    /**
     * Execute optimizations based on recommendations
     */
    private executeOptimizations;
    /**
     * Normalize cache key for reporting (remove sensitive data)
     */
    private normalizeKey;
    /**
     * Get access patterns for a specific key pattern
     */
    getAccessPatterns(pattern?: string): CacheAccessPattern[];
    /**
     * Reset access patterns (for testing or cleanup)
     */
    resetAccessPatterns(): void;
}
//# sourceMappingURL=cache-optimization.service.d.ts.map
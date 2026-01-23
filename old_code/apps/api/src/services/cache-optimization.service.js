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
/**
 * Cache Optimization Service
 */
export class CacheOptimizationService {
    redis;
    monitoring;
    cacheMonitor;
    cacheWarming;
    config;
    accessPatterns = new Map();
    analysisInterval;
    lastAnalysis;
    constructor(redis, monitoring, cacheMonitor, cacheWarming, config) {
        this.redis = redis;
        this.monitoring = monitoring;
        this.cacheMonitor = cacheMonitor;
        this.cacheWarming = cacheWarming;
        this.config = {
            enabled: true,
            targetHitRate: 80,
            analysisInterval: 300, // 5 minutes
            warmingEnabled: true,
            warmingThreshold: 10,
            ttlOptimizationEnabled: true,
            ...config,
        };
    }
    /**
     * Start cache optimization analysis
     */
    start() {
        if (!this.config.enabled) {
            return;
        }
        if (this.analysisInterval) {
            this.stop();
        }
        // Run initial analysis
        this.analyzeAndOptimize().catch((error) => {
            this.monitoring.trackException(error, {
                component: 'CacheOptimizationService',
                operation: 'start',
            });
        });
        // Schedule periodic analysis
        this.analysisInterval = setInterval(() => {
            this.analyzeAndOptimize().catch((error) => {
                this.monitoring.trackException(error, {
                    component: 'CacheOptimizationService',
                    operation: 'periodic-analysis',
                });
            });
        }, this.config.analysisInterval * 1000);
        this.monitoring.trackEvent('cache-optimization.started', {
            analysisInterval: this.config.analysisInterval,
            targetHitRate: this.config.targetHitRate,
        });
    }
    /**
     * Stop cache optimization analysis
     */
    stop() {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = undefined;
        }
    }
    /**
     * Record cache access for pattern analysis
     */
    recordAccess(key, wasHit, ttl) {
        if (!this.config.enabled) {
            return;
        }
        const now = new Date();
        const pattern = this.accessPatterns.get(key) || {
            key,
            accessCount: 0,
            lastAccessed: now,
            firstAccessed: now,
            averageInterval: 0,
            cacheHitRate: 0,
            hits: 0,
            misses: 0,
        };
        pattern.accessCount++;
        pattern.lastAccessed = now;
        if (wasHit) {
            pattern.hits = (pattern.hits || 0) + 1;
        }
        else {
            pattern.misses = (pattern.misses || 0) + 1;
        }
        // Calculate hit rate
        const total = (pattern.hits || 0) + (pattern.misses || 0);
        pattern.cacheHitRate = total > 0 ? ((pattern.hits || 0) / total) * 100 : 0;
        // Calculate average interval (simplified - time since first access / access count)
        const timeSinceFirst = (now.getTime() - pattern.firstAccessed.getTime()) / 1000;
        pattern.averageInterval = pattern.accessCount > 1
            ? timeSinceFirst / (pattern.accessCount - 1)
            : 0;
        // Recommend TTL based on access pattern
        if (this.config.ttlOptimizationEnabled && pattern.averageInterval > 0) {
            // Recommend TTL as 2x the average interval, with min/max bounds
            const recommendedTTL = Math.max(60, // Minimum 1 minute
            Math.min(3600, // Maximum 1 hour
            pattern.averageInterval * 2));
            pattern.recommendedTTL = Math.round(recommendedTTL);
        }
        this.accessPatterns.set(key, pattern);
        // Track metric
        this.monitoring.trackMetric('cache-optimization.access', 1, {
            key: this.normalizeKey(key),
            wasHit: wasHit.toString(),
        });
    }
    /**
     * Analyze cache performance and generate optimization report
     */
    async analyzeAndOptimize() {
        const startTime = Date.now();
        try {
            // Get current cache statistics
            const stats = this.cacheMonitor
                ? await this.cacheMonitor.getAggregatedStats()
                : null;
            const overallHitRate = stats?.aggregated.overallHitRate || 0;
            const hitRateGap = this.config.targetHitRate - overallHitRate;
            // Generate recommendations
            const recommendations = await this.generateRecommendations(stats, overallHitRate);
            // Identify top missed keys
            const topMissedKeys = this.identifyTopMissedKeys();
            // Calculate optimization score (0-100)
            const optimizationScore = this.calculateOptimizationScore(overallHitRate, recommendations, hitRateGap);
            // Generate access patterns report
            const accessPatterns = Array.from(this.accessPatterns.values())
                .sort((a, b) => b.accessCount - a.accessCount)
                .slice(0, 100); // Top 100 most accessed keys
            const report = {
                timestamp: new Date(),
                overallHitRate,
                targetHitRate: this.config.targetHitRate,
                hitRateGap,
                recommendations,
                accessPatterns,
                topMissedKeys,
                optimizationScore,
            };
            // Track metrics
            this.monitoring.trackMetric('cache-optimization.hit-rate', overallHitRate, {});
            this.monitoring.trackMetric('cache-optimization.score', optimizationScore, {});
            this.monitoring.trackMetric('cache-optimization.analysis-duration', Date.now() - startTime, {});
            // Execute optimizations if hit rate is below target
            if (overallHitRate < this.config.targetHitRate && this.config.warmingEnabled) {
                await this.executeOptimizations(recommendations);
            }
            this.lastAnalysis = new Date();
            this.monitoring.trackEvent('cache-optimization.analysis-complete', {
                overallHitRate: overallHitRate.toFixed(2),
                optimizationScore: optimizationScore.toFixed(2),
                recommendationsCount: recommendations.length,
            });
            return report;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'CacheOptimizationService',
                operation: 'analyzeAndOptimize',
            });
            throw error;
        }
    }
    /**
     * Get cache optimization report
     */
    async getReport() {
        return this.analyzeAndOptimize();
    }
    /**
     * Generate cache warming strategies based on access patterns
     */
    async generateWarmingStrategies() {
        const strategies = [];
        // Strategy 1: Frequent access keys
        const frequentKeys = Array.from(this.accessPatterns.values())
            .filter((p) => p.accessCount >= this.config.warmingThreshold)
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, 50)
            .map((p) => p.key);
        if (frequentKeys.length > 0) {
            strategies.push({
                strategy: 'frequent',
                keys: frequentKeys,
                priority: 9,
                estimatedHitRateImprovement: 5, // 5% improvement
            });
        }
        // Strategy 2: Recent access keys (accessed in last hour)
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentKeys = Array.from(this.accessPatterns.values())
            .filter((p) => p.lastAccessed.getTime() > oneHourAgo)
            .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
            .slice(0, 30)
            .map((p) => p.key);
        if (recentKeys.length > 0) {
            strategies.push({
                strategy: 'recent',
                keys: recentKeys,
                priority: 7,
                estimatedHitRateImprovement: 3, // 3% improvement
            });
        }
        // Strategy 3: Predictive (keys with high miss rate but frequent access)
        const predictiveKeys = Array.from(this.accessPatterns.values())
            .filter((p) => p.accessCount >= this.config.warmingThreshold &&
            p.cacheHitRate < 50 // Low hit rate
        )
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, 20)
            .map((p) => p.key);
        if (predictiveKeys.length > 0) {
            strategies.push({
                strategy: 'predictive',
                keys: predictiveKeys,
                priority: 8,
                estimatedHitRateImprovement: 7, // 7% improvement
            });
        }
        return strategies;
    }
    /**
     * Generate optimization recommendations
     */
    async generateRecommendations(stats, currentHitRate) {
        const recommendations = [];
        // Recommendation 1: Hit rate below target
        if (currentHitRate < this.config.targetHitRate) {
            const gap = this.config.targetHitRate - currentHitRate;
            recommendations.push({
                type: 'warming',
                priority: gap > 20 ? 'high' : gap > 10 ? 'medium' : 'low',
                description: `Cache hit rate (${currentHitRate.toFixed(1)}%) is below target (${this.config.targetHitRate}%)`,
                impact: `Improving hit rate to target would reduce database load by ~${gap.toFixed(1)}%`,
                action: 'Enable cache warming for frequently accessed keys',
                estimatedImprovement: Math.min(gap, 15), // Cap at 15% improvement
            });
        }
        // Recommendation 2: TTL optimization
        if (this.config.ttlOptimizationEnabled) {
            const keysWithRecommendations = Array.from(this.accessPatterns.values()).filter((p) => p.recommendedTTL && p.recommendedTTL > 0);
            if (keysWithRecommendations.length > 0) {
                recommendations.push({
                    type: 'ttl',
                    priority: 'medium',
                    description: `${keysWithRecommendations.length} keys have access patterns that suggest TTL optimization`,
                    impact: 'Optimizing TTLs based on access patterns can improve hit rate by 5-10%',
                    action: 'Review and adjust TTL values based on access pattern analysis',
                    estimatedImprovement: 7,
                });
            }
        }
        // Recommendation 3: High invalidation rate
        if (stats?.aggregated.totalInvalidations) {
            const invalidationRate = stats.aggregated.totalInvalidations / (stats.aggregated.totalHits + stats.aggregated.totalMisses);
            if (invalidationRate > 0.1) {
                // More than 10% invalidation rate
                recommendations.push({
                    type: 'invalidation',
                    priority: 'high',
                    description: `High cache invalidation rate (${(invalidationRate * 100).toFixed(1)}%)`,
                    impact: 'Reducing unnecessary invalidations can improve hit rate by 10-15%',
                    action: 'Review invalidation logic and implement more granular invalidation',
                    estimatedImprovement: 12,
                });
            }
        }
        // Recommendation 4: Memory optimization
        if (stats?.aggregated.totalMemoryBytes) {
            const memoryMB = stats.aggregated.totalMemoryBytes / (1024 * 1024);
            if (memoryMB > 100) {
                // More than 100MB
                recommendations.push({
                    type: 'memory',
                    priority: 'low',
                    description: `Cache memory usage is ${memoryMB.toFixed(1)}MB`,
                    impact: 'Optimizing memory usage can improve cache efficiency',
                    action: 'Review cache key design and consider compressing large values',
                    estimatedImprovement: 3,
                });
            }
        }
        return recommendations;
    }
    /**
     * Identify top missed keys
     */
    identifyTopMissedKeys() {
        return Array.from(this.accessPatterns.values())
            .filter((p) => (p.misses || 0) > 0)
            .sort((a, b) => (b.misses || 0) - (a.misses || 0))
            .slice(0, 20)
            .map((p) => this.normalizeKey(p.key));
    }
    /**
     * Calculate optimization score (0-100)
     */
    calculateOptimizationScore(hitRate, recommendations, hitRateGap) {
        let score = 100;
        // Deduct points for hit rate gap
        score -= Math.min(hitRateGap * 2, 40); // Max 40 points deduction
        // Deduct points for high priority recommendations
        const highPriorityCount = recommendations.filter((r) => r.priority === 'high').length;
        score -= highPriorityCount * 10; // 10 points per high priority recommendation
        // Deduct points for medium priority recommendations
        const mediumPriorityCount = recommendations.filter((r) => r.priority === 'medium').length;
        score -= mediumPriorityCount * 5; // 5 points per medium priority recommendation
        return Math.max(0, Math.min(100, score));
    }
    /**
     * Execute optimizations based on recommendations
     */
    async executeOptimizations(recommendations) {
        // Execute warming strategy if recommended
        const warmingRecommendation = recommendations.find((r) => r.type === 'warming');
        if (warmingRecommendation && this.config.warmingEnabled && this.cacheWarming) {
            const strategies = await this.generateWarmingStrategies();
            if (strategies.length > 0) {
                // Execute highest priority strategy
                const topStrategy = strategies.sort((a, b) => b.priority - a.priority)[0];
                this.monitoring.trackEvent('cache-optimization.warming-triggered', {
                    strategy: topStrategy.strategy,
                    keysCount: topStrategy.keys.length,
                    estimatedImprovement: topStrategy.estimatedHitRateImprovement,
                });
                // Note: Actual warming would be implemented based on CacheWarmingService API
                // This is a placeholder for the optimization trigger
            }
        }
    }
    /**
     * Normalize cache key for reporting (remove sensitive data)
     */
    normalizeKey(key) {
        // Remove tenant IDs and other sensitive identifiers for reporting
        return key
            .replace(/tenant:[^:]+/g, 'tenant:***')
            .replace(/user:[^:]+/g, 'user:***')
            .substring(0, 100); // Limit length
    }
    /**
     * Get access patterns for a specific key pattern
     */
    getAccessPatterns(pattern) {
        let patterns = Array.from(this.accessPatterns.values());
        if (pattern) {
            const regex = new RegExp(pattern);
            patterns = patterns.filter((p) => regex.test(p.key));
        }
        return patterns.sort((a, b) => b.accessCount - a.accessCount);
    }
    /**
     * Reset access patterns (for testing or cleanup)
     */
    resetAccessPatterns() {
        this.accessPatterns.clear();
    }
}
//# sourceMappingURL=cache-optimization.service.js.map
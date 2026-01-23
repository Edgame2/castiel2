/**
 * Prompt Analytics Service
 * Tracks prompt usage, performance, and quality metrics
 */
// ============================================
// Service
// ============================================
export class PromptAnalyticsService {
    redis;
    monitoring;
    EVENT_PREFIX = 'prompt:events:';
    METRICS_PREFIX = 'prompt:metrics:';
    DAILY_PREFIX = 'prompt:daily:';
    constructor(redis, monitoring) {
        this.redis = redis;
        this.monitoring = monitoring;
    }
    // ============================================
    // Event Recording
    // ============================================
    /**
     * Record a prompt usage event
     */
    async recordUsage(event) {
        try {
            const dateKey = this.getDateKey(event.timestamp);
            const tenantKey = `${this.EVENT_PREFIX}${event.tenantId}:${dateKey}`;
            // Store event (with 30-day retention)
            await this.redis.lpush(tenantKey, JSON.stringify(event));
            await this.redis.expire(tenantKey, 30 * 24 * 60 * 60);
            // Update real-time metrics
            await this.updateMetrics(event);
            // Track in monitoring
            this.monitoring.trackEvent('prompt.used', {
                tenantId: event.tenantId,
                promptId: event.promptId,
                promptSlug: event.promptSlug,
                insightType: event.insightType,
                resolutionLatencyMs: event.resolutionLatencyMs,
                wasFromCache: event.wasFromCache,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'prompt-analytics.recordUsage',
            });
        }
    }
    /**
     * Record prompt fallback (when prompt resolution fails)
     */
    async recordFallback(tenantId, userId, promptSlug, insightType, reason) {
        try {
            const event = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                tenantId,
                userId,
                promptId: 'fallback',
                promptSlug,
                promptScope: 'system',
                insightType,
                resolutionLatencyMs: 0,
                wasFromCache: false,
            };
            const dateKey = this.getDateKey(event.timestamp);
            const fallbackKey = `${this.EVENT_PREFIX}fallback:${tenantId}:${dateKey}`;
            await this.redis.lpush(fallbackKey, JSON.stringify({ ...event, reason }));
            await this.redis.expire(fallbackKey, 30 * 24 * 60 * 60);
            // Update fallback metrics
            const metricsKey = this.getMetricsKey(tenantId, 'day');
            await this.redis.hincrby(metricsKey, 'fallbacks', 1);
            await this.redis.hincrby(metricsKey, `fallback:${promptSlug}`, 1);
            this.monitoring.trackEvent('prompt.fallback', {
                tenantId,
                promptSlug,
                insightType,
                reason,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'prompt-analytics.recordFallback',
            });
        }
    }
    // ============================================
    // Metrics Retrieval
    // ============================================
    /**
     * Get performance metrics for a specific prompt
     */
    async getPromptMetrics(promptId, tenantId, period = 'week') {
        try {
            const metricsKey = `${this.METRICS_PREFIX}${promptId}:${tenantId}:${period}`;
            const data = await this.redis.hgetall(metricsKey);
            if (Object.keys(data).length === 0) {
                return null;
            }
            const totalUsage = parseInt(data.totalUsage || '0', 10);
            const cacheHits = parseInt(data.cacheHits || '0', 10);
            const fallbacks = parseInt(data.fallbacks || '0', 10);
            return {
                promptId,
                promptSlug: data.promptSlug || promptId,
                totalUsage,
                usageByTenant: this.parseJsonField(data.usageByTenant),
                usageByInsightType: this.parseJsonField(data.usageByInsightType),
                avgResolutionLatencyMs: totalUsage > 0
                    ? parseFloat(data.totalResolutionLatencyMs || '0') / totalUsage
                    : 0,
                avgRenderingLatencyMs: totalUsage > 0
                    ? parseFloat(data.totalRenderingLatencyMs || '0') / totalUsage
                    : 0,
                p95ResolutionLatencyMs: parseFloat(data.p95ResolutionLatencyMs || '0'),
                cacheHitRate: totalUsage > 0 ? cacheHits / totalUsage : 0,
                abTestPerformance: data.abTestPerformance
                    ? this.parseJsonField(data.abTestPerformance)
                    : undefined,
                successRate: totalUsage > 0
                    ? (totalUsage - fallbacks) / totalUsage
                    : 1,
                fallbackRate: totalUsage > 0 ? fallbacks / totalUsage : 0,
                period,
                startDate: new Date(data.startDate || Date.now()),
                endDate: new Date(data.endDate || Date.now()),
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'prompt-analytics.getPromptMetrics',
                promptId,
                tenantId,
            });
            return null;
        }
    }
    /**
     * Get quality insights for prompts
     */
    async getQualityInsights(tenantId) {
        const metricsKey = this.getMetricsKey(tenantId, 'week');
        const data = await this.redis.hgetall(metricsKey);
        const insights = [];
        const totalUsage = parseInt(data.totalUsage || '0', 10);
        const fallbacks = parseInt(data.fallbacks || '0', 10);
        const fallbackRate = totalUsage > 0 ? fallbacks / totalUsage : 0;
        // Check fallback rate
        if (fallbackRate > 0.1) {
            insights.push({
                type: 'warning',
                category: 'reliability',
                message: 'High fallback rate detected',
                promptId: 'all',
                promptSlug: 'all',
                metric: 'fallbackRate',
                value: fallbackRate,
                threshold: 0.1,
                recommendation: 'Review prompt resolution logic and ensure prompts are properly configured',
            });
        }
        // Check resolution latency
        const avgResolutionLatency = totalUsage > 0
            ? parseFloat(data.totalResolutionLatencyMs || '0') / totalUsage
            : 0;
        if (avgResolutionLatency > 500) {
            insights.push({
                type: 'improvement',
                category: 'performance',
                message: 'High prompt resolution latency',
                promptId: 'all',
                promptSlug: 'all',
                metric: 'avgResolutionLatencyMs',
                value: avgResolutionLatency,
                threshold: 500,
                recommendation: 'Consider optimizing prompt resolution or increasing cache TTL',
            });
        }
        return insights;
    }
    // ============================================
    // Private Methods
    // ============================================
    async updateMetrics(event) {
        const periods = ['hour', 'day', 'week', 'month'];
        for (const period of periods) {
            const metricsKey = this.getMetricsKey(event.tenantId, period);
            const ttl = this.getMetricsTTL(period);
            // Update usage counts
            await this.redis.hincrby(metricsKey, 'totalUsage', 1);
            await this.redis.hincrby(metricsKey, `prompt:${event.promptId}:usage`, 1);
            await this.redis.hincrby(metricsKey, `insightType:${event.insightType}:usage`, 1);
            // Update latency
            await this.redis.hincrbyfloat(metricsKey, 'totalResolutionLatencyMs', event.resolutionLatencyMs);
            if (event.renderingLatencyMs) {
                await this.redis.hincrbyfloat(metricsKey, 'totalRenderingLatencyMs', event.renderingLatencyMs);
            }
            // Update cache hits
            if (event.wasFromCache) {
                await this.redis.hincrby(metricsKey, 'cacheHits', 1);
                await this.redis.hincrby(metricsKey, `prompt:${event.promptId}:cacheHits`, 1);
            }
            // Update A/B test metrics if applicable
            if (event.wasABTestVariant && event.experimentId && event.variantId) {
                const abKey = `ab:${event.experimentId}:${event.variantId}`;
                await this.redis.hincrby(metricsKey, `${abKey}:usage`, 1);
                await this.redis.hincrbyfloat(metricsKey, `${abKey}:latency`, event.resolutionLatencyMs);
            }
            // Update prompt-specific metrics
            const promptMetricsKey = `${this.METRICS_PREFIX}${event.promptId}:${event.tenantId}:${period}`;
            await this.redis.hincrby(promptMetricsKey, 'totalUsage', 1);
            await this.redis.hincrby(promptMetricsKey, `insightType:${event.insightType}`, 1);
            await this.redis.hincrbyfloat(promptMetricsKey, 'totalResolutionLatencyMs', event.resolutionLatencyMs);
            await this.redis.hset(promptMetricsKey, 'promptSlug', event.promptSlug);
            if (event.wasFromCache) {
                await this.redis.hincrby(promptMetricsKey, 'cacheHits', 1);
            }
            await this.redis.expire(metricsKey, ttl);
            await this.redis.expire(promptMetricsKey, ttl);
        }
        // Update daily metrics
        const dateKey = this.getDateKey(event.timestamp);
        const dailyKey = `${this.DAILY_PREFIX}${event.tenantId}:${dateKey}`;
        await this.redis.hincrby(dailyKey, 'usage', 1);
        await this.redis.hincrby(dailyKey, `prompt:${event.promptId}`, 1);
        await this.redis.hincrbyfloat(dailyKey, 'resolutionLatencyMs', event.resolutionLatencyMs);
        if (event.wasFromCache) {
            await this.redis.hincrby(dailyKey, 'cacheHits', 1);
        }
        await this.redis.expire(dailyKey, 90 * 24 * 60 * 60); // 90 days
    }
    getMetricsKey(tenantId, period) {
        const periodKey = this.getPeriodKey(period);
        return `${this.METRICS_PREFIX}${tenantId}:${period}:${periodKey}`;
    }
    getPeriodKey(period) {
        const now = new Date();
        switch (period) {
            case 'hour':
                return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
            case 'day':
                return this.getDateKey(now);
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                return this.getDateKey(weekStart);
            case 'month':
                return `${now.getFullYear()}-${now.getMonth() + 1}`;
            default:
                return this.getDateKey(now);
        }
    }
    getDateKey(date) {
        return date.toISOString().split('T')[0];
    }
    getMetricsTTL(period) {
        switch (period) {
            case 'hour':
                return 24 * 60 * 60; // 1 day
            case 'day':
                return 7 * 24 * 60 * 60; // 1 week
            case 'week':
                return 30 * 24 * 60 * 60; // 1 month
            case 'month':
                return 365 * 24 * 60 * 60; // 1 year
            default:
                return 7 * 24 * 60 * 60;
        }
    }
    parseJsonField(data) {
        if (!data) {
            return {};
        }
        try {
            return JSON.parse(data);
        }
        catch {
            return {};
        }
    }
}
// ============================================
// Factory
// ============================================
export function createPromptAnalyticsService(redis, monitoring) {
    return new PromptAnalyticsService(redis, monitoring);
}
//# sourceMappingURL=prompt-analytics.service.js.map
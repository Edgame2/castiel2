/**
 * AI Analytics Service
 * Tracks and analyzes AI quality metrics, usage, and performance
 */

import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';

// ============================================
// Types
// ============================================

export interface AIUsageEvent {
  id: string;
  timestamp: Date;
  tenantId: string;
  userId: string;
  
  // Request details
  insightType: string;
  modelId: string;
  modelName: string;
  
  // Token usage
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  
  // Performance
  latencyMs: number;
  streamedChunks?: number;
  
  // Cost
  cost: number;
  
  // Quality
  wasFromCache: boolean;
  cacheHitSimilarity?: number;
  
  // Feedback
  feedbackRating?: 'positive' | 'negative' | 'neutral';
  feedbackCategories?: string[];
  wasRegenerated?: boolean;
}

export interface AIMetrics {
  period: string;
  
  // Volume
  totalRequests: number;
  uniqueUsers: number;
  requestsByType: Record<string, number>;
  requestsByModel: Record<string, number>;
  
  // Tokens
  totalInputTokens: number;
  totalOutputTokens: number;
  avgTokensPerRequest: number;
  
  // Performance
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  
  // Cost
  totalCost: number;
  avgCostPerRequest: number;
  costByModel: Record<string, number>;
  
  // Cache
  cacheHitRate: number;
  cacheCostSavings: number;
  
  // Quality
  positiveRatingRate: number;
  negativeRatingRate: number;
  regenerationRate: number;
  
  // Errors
  errorRate: number;
  errorsByType: Record<string, number>;
}

export interface DailyMetrics {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
  avgLatencyMs: number;
  cacheHitRate: number;
  satisfactionRate: number;
}

export interface ModelComparison {
  modelId: string;
  modelName: string;
  requests: number;
  avgLatencyMs: number;
  avgCost: number;
  satisfactionRate: number;
  errorRate: number;
}

export interface QualityInsight {
  type: 'warning' | 'improvement' | 'success';
  category: string;
  message: string;
  metric: string;
  value: number;
  threshold?: number;
  recommendation?: string;
}

// ============================================
// Service
// ============================================

export class AIAnalyticsService {
  private readonly EVENT_PREFIX = 'ai:events:';
  private readonly METRICS_PREFIX = 'ai:metrics:';
  private readonly DAILY_PREFIX = 'ai:daily:';

  constructor(
    private readonly redis: Redis,
    private readonly monitoring: IMonitoringProvider
  ) {}

  // ============================================
  // Event Recording
  // ============================================

  /**
   * Record an AI usage event
   */
  async recordEvent(event: AIUsageEvent): Promise<void> {
    try {
      const dateKey = this.getDateKey(event.timestamp);
      const tenantKey = `${this.EVENT_PREFIX}${event.tenantId}:${dateKey}`;

      // Store event (with 30-day retention)
      await this.redis.lpush(tenantKey, JSON.stringify(event));
      await this.redis.expire(tenantKey, 30 * 24 * 60 * 60);

      // Update real-time metrics
      await this.updateMetrics(event);

      // Track in monitoring
      this.monitoring.trackEvent('ai.request', {
        tenantId: event.tenantId,
        insightType: event.insightType,
        modelId: event.modelId,
        tokens: event.totalTokens,
        latencyMs: event.latencyMs,
        cost: event.cost,
        wasFromCache: event.wasFromCache,
      });
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'ai-analytics.recordEvent',
      });
    }
  }

  /**
   * Record feedback for a request
   */
  async recordFeedback(
    tenantId: string,
    eventId: string,
    feedback: {
      rating: 'positive' | 'negative' | 'neutral';
      categories?: string[];
      wasRegenerated?: boolean;
    }
  ): Promise<void> {
    const metricsKey = this.getMetricsKey(tenantId, 'day');

    if (feedback.rating === 'positive') {
      await this.redis.hincrby(metricsKey, 'positiveFeedback', 1);
    } else if (feedback.rating === 'negative') {
      await this.redis.hincrby(metricsKey, 'negativeFeedback', 1);
    }

    if (feedback.wasRegenerated) {
      await this.redis.hincrby(metricsKey, 'regenerations', 1);
    }

    this.monitoring.trackEvent('ai.feedback', {
      tenantId,
      eventId,
      rating: feedback.rating,
      categories: Array.isArray(feedback.categories) ? feedback.categories.join(',') : feedback.categories,
    });
  }

  // ============================================
  // Metrics Retrieval
  // ============================================

  /**
   * Get metrics for a time period
   */
  async getMetrics(
    tenantId: string,
    period: 'hour' | 'day' | 'week' | 'month'
  ): Promise<AIMetrics> {
    const metricsKey = this.getMetricsKey(tenantId, period);
    const data = await this.redis.hgetall(metricsKey);

    const totalRequests = parseInt(data.totalRequests || '0', 10);
    const cacheHits = parseInt(data.cacheHits || '0', 10);
    const positiveFeedback = parseInt(data.positiveFeedback || '0', 10);
    const negativeFeedback = parseInt(data.negativeFeedback || '0', 10);
    const totalFeedback = positiveFeedback + negativeFeedback;

    return {
      period,
      totalRequests,
      uniqueUsers: parseInt(data.uniqueUsers || '0', 10),
      requestsByType: this.parseJsonField(data.requestsByType),
      requestsByModel: this.parseJsonField(data.requestsByModel),
      totalInputTokens: parseInt(data.totalInputTokens || '0', 10),
      totalOutputTokens: parseInt(data.totalOutputTokens || '0', 10),
      avgTokensPerRequest: totalRequests > 0
        ? (parseInt(data.totalInputTokens || '0', 10) +
            parseInt(data.totalOutputTokens || '0', 10)) /
          totalRequests
        : 0,
      avgLatencyMs: totalRequests > 0
        ? parseFloat(data.totalLatencyMs || '0') / totalRequests
        : 0,
      p50LatencyMs: parseFloat(data.p50LatencyMs || '0'),
      p95LatencyMs: parseFloat(data.p95LatencyMs || '0'),
      p99LatencyMs: parseFloat(data.p99LatencyMs || '0'),
      totalCost: parseFloat(data.totalCost || '0'),
      avgCostPerRequest: totalRequests > 0
        ? parseFloat(data.totalCost || '0') / totalRequests
        : 0,
      costByModel: this.parseJsonField(data.costByModel),
      cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
      cacheCostSavings: parseFloat(data.cacheCostSavings || '0'),
      positiveRatingRate: totalFeedback > 0 ? positiveFeedback / totalFeedback : 0,
      negativeRatingRate: totalFeedback > 0 ? negativeFeedback / totalFeedback : 0,
      regenerationRate: totalRequests > 0
        ? parseInt(data.regenerations || '0', 10) / totalRequests
        : 0,
      errorRate: totalRequests > 0
        ? parseInt(data.errors || '0', 10) / totalRequests
        : 0,
      errorsByType: this.parseJsonField(data.errorsByType),
    };
  }

  /**
   * Get daily metrics for a date range
   */
  async getDailyMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyMetrics[]> {
    const results: DailyMetrics[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = this.getDateKey(current);
      const dailyKey = `${this.DAILY_PREFIX}${tenantId}:${dateKey}`;
      const data = await this.redis.hgetall(dailyKey);

      if (Object.keys(data).length > 0) {
        const requests = parseInt(data.requests || '0', 10);
        const cacheHits = parseInt(data.cacheHits || '0', 10);
        const positive = parseInt(data.positive || '0', 10);
        const total = parseInt(data.totalFeedback || '0', 10);

        results.push({
          date: dateKey,
          requests,
          tokens: parseInt(data.tokens || '0', 10),
          cost: parseFloat(data.cost || '0'),
          avgLatencyMs: requests > 0
            ? parseFloat(data.latencyMs || '0') / requests
            : 0,
          cacheHitRate: requests > 0 ? cacheHits / requests : 0,
          satisfactionRate: total > 0 ? positive / total : 0,
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  /**
   * Get model comparison metrics
   */
  async getModelComparison(tenantId: string): Promise<ModelComparison[]> {
    const metricsKey = this.getMetricsKey(tenantId, 'month');
    const modelData = await this.redis.hget(metricsKey, 'modelMetrics');

    if (!modelData) {return [];}

    const parsed = this.parseJsonField(modelData);
    if (Array.isArray(parsed)) {
      return parsed as ModelComparison[];
    }
    // If it's an object, convert to array
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed as Record<string, any>).map(([modelId, data]: [string, any]) => ({
        modelId,
        modelName: data.modelName || modelId,
        requests: data.requests || 0,
        avgLatencyMs: data.avgLatencyMs || 0,
        avgCost: data.avgCost || 0,
        satisfactionRate: data.satisfactionRate || 0,
        errorRate: data.errorRate || 0,
      }));
    }
    return [];
  }

  /**
   * Get quality insights and recommendations
   */
  async getQualityInsights(tenantId: string): Promise<QualityInsight[]> {
    const metrics = await this.getMetrics(tenantId, 'week');
    const insights: QualityInsight[] = [];

    // Check cache hit rate
    if (metrics.cacheHitRate < 0.3) {
      insights.push({
        type: 'improvement',
        category: 'caching',
        message: 'Low cache hit rate detected',
        metric: 'cacheHitRate',
        value: metrics.cacheHitRate,
        threshold: 0.3,
        recommendation: 'Consider adjusting similarity threshold or cache TTL',
      });
    } else if (metrics.cacheHitRate > 0.7) {
      insights.push({
        type: 'success',
        category: 'caching',
        message: 'Excellent cache performance',
        metric: 'cacheHitRate',
        value: metrics.cacheHitRate,
      });
    }

    // Check satisfaction rate
    if (metrics.positiveRatingRate < 0.7 && metrics.positiveRatingRate > 0) {
      insights.push({
        type: 'warning',
        category: 'quality',
        message: 'User satisfaction below target',
        metric: 'positiveRatingRate',
        value: metrics.positiveRatingRate,
        threshold: 0.7,
        recommendation: 'Review negative feedback categories for improvements',
      });
    }

    // Check regeneration rate
    if (metrics.regenerationRate > 0.2) {
      insights.push({
        type: 'warning',
        category: 'quality',
        message: 'High regeneration rate indicates quality issues',
        metric: 'regenerationRate',
        value: metrics.regenerationRate,
        threshold: 0.2,
        recommendation: 'Consider using higher-tier models for complex queries',
      });
    }

    // Check error rate
    if (metrics.errorRate > 0.05) {
      insights.push({
        type: 'warning',
        category: 'reliability',
        message: 'Error rate above acceptable threshold',
        metric: 'errorRate',
        value: metrics.errorRate,
        threshold: 0.05,
        recommendation: 'Review error logs and implement fallback strategies',
      });
    }

    // Check average latency
    if (metrics.avgLatencyMs > 5000) {
      insights.push({
        type: 'improvement',
        category: 'performance',
        message: 'Average latency is high',
        metric: 'avgLatencyMs',
        value: metrics.avgLatencyMs,
        threshold: 5000,
        recommendation: 'Consider using faster models or enabling streaming',
      });
    }

    // Cost efficiency
    if (metrics.avgCostPerRequest > 0.05) {
      insights.push({
        type: 'improvement',
        category: 'cost',
        message: 'High average cost per request',
        metric: 'avgCostPerRequest',
        value: metrics.avgCostPerRequest,
        threshold: 0.05,
        recommendation: 'Enable smart model routing to reduce costs',
      });
    }

    return insights;
  }

  // ============================================
  // Private Methods
  // ============================================

  private async updateMetrics(event: AIUsageEvent): Promise<void> {
    const periods: Array<'hour' | 'day' | 'week' | 'month'> = ['hour', 'day', 'week', 'month'];

    for (const period of periods) {
      const metricsKey = this.getMetricsKey(event.tenantId, period);
      const ttl = this.getMetricsTTL(period);

      await this.redis.hincrby(metricsKey, 'totalRequests', 1);
      await this.redis.hincrby(metricsKey, 'totalInputTokens', event.inputTokens);
      await this.redis.hincrby(metricsKey, 'totalOutputTokens', event.outputTokens);
      await this.redis.hincrbyfloat(metricsKey, 'totalLatencyMs', event.latencyMs);
      await this.redis.hincrbyfloat(metricsKey, 'totalCost', event.cost);

      if (event.wasFromCache) {
        await this.redis.hincrby(metricsKey, 'cacheHits', 1);
        await this.redis.hincrbyfloat(metricsKey, 'cacheCostSavings', event.cost);
      }

      // Update by type
      await this.redis.hincrby(metricsKey, `type:${event.insightType}`, 1);

      // Update by model
      await this.redis.hincrby(metricsKey, `model:${event.modelId}`, 1);

      await this.redis.expire(metricsKey, ttl);
    }

    // Update daily metrics
    const dateKey = this.getDateKey(event.timestamp);
    const dailyKey = `${this.DAILY_PREFIX}${event.tenantId}:${dateKey}`;

    await this.redis.hincrby(dailyKey, 'requests', 1);
    await this.redis.hincrby(dailyKey, 'tokens', event.totalTokens);
    await this.redis.hincrbyfloat(dailyKey, 'cost', event.cost);
    await this.redis.hincrbyfloat(dailyKey, 'latencyMs', event.latencyMs);

    if (event.wasFromCache) {
      await this.redis.hincrby(dailyKey, 'cacheHits', 1);
    }

    await this.redis.expire(dailyKey, 90 * 24 * 60 * 60); // 90 days
  }

  private getMetricsKey(tenantId: string, period: string): string {
    const periodKey = this.getPeriodKey(period);
    return `${this.METRICS_PREFIX}${tenantId}:${period}:${periodKey}`;
  }

  private getPeriodKey(period: string): string {
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

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getMetricsTTL(period: string): number {
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

  private parseJsonField(data: string | undefined): Record<string, number> {
    if (!data) {return {};}
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
}

// ============================================
// Factory
// ============================================

export function createAIAnalyticsService(
  redis: Redis,
  monitoring: IMonitoringProvider
): AIAnalyticsService {
  return new AIAnalyticsService(redis, monitoring);
}












/**
 * AI Analytics Service
 * Tracks and analyzes AI quality metrics, usage, and performance
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
export interface AIUsageEvent {
    id: string;
    timestamp: Date;
    tenantId: string;
    userId: string;
    insightType: string;
    modelId: string;
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latencyMs: number;
    streamedChunks?: number;
    cost: number;
    wasFromCache: boolean;
    cacheHitSimilarity?: number;
    feedbackRating?: 'positive' | 'negative' | 'neutral';
    feedbackCategories?: string[];
    wasRegenerated?: boolean;
}
export interface AIMetrics {
    period: string;
    totalRequests: number;
    uniqueUsers: number;
    requestsByType: Record<string, number>;
    requestsByModel: Record<string, number>;
    totalInputTokens: number;
    totalOutputTokens: number;
    avgTokensPerRequest: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    totalCost: number;
    avgCostPerRequest: number;
    costByModel: Record<string, number>;
    cacheHitRate: number;
    cacheCostSavings: number;
    positiveRatingRate: number;
    negativeRatingRate: number;
    regenerationRate: number;
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
export declare class AIAnalyticsService {
    private readonly redis;
    private readonly monitoring;
    private readonly EVENT_PREFIX;
    private readonly METRICS_PREFIX;
    private readonly DAILY_PREFIX;
    constructor(redis: Redis, monitoring: IMonitoringProvider);
    /**
     * Record an AI usage event
     */
    recordEvent(event: AIUsageEvent): Promise<void>;
    /**
     * Record feedback for a request
     */
    recordFeedback(tenantId: string, eventId: string, feedback: {
        rating: 'positive' | 'negative' | 'neutral';
        categories?: string[];
        wasRegenerated?: boolean;
    }): Promise<void>;
    /**
     * Get metrics for a time period
     */
    getMetrics(tenantId: string, period: 'hour' | 'day' | 'week' | 'month'): Promise<AIMetrics>;
    /**
     * Get daily metrics for a date range
     */
    getDailyMetrics(tenantId: string, startDate: Date, endDate: Date): Promise<DailyMetrics[]>;
    /**
     * Get model comparison metrics
     */
    getModelComparison(tenantId: string): Promise<ModelComparison[]>;
    /**
     * Get quality insights and recommendations
     */
    getQualityInsights(tenantId: string): Promise<QualityInsight[]>;
    private updateMetrics;
    private getMetricsKey;
    private getPeriodKey;
    private getDateKey;
    private getMetricsTTL;
    private parseJsonField;
}
export declare function createAIAnalyticsService(redis: Redis, monitoring: IMonitoringProvider): AIAnalyticsService;
//# sourceMappingURL=ai-analytics.service.d.ts.map
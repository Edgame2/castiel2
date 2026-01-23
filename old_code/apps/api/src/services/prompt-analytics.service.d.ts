/**
 * Prompt Analytics Service
 * Tracks prompt usage, performance, and quality metrics
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
export interface PromptUsageEvent {
    id: string;
    timestamp: Date;
    tenantId: string;
    userId: string;
    promptId: string;
    promptSlug: string;
    promptScope: 'system' | 'tenant' | 'user';
    insightType: string;
    resolutionLatencyMs: number;
    renderingLatencyMs?: number;
    wasFromCache: boolean;
    wasABTestVariant?: boolean;
    experimentId?: string;
    variantId?: string;
}
export interface PromptPerformanceMetrics {
    promptId: string;
    promptSlug: string;
    totalUsage: number;
    usageByTenant: Record<string, number>;
    usageByInsightType: Record<string, number>;
    avgResolutionLatencyMs: number;
    avgRenderingLatencyMs: number;
    p95ResolutionLatencyMs: number;
    cacheHitRate: number;
    abTestPerformance?: {
        experimentId: string;
        variantId: string;
        usage: number;
        avgLatencyMs: number;
    }[];
    successRate: number;
    fallbackRate: number;
    period: 'hour' | 'day' | 'week' | 'month';
    startDate: Date;
    endDate: Date;
}
export interface PromptQualityInsight {
    type: 'warning' | 'improvement' | 'success';
    category: string;
    message: string;
    promptId: string;
    promptSlug: string;
    metric: string;
    value: number;
    threshold?: number;
    recommendation?: string;
}
export declare class PromptAnalyticsService {
    private readonly redis;
    private readonly monitoring;
    private readonly EVENT_PREFIX;
    private readonly METRICS_PREFIX;
    private readonly DAILY_PREFIX;
    constructor(redis: Redis, monitoring: IMonitoringProvider);
    /**
     * Record a prompt usage event
     */
    recordUsage(event: PromptUsageEvent): Promise<void>;
    /**
     * Record prompt fallback (when prompt resolution fails)
     */
    recordFallback(tenantId: string, userId: string, promptSlug: string, insightType: string, reason: string): Promise<void>;
    /**
     * Get performance metrics for a specific prompt
     */
    getPromptMetrics(promptId: string, tenantId: string, period?: 'hour' | 'day' | 'week' | 'month'): Promise<PromptPerformanceMetrics | null>;
    /**
     * Get quality insights for prompts
     */
    getQualityInsights(tenantId: string): Promise<PromptQualityInsight[]>;
    private updateMetrics;
    private getMetricsKey;
    private getPeriodKey;
    private getDateKey;
    private getMetricsTTL;
    private parseJsonField;
}
export declare function createPromptAnalyticsService(redis: Redis, monitoring: IMonitoringProvider): PromptAnalyticsService;
//# sourceMappingURL=prompt-analytics.service.d.ts.map
/**
 * Proactive Insights Analytics Service
 * Tracks and analyzes delivery metrics, engagement, and trigger performance
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ProactiveInsightsRepository } from '../repositories/proactive-insights.repository.js';
import { ProactiveInsightType, DeliveryChannel } from '../types/proactive-insights.types.js';
export interface DeliveryMetrics {
    period: string;
    totalInsights: number;
    totalDeliveries: number;
    insightsByType: Record<string, number>;
    insightsByPriority: Record<string, number>;
    deliveriesByChannel: Record<DeliveryChannel, number>;
    deliverySuccessRate: number;
    deliveryFailureRate: number;
    avgDeliveryLatencyMs: number;
    acknowledgmentRate: number;
    dismissalRate: number;
    actionRate: number;
    avgTimeToAcknowledgeMs: number;
    avgTimeToActionMs: number;
    insightsByTrigger: Record<string, number>;
    topTriggers: Array<{
        triggerId: string;
        triggerName: string;
        count: number;
    }>;
}
export interface DailyDeliveryMetrics {
    date: string;
    insightsGenerated: number;
    deliveriesSent: number;
    deliveriesFailed: number;
    acknowledgments: number;
    dismissals: number;
    actions: number;
}
export interface TriggerPerformance {
    triggerId: string;
    triggerName: string;
    triggerType: ProactiveInsightType;
    totalInsights: number;
    deliverySuccessRate: number;
    acknowledgmentRate: number;
    actionRate: number;
    avgTimeToAcknowledgeMs: number;
}
export interface ChannelPerformance {
    channel: DeliveryChannel;
    totalDeliveries: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    avgLatencyMs: number;
}
export declare class ProactiveInsightsAnalyticsService {
    private readonly redis;
    private readonly monitoring;
    private readonly repository;
    private readonly EVENT_PREFIX;
    private readonly METRICS_PREFIX;
    constructor(redis: Redis, monitoring: IMonitoringProvider, repository: ProactiveInsightsRepository);
    /**
     * Record a delivery event
     */
    recordDeliveryEvent(params: {
        tenantId: string;
        insightId: string;
        channel: DeliveryChannel;
        status: 'sent' | 'failed';
        latencyMs?: number;
        timestamp?: Date;
    }): Promise<void>;
    /**
     * Record an engagement event (acknowledgment, dismissal, action)
     */
    recordEngagementEvent(params: {
        tenantId: string;
        insightId: string;
        eventType: 'acknowledged' | 'dismissed' | 'actioned';
        timeToEventMs?: number;
        timestamp?: Date;
    }): Promise<void>;
    /**
     * Get delivery metrics for a time period
     */
    getDeliveryMetrics(tenantId: string, period?: 'hour' | 'day' | 'week' | 'month'): Promise<DeliveryMetrics>;
    /**
     * Get daily metrics for a date range
     */
    getDailyMetrics(tenantId: string, startDate: Date, endDate: Date): Promise<DailyDeliveryMetrics[]>;
    /**
     * Get trigger performance metrics
     */
    getTriggerPerformance(tenantId: string, triggerId?: string): Promise<TriggerPerformance[]>;
    /**
     * Get channel performance metrics
     */
    getChannelPerformance(tenantId: string, period?: 'hour' | 'day' | 'week' | 'month'): Promise<ChannelPerformance[]>;
    private updateDeliveryMetrics;
    private updateEngagementMetrics;
    private getMetricsKey;
    private getPeriodKey;
    private getPeriodStart;
    private getMetricsTTL;
    private getDateKey;
}
//# sourceMappingURL=proactive-insights-analytics.service.d.ts.map
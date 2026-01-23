/**
 * Proactive Insights Analytics Service
 * Tracks and analyzes delivery metrics, engagement, and trigger performance
 */

import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { ProactiveInsightsRepository } from '../repositories/proactive-insights.repository.js';
import {
  ProactiveInsightType,
  DeliveryChannel,
} from '../types/proactive-insights.types.js';

// ============================================
// Types
// ============================================

export interface DeliveryMetrics {
  period: string;
  
  // Volume
  totalInsights: number;
  totalDeliveries: number;
  insightsByType: Record<string, number>;
  insightsByPriority: Record<string, number>;
  
  // Delivery
  deliveriesByChannel: Record<DeliveryChannel, number>;
  deliverySuccessRate: number;
  deliveryFailureRate: number;
  avgDeliveryLatencyMs: number;
  
  // Engagement
  acknowledgmentRate: number;
  dismissalRate: number;
  actionRate: number;
  avgTimeToAcknowledgeMs: number;
  avgTimeToActionMs: number;
  
  // Triggers
  insightsByTrigger: Record<string, number>;
  topTriggers: Array<{ triggerId: string; triggerName: string; count: number }>;
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

// ============================================
// Service
// ============================================

export class ProactiveInsightsAnalyticsService {
  private readonly EVENT_PREFIX = 'proactive:events:';
  private readonly METRICS_PREFIX = 'proactive:metrics:';
  // private readonly DAILY_PREFIX = 'proactive:daily:'; // Reserved for future use

  constructor(
    private readonly redis: Redis,
    private readonly monitoring: IMonitoringProvider,
    private readonly repository: ProactiveInsightsRepository
  ) {}

  // ============================================
  // Event Recording
  // ============================================

  /**
   * Record a delivery event
   */
  async recordDeliveryEvent(params: {
    tenantId: string;
    insightId: string;
    channel: DeliveryChannel;
    status: 'sent' | 'failed';
    latencyMs?: number;
    timestamp?: Date;
  }): Promise<void> {
    const { tenantId, insightId, channel, status, latencyMs, timestamp = new Date() } = params;

    try {
      const dateKey = this.getDateKey(timestamp);
      const tenantKey = `${this.EVENT_PREFIX}${tenantId}:${dateKey}`;

      // Store event (with 30-day retention)
      await this.redis.lpush(tenantKey, JSON.stringify({
        id: `${insightId}-${channel}-${Date.now()}`,
        timestamp: timestamp.toISOString(),
        tenantId,
        insightId,
        channel,
        status,
        latencyMs,
      }));
      await this.redis.expire(tenantKey, 30 * 24 * 60 * 60);

      // Update real-time metrics
      await this.updateDeliveryMetrics(tenantId, channel, status, latencyMs || 0);

      // Track in monitoring
      this.monitoring.trackEvent('proactive.delivery.recorded', {
        tenantId,
        insightId,
        channel,
        status,
        latencyMs,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'proactive.analytics.recordDeliveryEvent',
        tenantId,
        insightId,
      });
    }
  }

  /**
   * Record an engagement event (acknowledgment, dismissal, action)
   */
  async recordEngagementEvent(params: {
    tenantId: string;
    insightId: string;
    eventType: 'acknowledged' | 'dismissed' | 'actioned';
    timeToEventMs?: number;
    timestamp?: Date;
  }): Promise<void> {
    const { tenantId, insightId, eventType, timeToEventMs, timestamp = new Date() } = params;

    try {
      const dateKey = this.getDateKey(timestamp);
      const tenantKey = `${this.EVENT_PREFIX}${tenantId}:${dateKey}`;

      await this.redis.lpush(tenantKey, JSON.stringify({
        id: `${insightId}-${eventType}-${Date.now()}`,
        timestamp: timestamp.toISOString(),
        tenantId,
        insightId,
        eventType,
        timeToEventMs,
      }));
      await this.redis.expire(tenantKey, 30 * 24 * 60 * 60);

      // Update engagement metrics
      await this.updateEngagementMetrics(tenantId, eventType, timeToEventMs || 0);

      this.monitoring.trackEvent('proactive.engagement.recorded', {
        tenantId,
        insightId,
        eventType,
        timeToEventMs,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'proactive.analytics.recordEngagementEvent',
        tenantId,
        insightId,
      });
    }
  }

  // ============================================
  // Metrics Retrieval
  // ============================================

  /**
   * Get delivery metrics for a time period
   */
  async getDeliveryMetrics(
    tenantId: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<DeliveryMetrics> {
    // Get insights from repository for stats
    // Note: Redis metrics are recorded but we use repository data for comprehensive stats
    const since = this.getPeriodStart(period);
    const allInsights = await this.repository.listInsights(tenantId, {
      limit: 1000, // Get enough for stats
      orderBy: 'createdAt',
      order: 'desc',
    });

    // Filter insights by period
    const periodInsights = allInsights.insights.filter(
      i => i.createdAt >= since
    );

    // Calculate metrics
    const totalInsights = periodInsights.length;
    const totalDeliveries = periodInsights.reduce(
      (sum, i) => sum + (i.deliveries?.length || 0),
      0
    );

    // Insights by type
    const insightsByType: Record<string, number> = {};
    periodInsights.forEach(i => {
      insightsByType[i.type] = (insightsByType[i.type] || 0) + 1;
    });

    // Insights by priority
    const insightsByPriority: Record<string, number> = {};
    periodInsights.forEach(i => {
      insightsByPriority[i.priority] = (insightsByPriority[i.priority] || 0) + 1;
    });

    // Delivery stats
    const deliveriesByChannel: Record<DeliveryChannel, number> = {
      in_app: 0,
      dashboard: 0,
      email: 0,
      email_digest: 0,
      webhook: 0,
    };
    let successfulDeliveries = 0;
    let failedDeliveries = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    periodInsights.forEach(insight => {
      insight.deliveries?.forEach(delivery => {
        deliveriesByChannel[delivery.channel] = (deliveriesByChannel[delivery.channel] || 0) + 1;
        if (delivery.status === 'sent') {
          successfulDeliveries++;
          if (delivery.sentAt && delivery.scheduledAt) {
            const latency = delivery.sentAt.getTime() - delivery.scheduledAt.getTime();
            totalLatency += latency;
            latencyCount++;
          }
        } else if (delivery.status === 'failed') {
          failedDeliveries++;
        }
      });
    });

    // Engagement stats
    const acknowledged = periodInsights.filter(i => i.status === 'acknowledged').length;
    const dismissed = periodInsights.filter(i => i.status === 'dismissed').length;
    const actioned = periodInsights.filter(i => i.status === 'actioned').length;

    let totalTimeToAcknowledge = 0;
    let acknowledgeCount = 0;
    let totalTimeToAction = 0;
    let actionCount = 0;

    periodInsights.forEach(insight => {
      if (insight.acknowledgedAt && insight.createdAt) {
        const timeToAck = insight.acknowledgedAt.getTime() - insight.createdAt.getTime();
        totalTimeToAcknowledge += timeToAck;
        acknowledgeCount++;
      }
      if (insight.actionedAt && insight.createdAt) {
        const timeToAction = insight.actionedAt.getTime() - insight.createdAt.getTime();
        totalTimeToAction += timeToAction;
        actionCount++;
      }
    });

    // Trigger stats
    const insightsByTrigger: Record<string, number> = {};
    periodInsights.forEach(i => {
      if (i.triggerId) {
        insightsByTrigger[i.triggerId] = (insightsByTrigger[i.triggerId] || 0) + 1;
      }
    });

    const topTriggers = Object.entries(insightsByTrigger)
      .map(([triggerId, count]) => {
        const insight = periodInsights.find(i => i.triggerId === triggerId);
        return {
          triggerId,
          triggerName: insight?.triggerName || triggerId,
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      period,
      totalInsights,
      totalDeliveries,
      insightsByType,
      insightsByPriority,
      deliveriesByChannel,
      deliverySuccessRate: totalDeliveries > 0 ? successfulDeliveries / totalDeliveries : 0,
      deliveryFailureRate: totalDeliveries > 0 ? failedDeliveries / totalDeliveries : 0,
      avgDeliveryLatencyMs: latencyCount > 0 ? totalLatency / latencyCount : 0,
      acknowledgmentRate: totalInsights > 0 ? acknowledged / totalInsights : 0,
      dismissalRate: totalInsights > 0 ? dismissed / totalInsights : 0,
      actionRate: totalInsights > 0 ? actioned / totalInsights : 0,
      avgTimeToAcknowledgeMs: acknowledgeCount > 0 ? totalTimeToAcknowledge / acknowledgeCount : 0,
      avgTimeToActionMs: actionCount > 0 ? totalTimeToAction / actionCount : 0,
      insightsByTrigger,
      topTriggers,
    };
  }

  /**
   * Get daily metrics for a date range
   */
  async getDailyMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyDeliveryMetrics[]> {
    const results: DailyDeliveryMetrics[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = this.getDateKey(current);
      // const dailyKey = `${this.DAILY_PREFIX}${tenantId}:${dateKey}`;
      // const redisData = await this.redis.hgetall(dailyKey);

      // Get insights for this day
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const dayInsights = await this.repository.listInsights(tenantId, {
        limit: 1000,
        orderBy: 'createdAt',
        order: 'desc',
      });

      const filteredInsights = dayInsights.insights.filter(
        i => i.createdAt >= dayStart && i.createdAt <= dayEnd
      );

      const insightsGenerated = filteredInsights.length;
      const deliveriesSent = filteredInsights.reduce(
        (sum, i) => sum + (i.deliveries?.filter(d => d.status === 'sent').length || 0),
        0
      );
      const deliveriesFailed = filteredInsights.reduce(
        (sum, i) => sum + (i.deliveries?.filter(d => d.status === 'failed').length || 0),
        0
      );
      const acknowledgments = filteredInsights.filter(i => i.status === 'acknowledged').length;
      const dismissals = filteredInsights.filter(i => i.status === 'dismissed').length;
      const actions = filteredInsights.filter(i => i.status === 'actioned').length;

      results.push({
        date: dateKey,
        insightsGenerated,
        deliveriesSent,
        deliveriesFailed,
        acknowledgments,
        dismissals,
        actions,
      });

      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  /**
   * Get trigger performance metrics
   */
  async getTriggerPerformance(
    tenantId: string,
    triggerId?: string
  ): Promise<TriggerPerformance[]> {
    const allInsights = await this.repository.listInsights(tenantId, {
      triggerId,
      limit: 1000,
      orderBy: 'createdAt',
      order: 'desc',
    });

    // Group by trigger
    const byTrigger = new Map<string, typeof allInsights.insights>();
    allInsights.insights.forEach(insight => {
      if (insight.triggerId) {
        if (!byTrigger.has(insight.triggerId)) {
          byTrigger.set(insight.triggerId, []);
        }
        byTrigger.get(insight.triggerId)!.push(insight);
      }
    });

    const results: TriggerPerformance[] = [];

    for (const [tId, insights] of byTrigger.entries()) {
      const totalInsights = insights.length;
      const totalDeliveries = insights.reduce(
        (sum, i) => sum + (i.deliveries?.length || 0),
        0
      );
      const successfulDeliveries = insights.reduce(
        (sum, i) => sum + (i.deliveries?.filter(d => d.status === 'sent').length || 0),
        0
      );
      const acknowledged = insights.filter(i => i.status === 'acknowledged').length;
      const actioned = insights.filter(i => i.status === 'actioned').length;

      let totalTimeToAck = 0;
      let ackCount = 0;
      insights.forEach(i => {
        if (i.acknowledgedAt && i.createdAt) {
          totalTimeToAck += i.acknowledgedAt.getTime() - i.createdAt.getTime();
          ackCount++;
        }
      });

      results.push({
        triggerId: tId,
        triggerName: insights[0]?.triggerName || tId,
        triggerType: insights[0]?.type || 'unknown' as ProactiveInsightType,
        totalInsights,
        deliverySuccessRate: totalDeliveries > 0 ? successfulDeliveries / totalDeliveries : 0,
        acknowledgmentRate: totalInsights > 0 ? acknowledged / totalInsights : 0,
        actionRate: totalInsights > 0 ? actioned / totalInsights : 0,
        avgTimeToAcknowledgeMs: ackCount > 0 ? totalTimeToAck / ackCount : 0,
      });
    }

    return results;
  }

  /**
   * Get channel performance metrics
   */
  async getChannelPerformance(
    tenantId: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<ChannelPerformance[]> {
    const since = this.getPeriodStart(period);
    const allInsights = await this.repository.listInsights(tenantId, {
      limit: 1000,
      orderBy: 'createdAt',
      order: 'desc',
    });

    const periodInsights = allInsights.insights.filter(i => i.createdAt >= since);

    const channelStats = new Map<DeliveryChannel, {
      total: number;
      success: number;
      failure: number;
      totalLatency: number;
      latencyCount: number;
    }>();

    periodInsights.forEach(insight => {
      insight.deliveries?.forEach(delivery => {
        if (!channelStats.has(delivery.channel)) {
          channelStats.set(delivery.channel, {
            total: 0,
            success: 0,
            failure: 0,
            totalLatency: 0,
            latencyCount: 0,
          });
        }

        const stats = channelStats.get(delivery.channel)!;
        stats.total++;
        if (delivery.status === 'sent') {
          stats.success++;
          if (delivery.sentAt && delivery.scheduledAt) {
            const latency = delivery.sentAt.getTime() - delivery.scheduledAt.getTime();
            stats.totalLatency += latency;
            stats.latencyCount++;
          }
        } else if (delivery.status === 'failed') {
          stats.failure++;
        }
      });
    });

    return Array.from(channelStats.entries()).map(([channel, stats]) => ({
      channel,
      totalDeliveries: stats.total,
      successCount: stats.success,
      failureCount: stats.failure,
      successRate: stats.total > 0 ? stats.success / stats.total : 0,
      avgLatencyMs: stats.latencyCount > 0 ? stats.totalLatency / stats.latencyCount : 0,
    }));
  }

  // ============================================
  // Private Methods
  // ============================================

  private async updateDeliveryMetrics(
    tenantId: string,
    channel: DeliveryChannel,
    status: 'sent' | 'failed',
    latencyMs: number
  ): Promise<void> {
    const periods: Array<'hour' | 'day' | 'week' | 'month'> = ['hour', 'day', 'week', 'month'];

    for (const period of periods) {
      const metricsKey = this.getMetricsKey(tenantId, period);
      const ttl = this.getMetricsTTL(period);

      await this.redis.hincrby(metricsKey, 'totalDeliveries', 1);
      await this.redis.hincrby(metricsKey, `channel:${channel}:total`, 1);
      
      if (status === 'sent') {
        await this.redis.hincrby(metricsKey, 'successfulDeliveries', 1);
        await this.redis.hincrby(metricsKey, `channel:${channel}:success`, 1);
      } else {
        await this.redis.hincrby(metricsKey, 'failedDeliveries', 1);
        await this.redis.hincrby(metricsKey, `channel:${channel}:failure`, 1);
      }

      if (latencyMs > 0) {
        await this.redis.hincrbyfloat(metricsKey, 'totalLatencyMs', latencyMs);
        await this.redis.hincrbyfloat(metricsKey, `channel:${channel}:latency`, latencyMs);
      }

      await this.redis.expire(metricsKey, ttl);
    }
  }

  private async updateEngagementMetrics(
    tenantId: string,
    eventType: 'acknowledged' | 'dismissed' | 'actioned',
    timeToEventMs: number
  ): Promise<void> {
    const periods: Array<'hour' | 'day' | 'week' | 'month'> = ['hour', 'day', 'week', 'month'];

    for (const period of periods) {
      const metricsKey = this.getMetricsKey(tenantId, period);
      const ttl = this.getMetricsTTL(period);

      await this.redis.hincrby(metricsKey, `engagement:${eventType}`, 1);
      if (timeToEventMs > 0) {
        await this.redis.hincrbyfloat(metricsKey, `engagement:${eventType}:time`, timeToEventMs);
      }

      await this.redis.expire(metricsKey, ttl);
    }
  }

  private getMetricsKey(tenantId: string, period: string): string {
    const periodKey = this.getPeriodKey(period);
    return `${this.METRICS_PREFIX}${tenantId}:${periodKey}`;
  }

  private getPeriodKey(period: string): string {
    const now = new Date();
    switch (period) {
      case 'hour':
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
      case 'day':
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + 1) / 7)).padStart(2, '0')}`;
      case 'month':
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      default:
        return this.getPeriodKey('day');
    }
  }

  private getPeriodStart(period: 'hour' | 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (period) {
      case 'hour':
        const hourStart = new Date(now);
        hourStart.setMinutes(0, 0, 0);
        return hourStart;
      case 'day':
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        return dayStart;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      case 'month':
        const monthStart = new Date(now);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        return monthStart;
      default:
        return this.getPeriodStart('day');
    }
  }

  private getMetricsTTL(period: string): number {
    switch (period) {
      case 'hour':
        return 24 * 60 * 60; // 24 hours
      case 'day':
        return 7 * 24 * 60 * 60; // 7 days
      case 'week':
        return 30 * 24 * 60 * 60; // 30 days
      case 'month':
        return 90 * 24 * 60 * 60; // 90 days
      default:
        return 7 * 24 * 60 * 60;
    }
  }

  private getDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}


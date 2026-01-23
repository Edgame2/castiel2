// @ts-nocheck
/**
 * Analytics & Metrics Service
 * Usage analytics, trending, predictive insights, and reporting
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  AnalyticsEvent,
  UsageMetric,
  AggregateMetric,
  TrendingAnalysis,
  TrendDirection,
  PredictiveInsight,
  DashboardMetric,
  CustomMetricDefinition,
  UserBehaviorAnalytics,
  FeatureAdoptionMetrics,
  PerformanceMetrics,
  ConversionFunnel,
  AnalyticsReport,
  AnalyticsComparison,
  TimeAggregation,
} from '../types/analytics.types';
import { CosmosDBService } from './cosmos-db.service';
import { CacheService } from './cache.service';
import { ProjectActivityService } from './project-activity.service';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly ANALYTICS_CACHE_TTL = 3600; // 1 hour
  private readonly EVENTS_CACHE_TTL = 300; // 5 minutes

  constructor(
    @Inject(CosmosDBService) private cosmosDB: CosmosDBService,
    @Inject(CacheService) private cache: CacheService,
    @Inject(ProjectActivityService) private activityService: ProjectActivityService,
    @Inject(PerformanceMonitoringService) private performanceMonitoring: PerformanceMonitoringService,
  ) {}

  /**
   * Track analytics event
   */
  async trackEvent(tenantId: string, event: Partial<AnalyticsEvent>): Promise<AnalyticsEvent> {
    try {
      const analyticsEvent: AnalyticsEvent = {
        id: uuidv4(),
        tenantId,
        userId: event.userId || 'anonymous',
        projectId: event.projectId,
        eventType: event.eventType || 'custom',
        eventName: event.eventName || 'event',
        category: event.category || 'general',
        action: event.action || 'action',
        label: event.label,
        value: event.value,
        metadata: event.metadata || {},
        timestamp: new Date(),
        sessionId: event.sessionId,
        duration: event.duration,
        url: event.url,
        referrer: event.referrer,
        userAgent: event.userAgent,
        ipAddress: event.ipAddress,
        ttl: 7776000, // 90 days
      };

      // Save event
      await this.cosmosDB.upsertDocument('analytics-events', analyticsEvent, tenantId);

      // Invalidate cache for trending/aggregates
      await this.invalidateEventCache(tenantId, event.projectId);

      return analyticsEvent;
    } catch (error) {
      this.logger.warn(`Failed to track event: ${error.message}`);
      return {} as AnalyticsEvent;
    }
  }

  /**
   * Batch track events
   */
  async trackBatchEvents(tenantId: string, events: Partial<AnalyticsEvent>[]): Promise<AnalyticsEvent[]> {
    try {
      const tracked: AnalyticsEvent[] = [];

      for (const event of events) {
        const tracked_event = await this.trackEvent(tenantId, event);
        if (tracked_event.id) {
          tracked.push(tracked_event);
        }
      }

      return tracked;
    } catch (error) {
      this.logger.error(`Failed to batch track events: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get aggregate metrics
   */
  async getAggregateMetrics(
    tenantId: string,
    metricName: string,
    startDate: Date,
    endDate: Date,
    aggregation: TimeAggregation = TimeAggregation.DAY,
    projectId?: string,
  ): Promise<AggregateMetric> {
    try {
      // Check cache
      const cacheKey = `aggregate:${metricName}:${startDate.getTime()}:${endDate.getTime()}`;
      const cached = await this.cache.get<AggregateMetric>(cacheKey);
      if (cached) {
        return cached;
      }

      // Query events
      const query = `
        SELECT * FROM analytics_events e
        WHERE e.tenantId = @tenantId 
        AND e.eventName = @metricName
        AND e.timestamp >= @startDate 
        AND e.timestamp <= @endDate
        ${projectId ? 'AND e.projectId = @projectId' : ''}
      `;

      const params: any[] = [
        { name: '@tenantId', value: tenantId },
        { name: '@metricName', value: metricName },
        { name: '@startDate', value: startDate },
        { name: '@endDate', value: endDate },
      ];

      if (projectId) {
        params.push({ name: '@projectId', value: projectId });
      }

      const events = await this.cosmosDB.queryDocuments<AnalyticsEvent>(
        'analytics-events',
        query,
        params,
        tenantId,
      );

      // Calculate aggregates
      const values = events.map((e) => e.value || 0);
      const metric: AggregateMetric = {
        metricName,
        period: aggregation,
        startDate,
        endDate,
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        min: Math.min(...values, Infinity),
        max: Math.max(...values, -Infinity),
        median: this.calculateMedian(values),
        stdDev: this.calculateStdDev(values),
        percentile95: this.calculatePercentile(values, 0.95),
        percentile99: this.calculatePercentile(values, 0.99),
        values: this.groupByTime(events, aggregation),
      };

      // Cache
      await this.cache.set(cacheKey, metric, this.ANALYTICS_CACHE_TTL);

      return metric;
    } catch (error) {
      this.logger.error(`Failed to get aggregate metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get trending analysis
   */
  async getTrendingAnalysis(
    tenantId: string,
    metricName: string,
    projectId?: string,
  ): Promise<TrendingAnalysis> {
    try {
      const now = new Date();
      const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
      const currentMidpoint = new Date(currentStart.getTime() + 3.5 * 24 * 60 * 60 * 1000);

      // Get current and previous period metrics
      const currentMetric = await this.getAggregateMetrics(tenantId, metricName, currentStart, now, TimeAggregation.DAY, projectId);
      const previousMetric = await this.getAggregateMetrics(
        tenantId,
        metricName,
        previousStart,
        currentMidpoint,
        TimeAggregation.DAY,
        projectId,
      );

      const currentValue = currentMetric.average;
      const previousValue = previousMetric.average;
      const absoluteChange = currentValue - previousValue;
      const percentageChange = previousValue !== 0 ? (absoluteChange / previousValue) * 100 : 0;

      // Determine direction
      let direction: TrendDirection = TrendDirection.STABLE;
      if (percentageChange > 10) {direction = TrendDirection.UP;}
      else if (percentageChange < -10) {direction = TrendDirection.DOWN;}

      // Detect anomalies (simple: >3 std deviations)
      if (Math.abs(absoluteChange) > currentMetric.stdDev * 3) {
        direction = TrendDirection.ANOMALY;
      }

      return {
        metricName,
        currentValue,
        previousValue,
        direction,
        percentageChange: Math.round(percentageChange * 100) / 100,
        absoluteChange,
        trend: percentageChange > 0 ? 'increasing' : percentageChange < 0 ? 'decreasing' : 'stable',
        confidence: Math.min(1, currentMetric.count / 100), // Confidence based on sample size
        period: TimeAggregation.WEEK,
      };
    } catch (error) {
      this.logger.error(`Failed to get trending analysis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehavior(tenantId: string, userId: string, projectId?: string): Promise<UserBehaviorAnalytics> {
    try {
      // Query user events
      const query = `
        SELECT * FROM analytics_events e
        WHERE e.userId = @userId AND e.tenantId = @tenantId
        ${projectId ? 'AND e.projectId = @projectId' : ''}
        ORDER BY e.timestamp DESC
      `;

      const params: any[] = [
        { name: '@userId', value: userId },
        { name: '@tenantId', value: tenantId },
      ];

      if (projectId) {
        params.push({ name: '@projectId', value: projectId });
      }

      const events = await this.cosmosDB.queryDocuments<AnalyticsEvent>(
        'analytics-events',
        query,
        params,
        tenantId,
      );

      if (events.length === 0) {
        return {
          userId,
          tenantId,
          projectId,
          sessionCount: 0,
          totalSessionDuration: 0,
          averageSessionDuration: 0,
          lastActiveAt: new Date(),
          firstSeenAt: new Date(),
          deviceTypes: [],
          topFeatures: [],
          activityTrend: [],
          engagementScore: 0,
          churnRisk: 'low',
        };
      }

      // Calculate metrics
      const sessions = this.groupBySessions(events);
      const deviceTypes = this.groupByDeviceType(events);
      const topFeatures = this.getTopFeatures(events);
      const activityTrend = this.calculateActivityTrend(events);

      const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const avgDuration = totalDuration / sessions.length;

      return {
        userId,
        tenantId,
        projectId,
        sessionCount: sessions.length,
        totalSessionDuration: totalDuration,
        averageSessionDuration: avgDuration,
        lastActiveAt: events[0].timestamp,
        firstSeenAt: events[events.length - 1].timestamp,
        deviceTypes,
        topFeatures,
        activityTrend,
        engagementScore: this.calculateEngagementScore(sessions, events),
        churnRisk: this.assessChurnRisk(events),
      };
    } catch (error) {
      this.logger.error(`Failed to get user behavior: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get feature adoption metrics
   */
  async getFeatureAdoption(tenantId: string, featureName: string, projectId?: string): Promise<FeatureAdoptionMetrics> {
    try {
      // Query feature events
      const query = `
        SELECT * FROM analytics_events e
        WHERE e.eventName = @featureName AND e.tenantId = @tenantId
        ${projectId ? 'AND e.projectId = @projectId' : ''}
      `;

      const params: any[] = [
        { name: '@featureName', value: featureName },
        { name: '@tenantId', value: tenantId },
      ];

      if (projectId) {
        params.push({ name: '@projectId', value: projectId });
      }

      const events = await this.cosmosDB.queryDocuments<AnalyticsEvent>(
        'analytics-events',
        query,
        params,
        tenantId,
      );

      // Get total users
      const totalUsersQuery = `
        SELECT VALUE COUNT(DISTINCT e.userId) FROM analytics_events e
        WHERE e.tenantId = @tenantId
        ${projectId ? 'AND e.projectId = @projectId' : ''}
      `;

      const totalUsersResult = await this.cosmosDB.queryDocuments<number>(
        'analytics-events',
        totalUsersQuery,
        params,
        tenantId,
      );

      const totalUsers = totalUsersResult.length > 0 ? totalUsersResult[0] : 1;
      const adoptedUsers = new Set(events.map((e) => e.userId)).size;
      const adoptionRate = (adoptedUsers / totalUsers) * 100;

      return {
        featureName,
        tenantId,
        totalUsers,
        adoptedUsers,
        adoptionRate,
        adoptionTrend: await this.getTrendingAnalysis(tenantId, featureName, projectId),
        daysSinceRelease: 7, // Would calculate from feature release date
        projectedAdoptionRate: adoptionRate * 1.2, // Simple projection
        usageMetrics: {
          totalUsages: events.length,
          uniqueUsers: adoptedUsers,
          averageUsagePerUser: adoptedUsers > 0 ? events.length / adoptedUsers : 0,
          usageFrequency: events.length > 100 ? 'high' : events.length > 20 ? 'medium' : 'low',
        },
        successMetrics: {
          conversionRate: (adoptedUsers / totalUsers) * 100,
          engagementScore: 75,
          retentionRate: 80,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get feature adoption: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    tenantId: string,
    endpoint?: string,
    method?: string,
    daysBack: number = 7,
  ): Promise<PerformanceMetrics> {
    try {
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      // Query performance events (would come from API instrumentation)
      const query = `
        SELECT * FROM analytics_events e
        WHERE e.tenantId = @tenantId
        AND e.category = 'performance'
        AND e.timestamp >= @startDate
        ${endpoint ? 'AND e.url = @endpoint' : ''}
        ${method ? 'AND e.metadata.method = @method' : ''}
      `;

      const params: any[] = [
        { name: '@tenantId', value: tenantId },
        { name: '@startDate', value: startDate },
      ];

      if (endpoint) {
        params.push({ name: '@endpoint', value: endpoint });
      }

      if (method) {
        params.push({ name: '@method', value: method });
      }

      const events = await this.cosmosDB.queryDocuments<AnalyticsEvent>(
        'analytics-events',
        query,
        params,
        tenantId,
      );

      const responseTimes = events.map((e) => e.duration || 0);
      const sortedTimes = responseTimes.sort((a, b) => a - b);

      return {
        id: uuidv4(),
        tenantId,
        endpoint,
        method,
        avgResponseTime: this.calculateAverage(responseTimes),
        p50ResponseTime: this.calculatePercentile(responseTimes, 0.5),
        p95ResponseTime: this.calculatePercentile(responseTimes, 0.95),
        p99ResponseTime: this.calculatePercentile(responseTimes, 0.99),
        maxResponseTime: Math.max(...responseTimes),
        minResponseTime: Math.min(...responseTimes),
        errorRate: 0, // Would calculate from error events
        successRate: 100,
        throughput: events.length / (daysBack * 24 * 60 * 60),
        period: TimeAggregation.DAY,
        sampledAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get performance metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get analytics comparison
   */
  async getComparison(
    tenantId: string,
    metricName: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date,
    projectId?: string,
  ): Promise<AnalyticsComparison> {
    try {
      const current = await this.getAggregateMetrics(tenantId, metricName, currentStart, currentEnd, TimeAggregation.DAY, projectId);
      const previous = await this.getAggregateMetrics(tenantId, metricName, previousStart, previousEnd, TimeAggregation.DAY, projectId);

      const absoluteChange = current.average - previous.average;
      const percentageChange = previous.average !== 0 ? (absoluteChange / previous.average) * 100 : 0;

      let trend: TrendDirection = TrendDirection.STABLE;
      if (percentageChange > 10) {trend = TrendDirection.UP;}
      else if (percentageChange < -10) {trend = TrendDirection.DOWN;}

      return {
        metricName,
        currentPeriod: {
          startDate: currentStart,
          endDate: currentEnd,
          value: current.average,
          dataPoints: current.count,
        },
        previousPeriod: {
          startDate: previousStart,
          endDate: previousEnd,
          value: previous.average,
          dataPoints: previous.count,
        },
        absoluteChange,
        percentageChange: Math.round(percentageChange * 100) / 100,
        trend,
        significance: 0.95, // Would calculate p-value
      };
    } catch (error) {
      this.logger.error(`Failed to get comparison: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper: Calculate median
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) {return 0;}
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Helper: Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    if (values.length === 0) {return 0;}
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map((val) => Math.pow(val - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Helper: Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) {return 0;}
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile * sorted.length) / 100) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Helper: Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) {return 0;}
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Helper: Group by time
   */
  private groupByTime(events: AnalyticsEvent[], aggregation: TimeAggregation): any[] {
    const grouped = new Map<string, number[]>();

    for (const event of events) {
      const key = this.getTimeKey(event.timestamp, aggregation);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(event.value || 0);
    }

    return Array.from(grouped.entries()).map(([key, values]) => ({
      timestamp: new Date(key),
      value: this.calculateAverage(values),
    }));
  }

  /**
   * Helper: Get time key for grouping
   */
  private getTimeKey(date: Date, aggregation: TimeAggregation): string {
    const d = new Date(date);
    switch (aggregation) {
      case TimeAggregation.MINUTE:
        return d.toISOString().slice(0, 16);
      case TimeAggregation.HOUR:
        return d.toISOString().slice(0, 13);
      case TimeAggregation.DAY:
        return d.toISOString().slice(0, 10);
      case TimeAggregation.WEEK:
        return d.toISOString().slice(0, 10);
      case TimeAggregation.MONTH:
        return d.toISOString().slice(0, 7);
      default:
        return d.toISOString();
    }
  }

  /**
   * Helper: Group by sessions
   */
  private groupBySessions(events: AnalyticsEvent[]): any[] {
    const sessions: any[] = [];
    let currentSession: any = null;
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes

    for (const event of events) {
      if (!currentSession || event.timestamp.getTime() - currentSession.lastEvent.getTime() > sessionTimeout) {
        currentSession = {
          startTime: event.timestamp,
          lastEvent: event.timestamp,
          events: [event],
          duration: 0,
        };
        sessions.push(currentSession);
      } else {
        currentSession.events.push(event);
        currentSession.lastEvent = event.timestamp;
        currentSession.duration = currentSession.lastEvent.getTime() - currentSession.startTime.getTime();
      }
    }

    return sessions;
  }

  /**
   * Helper: Group by device type
   */
  private groupByDeviceType(events: AnalyticsEvent[]): any[] {
    const grouped = new Map<string, number>();

    for (const event of events) {
      const type = this.extractDeviceType(event.userAgent || '');
      grouped.set(type, (grouped.get(type) || 0) + 1);
    }

    const total = events.length;
    return Array.from(grouped.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: (count / total) * 100,
    }));
  }

  /**
   * Helper: Extract device type from user agent
   */
  private extractDeviceType(userAgent: string): string {
    if (/mobile/i.test(userAgent)) {return 'mobile';}
    if (/tablet/i.test(userAgent)) {return 'tablet';}
    return 'desktop';
  }

  /**
   * Helper: Get top features
   */
  private getTopFeatures(events: AnalyticsEvent[]): any[] {
    const grouped = new Map<string, AnalyticsEvent[]>();

    for (const event of events) {
      const feature = event.eventName;
      if (!grouped.has(feature)) {
        grouped.set(feature, []);
      }
      grouped.get(feature)!.push(event);
    }

    return Array.from(grouped.entries())
      .map(([feature, evts]) => ({
        feature,
        usageCount: evts.length,
        lastUsed: evts[0].timestamp,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);
  }

  /**
   * Helper: Calculate activity trend
   */
  private calculateActivityTrend(events: AnalyticsEvent[]): any[] {
    const grouped = new Map<string, number>();

    for (const event of events) {
      const dateStr = event.timestamp.toISOString().slice(0, 10);
      grouped.set(dateStr, (grouped.get(dateStr) || 0) + 1);
    }

    return Array.from(grouped.entries())
      .map(([date, count]) => ({
        date: new Date(date),
        sessions: 1,
        duration: count * 1000, // Estimate
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Helper: Calculate engagement score
   */
  private calculateEngagementScore(sessions: any[], events: AnalyticsEvent[]): number {
    const sessionScore = Math.min(100, sessions.length * 10);
    const eventScore = Math.min(100, events.length * 5);
    const durationScore = Math.min(100, (sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 1000) * 0.01);

    return Math.round((sessionScore + eventScore + durationScore) / 3);
  }

  /**
   * Helper: Assess churn risk
   */
  private assessChurnRisk(events: AnalyticsEvent[]): 'low' | 'medium' | 'high' {
    if (events.length === 0) {return 'high';}

    const lastEvent = events[0];
    const daysSinceActive = (Date.now() - lastEvent.timestamp.getTime()) / (24 * 60 * 60 * 1000);

    if (daysSinceActive > 30) {return 'high';}
    if (daysSinceActive > 14) {return 'medium';}
    return 'low';
  }

  /**
   * Helper: Invalidate cache
   */
  private async invalidateEventCache(tenantId: string, projectId?: string): Promise<void> {
    // Invalidate trending and aggregate caches
    const pattern = projectId ? `*:*:${tenantId}:${projectId}*` : `*:*:${tenantId}*`;
    await this.cache.delete(pattern);
  }
}

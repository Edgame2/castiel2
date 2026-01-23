/**
 * Analytics Service
 * Handles analytics event tracking and metric calculation
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError } from '@coder/shared/utils/errors';
import {
  AnalyticsEvent,
  CreateAnalyticsEventInput,
  UsageMetric,
  AggregateMetric,
  TrendingAnalysis,
  DashboardMetric,
  AnalyticsQuery,
  MetricType,
  TimeAggregation,
  TrendDirection,
} from '../types/analytics.types';

export class AnalyticsService {
  private eventsContainerName = 'analytics_events';
  private metricsContainerName = 'analytics_metrics';

  /**
   * Track analytics event
   */
  async trackEvent(input: CreateAnalyticsEventInput): Promise<AnalyticsEvent> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.eventName) {
      throw new BadRequestError('eventName is required');
    }

    const event: AnalyticsEvent = {
      id: uuidv4(),
      tenantId: input.tenantId,
      userId: input.userId,
      projectId: input.projectId,
      eventType: input.eventType,
      eventName: input.eventName,
      category: input.category,
      action: input.action,
      label: input.label,
      value: input.value,
      metadata: input.metadata,
      timestamp: new Date(),
      sessionId: input.sessionId,
      duration: input.duration,
      url: input.url,
      referrer: input.referrer,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      ttl: 90 * 24 * 60 * 60, // 90 days TTL
    };

    try {
      const container = getContainer(this.eventsContainerName);
      const { resource } = await container.items.create(event, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to track analytics event');
      }

      return resource as AnalyticsEvent;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Event with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Track batch events
   */
  async trackBatchEvents(events: CreateAnalyticsEventInput[]): Promise<AnalyticsEvent[]> {
    const results: AnalyticsEvent[] = [];

    for (const event of events) {
      try {
        const tracked = await this.trackEvent(event);
        results.push(tracked);
      } catch (error) {
        console.error('Failed to track event:', error);
      }
    }

    return results;
  }

  /**
   * Get aggregate metrics
   */
  async getAggregateMetrics(query: AnalyticsQuery): Promise<AggregateMetric[]> {
    if (!query.tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.eventsContainerName);
    let sqlQuery = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: query.tenantId }];

    if (query.startDate) {
      sqlQuery += ' AND c.timestamp >= @startDate';
      parameters.push({ name: '@startDate', value: query.startDate });
    }

    if (query.endDate) {
      sqlQuery += ' AND c.timestamp <= @endDate';
      parameters.push({ name: '@endDate', value: query.endDate });
    }

    if (query.filters?.projectId) {
      sqlQuery += ' AND c.projectId = @projectId';
      parameters.push({ name: '@projectId', value: query.filters.projectId });
    }

    if (query.filters?.userId) {
      sqlQuery += ' AND c.userId = @userId';
      parameters.push({ name: '@userId', value: query.filters.userId });
    }

    if (query.filters?.category) {
      sqlQuery += ' AND c.category = @category';
      parameters.push({ name: '@category', value: query.filters.category });
    }

    if (query.filters?.action) {
      sqlQuery += ' AND c.action = @action';
      parameters.push({ name: '@action', value: query.filters.action });
    }

    try {
      const { resources } = await container.items.query<AnalyticsEvent>({ query: sqlQuery, parameters }).fetchAll();

      // Group by metric name and calculate aggregates
      const metricMap = new Map<string, AnalyticsEvent[]>();
      for (const event of resources) {
        const key = event.eventName;
        const existing = metricMap.get(key) || [];
        existing.push(event);
        metricMap.set(key, existing);
      }

      const aggregates: AggregateMetric[] = [];

      for (const [metricName, events] of metricMap.entries()) {
        const values = events.map((e) => e.value || 0).filter((v) => v > 0);
        const sortedValues = [...values].sort((a, b) => a - b);

        const count = events.length;
        const sum = values.reduce((a, b) => a + b, 0);
        const average = count > 0 ? sum / count : 0;
        const min = sortedValues.length > 0 ? sortedValues[0] : 0;
        const max = sortedValues.length > 0 ? sortedValues[sortedValues.length - 1] : 0;
        const median =
          sortedValues.length > 0
            ? sortedValues[Math.floor(sortedValues.length / 2)]
            : 0;

        // Calculate standard deviation
        const variance = values.length > 0
          ? values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / values.length
          : 0;
        const stdDev = Math.sqrt(variance);

        // Calculate percentiles
        const percentile95 = sortedValues.length > 0
          ? sortedValues[Math.floor(sortedValues.length * 0.95)]
          : 0;
        const percentile99 = sortedValues.length > 0
          ? sortedValues[Math.floor(sortedValues.length * 0.99)]
          : 0;

        // Group values by time period
        const timeGroupedValues: { timestamp: Date; value: number }[] = [];
        const periodMs = this.getPeriodMs(query.aggregation || TimeAggregation.DAY);

        for (const event of events) {
          const periodStart = new Date(
            Math.floor(event.timestamp.getTime() / periodMs) * periodMs
          );
          const existing = timeGroupedValues.find((v) => v.timestamp.getTime() === periodStart.getTime());
          if (existing) {
            existing.value += event.value || 0;
          } else {
            timeGroupedValues.push({ timestamp: periodStart, value: event.value || 0 });
          }
        }

        aggregates.push({
          metricName,
          metricType: MetricType.USER_ACTION,
          period: query.aggregation || TimeAggregation.DAY,
          startDate: query.startDate,
          endDate: query.endDate,
          count,
          sum,
          average,
          min,
          max,
          median,
          stdDev,
          percentile95,
          percentile99,
          values: timeGroupedValues.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        });
      }

      return aggregates;
    } catch (error: any) {
      throw new Error(`Failed to get aggregate metrics: ${error.message}`);
    }
  }

  /**
   * Get trending analysis
   */
  async getTrendingAnalysis(
    tenantId: string,
    metricName: string,
    currentPeriod: { startDate: Date; endDate: Date },
    previousPeriod: { startDate: Date; endDate: Date }
  ): Promise<TrendingAnalysis> {
    if (!tenantId || !metricName) {
      throw new BadRequestError('tenantId and metricName are required');
    }

    const currentMetrics = await this.getAggregateMetrics({
      tenantId,
      metricNames: [metricName],
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
    });

    const previousMetrics = await this.getAggregateMetrics({
      tenantId,
      metricNames: [metricName],
      startDate: previousPeriod.startDate,
      endDate: previousPeriod.endDate,
    });

    const current = currentMetrics.find((m) => m.metricName === metricName);
    const previous = previousMetrics.find((m) => m.metricName === metricName);

    if (!current || !previous) {
      throw new BadRequestError('Metric not found for specified periods');
    }

    const currentValue = current.average;
    const previousValue = previous.average;
    const change = currentValue - previousValue;
    const changePercentage = previousValue !== 0 ? (change / previousValue) * 100 : 0;

    // Determine direction
    let direction: TrendDirection = TrendDirection.STABLE;
    if (Math.abs(changePercentage) > 10) {
      direction = changePercentage > 0 ? TrendDirection.UP : TrendDirection.DOWN;
    }

    // Anomaly detection (3-sigma rule)
    const isAnomaly =
      current.stdDev !== undefined &&
      Math.abs(change) > 3 * (current.stdDev || 0);

    if (isAnomaly) {
      direction = TrendDirection.ANOMALY;
    }

    // Calculate confidence (based on sample size and variance)
    const confidence = Math.min(
      100,
      Math.max(0, 100 - (current.stdDev || 0) / current.average) * 100
    );

    // Simple forecast (linear projection)
    const forecast = {
      nextValue: currentValue + change,
      confidence: Math.max(0, confidence - 20), // Lower confidence for forecasts
    };

    return {
      metricName,
      currentValue,
      previousValue,
      change,
      changePercentage,
      direction,
      confidence,
      isAnomaly,
      forecast,
      period: {
        current: currentPeriod,
        previous: previousPeriod,
      },
    };
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(
    tenantId: string,
    metricNames: string[],
    period: { startDate: Date; endDate: Date },
    comparisonPeriod?: { startDate: Date; endDate: Date }
  ): Promise<DashboardMetric[]> {
    const currentMetrics = await this.getAggregateMetrics({
      tenantId,
      metricNames,
      startDate: period.startDate,
      endDate: period.endDate,
    });

    const previousMetrics = comparisonPeriod
      ? await this.getAggregateMetrics({
          tenantId,
          metricNames,
          startDate: comparisonPeriod.startDate,
          endDate: comparisonPeriod.endDate,
        })
      : [];

    const dashboardMetrics: DashboardMetric[] = [];

    for (const metric of currentMetrics) {
      const previous = previousMetrics.find((m) => m.metricName === metric.metricName);
      const change = previous ? metric.average - previous.average : undefined;
      const changePercentage = previous && previous.average !== 0
        ? ((change || 0) / previous.average) * 100
        : undefined;

      let trend: TrendDirection = TrendDirection.STABLE;
      if (changePercentage !== undefined) {
        if (Math.abs(changePercentage) > 10) {
          trend = changePercentage > 0 ? TrendDirection.UP : TrendDirection.DOWN;
        }
      }

      dashboardMetrics.push({
        id: uuidv4(),
        metricName: metric.metricName,
        metricType: metric.metricType,
        value: metric.average,
        previousValue: previous?.average,
        change,
        changePercentage,
        trend,
        sparkline: metric.values.map((v) => v.value),
        comparison: previous
          ? {
              period: `${previous.startDate.toISOString()} - ${previous.endDate.toISOString()}`,
              value: previous.average,
              change: change || 0,
            }
          : undefined,
      });
    }

    return dashboardMetrics;
  }

  /**
   * Get period duration in milliseconds
   */
  private getPeriodMs(period: TimeAggregation): number {
    const msPerMinute = 60 * 1000;
    const msPerHour = 60 * msPerMinute;
    const msPerDay = 24 * msPerHour;
    const msPerWeek = 7 * msPerDay;
    const msPerMonth = 30 * msPerDay;
    const msPerQuarter = 90 * msPerDay;
    const msPerYear = 365 * msPerDay;

    switch (period) {
      case TimeAggregation.MINUTE:
        return msPerMinute;
      case TimeAggregation.HOUR:
        return msPerHour;
      case TimeAggregation.DAY:
        return msPerDay;
      case TimeAggregation.WEEK:
        return msPerWeek;
      case TimeAggregation.MONTH:
        return msPerMonth;
      case TimeAggregation.QUARTER:
        return msPerQuarter;
      case TimeAggregation.YEAR:
        return msPerYear;
      default:
        return msPerDay;
    }
  }
}


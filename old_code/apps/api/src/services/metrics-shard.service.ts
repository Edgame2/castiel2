// @ts-nocheck - Optional service, not used by workers
/**
 * Metrics-as-Shards Service (Phase 2)
 * 
 * Stores observability metrics as shards for historical analysis.
 * 
 * Metrics tracked:
 * - Ingestion lag (P50, P95, P99)
 * - Change miss rate
 * - Vector hit ratio
 * - Insight confidence drift
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '@castiel/api-core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Metric type
 */
export enum MetricType {
  INGESTION_LAG = 'ingestion_lag',
  CHANGE_MISS_RATE = 'change_miss_rate',
  VECTOR_HIT_RATIO = 'vector_hit_ratio',
  INSIGHT_CONFIDENCE_DRIFT = 'insight_confidence_drift',
}

/**
 * Metric value with percentiles
 */
export interface MetricValue {
  p50?: number;
  p95?: number;
  p99?: number;
  mean?: number;
  min?: number;
  max?: number;
  count?: number;
}

/**
 * Metric shard data
 */
export interface MetricShardData {
  metricType: MetricType;
  value: number | MetricValue;
  unit?: string;
  timestamp: Date;
  period: 'minute' | 'hour' | 'day';
  metadata?: Record<string, any>;
}

export class MetricsShardService {
  private shardRepository: ShardRepository;
  private monitoring: IMonitoringProvider;
  private enabled: boolean = true;

  constructor(
    monitoring: IMonitoringProvider,
    shardRepository: ShardRepository,
    enabled: boolean = true
  ) {
    this.monitoring = monitoring;
    this.shardRepository = shardRepository;
    this.enabled = enabled;
  }

  /**
   * Record a metric as a shard
   */
  async recordMetric(
    tenantId: string,
    metricType: MetricType,
    value: number | MetricValue,
    period: 'minute' | 'hour' | 'day' = 'hour',
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.enabled) {return;}

    try {
      const metricData: MetricShardData = {
        metricType,
        value,
        timestamp: new Date(),
        period,
        metadata,
      };

      // Create metric shard
      await this.shardRepository.create({
        tenantId,
        userId: 'system',
        shardTypeId: 'system.metric', // Would need to be defined as a system shard type
        structuredData: metricData,
        acl: [],
        status: 'active',
        source: 'system',
        sourceDetails: {
          integrationName: 'metrics-shard',
          syncedAt: new Date(),
        },
      });

      this.monitoring.trackEvent('metrics-shard.recorded', {
        tenantId,
        metricType,
        period,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'MetricsShardService',
        operation: 'record-metric',
        metricType,
        tenantId,
      });
    }
  }

  /**
   * Record ingestion lag metric
   */
  async recordIngestionLag(
    tenantId: string,
    lagMs: number,
    source: string
  ): Promise<void> {
    await this.recordMetric(
      tenantId,
      MetricType.INGESTION_LAG,
      lagMs,
      'minute',
      { source, unit: 'ms' }
    );
  }

  /**
   * Record change miss rate
   */
  async recordChangeMissRate(
    tenantId: string,
    missRate: number
  ): Promise<void> {
    await this.recordMetric(
      tenantId,
      MetricType.CHANGE_MISS_RATE,
      missRate,
      'hour',
      { unit: 'ratio' }
    );
  }

  /**
   * Record vector hit ratio
   */
  async recordVectorHitRatio(
    tenantId: string,
    hitRatio: number
  ): Promise<void> {
    await this.recordMetric(
      tenantId,
      MetricType.VECTOR_HIT_RATIO,
      hitRatio,
      'hour',
      { unit: 'ratio' }
    );
  }

  /**
   * Record insight confidence drift
   */
  async recordInsightConfidenceDrift(
    tenantId: string,
    drift: number,
    insightId?: string
  ): Promise<void> {
    await this.recordMetric(
      tenantId,
      MetricType.INSIGHT_CONFIDENCE_DRIFT,
      drift,
      'hour',
      { insightId, unit: 'drift' }
    );
  }

  /**
   * Query metrics for a time period
   */
  async queryMetrics(params: {
    tenantId: string;
    metricType?: MetricType;
    startDate: Date;
    endDate: Date;
    period?: 'minute' | 'hour' | 'day';
    limit?: number;
  }): Promise<any[]> {
    try {
      const filter: any = {
        tenantId: params.tenantId,
        shardTypeId: 'system.metric',
        status: 'active',
        createdAfter: params.startDate,
        createdBefore: params.endDate,
      };

      const shards = await this.shardRepository.list({
        filter,
        limit: params.limit || 1000,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      });

      // Filter by metric type if specified
      let filtered = shards.shards;
      if (params.metricType) {
        filtered = filtered.filter(s => {
          const sd = s.structuredData as any;
          return sd.metricType === params.metricType;
        });
      }

      if (params.period) {
        filtered = filtered.filter(s => {
          const sd = s.structuredData as any;
          return sd.period === params.period;
        });
      }

      return filtered.map(s => ({
        id: s.id,
        metricType: (s.structuredData as any).metricType,
        value: (s.structuredData as any).value,
        timestamp: (s.structuredData as any).timestamp,
        period: (s.structuredData as any).period,
        metadata: (s.structuredData as any).metadata,
        createdAt: s.createdAt,
      }));
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'MetricsShardService',
        operation: 'query-metrics',
        tenantId: params.tenantId,
      });
      return [];
    }
  }

  /**
   * Get aggregated metrics (P50, P95, P99) for a time period
   */
  async getAggregatedMetrics(params: {
    tenantId: string;
    metricType: MetricType;
    startDate: Date;
    endDate: Date;
  }): Promise<MetricValue> {
    const metrics = await this.queryMetrics({
      tenantId: params.tenantId,
      metricType: params.metricType,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    if (metrics.length === 0) {
      return {};
    }

    // Extract numeric values
    const values = metrics
      .map(m => {
        const v = m.value;
        return typeof v === 'number' ? v : v.p50 || v.mean || 0;
      })
      .filter(v => typeof v === 'number' && !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return {};
    }

    // Calculate percentiles
    const p50Index = Math.floor(values.length * 0.5);
    const p95Index = Math.floor(values.length * 0.95);
    const p99Index = Math.floor(values.length * 0.99);

    return {
      p50: values[p50Index],
      p95: values[p95Index],
      p99: values[p99Index],
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      min: values[0],
      max: values[values.length - 1],
      count: values.length,
    };
  }
}







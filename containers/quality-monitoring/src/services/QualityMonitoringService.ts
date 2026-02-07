/**
 * Quality Monitoring Service
 * Quality monitoring and anomaly detection
 */

import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface QualityAnomaly {
  id: string;
  tenantId: string;
  anomalyType?: string;
  metricType: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  detectedAt: Date | string;
  resolved: boolean;
  resolvedAt?: Date | string;
}

export interface QualityMetric {
  id: string;
  tenantId: string;
  metricType: string;
  value: number;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
  measuredAt: Date | string;
}

export class QualityMonitoringService {
  private config: ReturnType<typeof loadConfig>;
  private _aiServiceClient: ServiceClient;
  private _mlServiceClient: ServiceClient;
  private _analyticsServiceClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
    
    this._aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this._mlServiceClient = new ServiceClient({
      baseURL: this.config.services.ml_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this._analyticsServiceClient = new ServiceClient({
      baseURL: this.config.services.analytics_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Detect anomaly
   */
  async detectAnomaly(tenantId: string, data: any): Promise<QualityAnomaly | null> {
    try {
      // Get historical metrics for comparison (from quality_metrics, not quality_anomalies)
      const metricsContainer = getContainer('quality_metrics');
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.metricType = @metricType ORDER BY c.measuredAt DESC OFFSET 0 LIMIT 100',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@metricType', value: data.metricType || 'unknown' },
        ],
      };
      const { resources: historicalMetrics } = await metricsContainer.items
        .query(querySpec as any, { partitionKey: tenantId } as any)
        .fetchAll();

      if (!historicalMetrics || historicalMetrics.length < 10) {
        // Not enough data for anomaly detection
        return null;
      }

      // Statistical analysis - calculate mean and standard deviation
      const values = historicalMetrics.map((m: any) => m.value || 0).filter((v: number) => !isNaN(v));
      if (values.length === 0) return null;

      const mean = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
      const variance = values.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Current value
      const currentValue = data.value || data.score || 0;

      // Z-score calculation
      const zScore = stdDev > 0 ? Math.abs((currentValue - mean) / stdDev) : 0;

      // Anomaly threshold: 2.5 standard deviations
      if (zScore > 2.5) {
        const anomaly: QualityAnomaly = {
          id: uuidv4(),
          tenantId,
          anomalyType: 'statistical_deviation',
          metricType: data.metricType || 'unknown',
          value: currentValue,
          expectedValue: mean,
          deviation: currentValue - mean,
          severity: zScore > 3.5 ? 'critical' : zScore > 3 ? 'high' : 'medium',
          description: `Metric value ${currentValue} deviates ${zScore.toFixed(2)} standard deviations from expected value ${mean.toFixed(2)}`,
          detectedAt: new Date(),
          resolved: false,
        };

        // Store anomaly
        const anomaliesContainer = getContainer('quality_anomalies');
        await anomaliesContainer.items.create(anomaly, { partitionKey: tenantId } as any);

        return anomaly;
      }

      return null;
    } catch (error: unknown) {
      log.error('Failed to detect anomaly', error instanceof Error ? error : new Error(String(error)), { tenantId, service: 'quality-monitoring' });
      return null;
    }
  }

  /**
   * Record quality metric
   */
  async recordMetric(tenantId: string, metric: Omit<QualityMetric, 'id' | 'tenantId' | 'measuredAt'>): Promise<void> {
    try {
      const qualityMetric: QualityMetric = {
        id: uuidv4(),
        tenantId,
        metricType: metric.metricType,
        value: metric.value,
        threshold: metric.threshold,
        status: metric.status,
        measuredAt: new Date(),
      };

      // Store metric
      const container = getContainer('quality_metrics');
      await container.items.create(qualityMetric, { partitionKey: tenantId } as any);

      // Check for anomalies
      await this.detectAnomaly(tenantId, { metricType: metric.metricType, value: metric.value });
    } catch (error: unknown) {
      log.error('Failed to record quality metric', error instanceof Error ? error : new Error(String(error)), { tenantId, service: 'quality-monitoring' });
      throw error;
    }
  }
}

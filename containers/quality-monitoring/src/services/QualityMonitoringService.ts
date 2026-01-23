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
  anomalyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
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
  private aiServiceClient: ServiceClient;
  private mlServiceClient: ServiceClient;
  private analyticsServiceClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
    
    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.mlServiceClient = new ServiceClient({
      baseURL: this.config.services.ml_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.analyticsServiceClient = new ServiceClient({
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
        .query(querySpec, { partitionKey: tenantId })
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
          metricType: data.metricType || 'unknown',
          value: currentValue,
          expectedValue: mean,
          deviation: currentValue - mean,
          severity: zScore > 3.5 ? 'critical' : zScore > 3 ? 'high' : 'medium',
          detectedAt: new Date(),
        };

        // Store anomaly
        await container.items.create(anomaly, { partitionKey: tenantId });

        return anomaly;
      }

      return null;
    } catch (error: any) {
      log.error('Failed to detect anomaly', error, {
        tenantId,
        service: 'quality-monitoring',
      });
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
      await container.items.create(qualityMetric, { partitionKey: tenantId });

      // Check for anomalies
      await this.detectAnomaly(tenantId, { metricType: metric.metricType, value: metric.value });
        ...metric,
        measuredAt: new Date(),
      };

      const container = getContainer('quality_metrics');
      await container.items.create(qualityMetric, { partitionKey: tenantId });
    } catch (error: any) {
      log.error('Failed to record quality metric', error, {
        tenantId,
        service: 'quality-monitoring',
      });
    }
  }
}

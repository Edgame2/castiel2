/**
 * Quality Monitoring Service
 * Quality monitoring and anomaly detection (merged from quality-monitoring container)
 */

import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
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
  }

  /**
   * Detect anomaly
   */
  async detectAnomaly(tenantId: string, data: any): Promise<QualityAnomaly | null> {
    try {
      // Get historical metrics for comparison
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

      // Anomaly threshold (3 standard deviations)
      if (zScore > 3) {
        const anomaly: QualityAnomaly = {
          id: uuidv4(),
          tenantId,
          anomalyType: data.metricType || 'unknown',
          severity: zScore > 4 ? 'critical' : zScore > 3.5 ? 'high' : 'medium',
          description: `Anomaly detected: ${data.metricType || 'metric'} value (${currentValue}) is ${zScore.toFixed(2)} standard deviations from mean (${mean.toFixed(2)})`,
          detectedAt: new Date(),
          resolved: false,
        };

        // Store anomaly
        const anomaliesContainer = getContainer('quality_anomalies');
        await anomaliesContainer.items.create(anomaly, { partitionKey: tenantId });

        return anomaly;
      }

      return null;
    } catch (error: any) {
      throw new Error(`Failed to detect anomaly: ${error.message}`);
    }
  }

  /**
   * Record quality metric
   */
  async recordMetric(tenantId: string, metric: Omit<QualityMetric, 'id' | 'tenantId'>): Promise<QualityMetric> {
    try {
      const metricRecord: QualityMetric = {
        id: uuidv4(),
        tenantId,
        ...metric,
      };

      const container = getContainer('quality_metrics');
      await container.items.create(metricRecord, { partitionKey: tenantId });

      // Check for anomalies
      await this.detectAnomaly(tenantId, metric);

      return metricRecord;
    } catch (error: any) {
      throw new Error(`Failed to record quality metric: ${error.message}`);
    }
  }
}

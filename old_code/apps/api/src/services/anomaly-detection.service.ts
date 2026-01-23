/**
 * Anomaly Detection Service
 * Comprehensive anomaly detection across all data types
 * 
 * Features:
 * - Statistical anomaly detection
 * - Pattern-based anomaly detection
 * - Multi-dimensional anomaly scoring
 * - Anomaly explanation generation
 * - Integration with EarlyWarningService
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { EarlyWarningService } from './early-warning.service.js';
import { DataQualityService } from './data-quality.service.js';

export type AnomalyType = 'statistical' | 'pattern' | 'temporal' | 'multidimensional' | 'forecast_miss';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Anomaly {
  anomalyId: string;
  tenantId: string; // Partition key
  opportunityId?: string;
  accountId?: string;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  score: number; // 0-1: Anomaly score
  detectedAt: Date;
  data: {
    metric?: string;
    value: any;
    expectedValue?: any;
    deviation?: number; // Standard deviations from mean
    context?: Record<string, any>;
  };
  explanation: {
    summary: string;
    factors: string[];
    impact: string;
    recommendations?: string[];
  };
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: Record<string, any>;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  summary: {
    total: number;
    byType: Record<AnomalyType, number>;
    bySeverity: Record<AnomalySeverity, number>;
    avgScore: number;
  };
  detectedAt: Date;
}

/**
 * Anomaly Detection Service
 */
export class AnomalyDetectionService {
  private client: CosmosClient;
  private database: Database;
  private anomaliesContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private earlyWarningService?: EarlyWarningService;
  private dataQualityService?: DataQualityService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    earlyWarningService?: EarlyWarningService,
    dataQualityService?: DataQualityService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.earlyWarningService = earlyWarningService;
    this.dataQualityService = dataQualityService;

    // Initialize Cosmos client
    const connectionPolicy: ConnectionPolicy = {
      connectionMode: 'Direct' as any, // Best performance (ConnectionMode enum not available in this version)
      requestTimeout: 30000,
      enableEndpointDiscovery: true,
      retryOptions: {
        maxRetryAttemptCount: 9,
        fixedRetryIntervalInMilliseconds: 0,
        maxWaitTimeInSeconds: 30,
      } as RetryOptions,
    };

    this.client = cosmosClient || new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
      connectionPolicy,
    });

    this.database = this.client.database(config.cosmosDb.databaseId);
    this.anomaliesContainer = this.database.container(config.cosmosDb.containers.anomalyDetections);
  }

  /**
   * Detect anomalies in opportunity data
   */
  async detectOpportunityAnomalies(
    tenantId: string,
    opportunityId: string,
    data: {
      riskScore?: number;
      forecast?: number;
      activityCount?: number;
      stageDuration?: number; // days
      stakeholderCount?: number;
      [key: string]: any;
    }
  ): Promise<AnomalyDetectionResult> {
    const anomalies: Anomaly[] = [];

    // Statistical anomalies
    if (data.riskScore !== undefined) {
      const riskAnomaly = await this.detectStatisticalAnomaly(
        tenantId,
        opportunityId,
        'riskScore',
        data.riskScore,
        'risk'
      );
      if (riskAnomaly) {
        anomalies.push(riskAnomaly);
      }
    }

    if (data.activityCount !== undefined) {
      const activityAnomaly = await this.detectStatisticalAnomaly(
        tenantId,
        opportunityId,
        'activityCount',
        data.activityCount,
        'activity'
      );
      if (activityAnomaly) {
        anomalies.push(activityAnomaly);
      }
    }

    // Pattern-based anomalies
    const patternAnomalies = await this.detectPatternAnomalies(tenantId, opportunityId, data);
    anomalies.push(...patternAnomalies);

    // Temporal anomalies
    if (data.stageDuration !== undefined) {
      const temporalAnomaly = await this.detectTemporalAnomaly(
        tenantId,
        opportunityId,
        'stageDuration',
        data.stageDuration
      );
      if (temporalAnomaly) {
        anomalies.push(temporalAnomaly);
      }
    }

    // Multi-dimensional anomaly
    if (anomalies.length > 0) {
      const multiDimAnomaly = await this.detectMultiDimensionalAnomaly(
        tenantId,
        opportunityId,
        data,
        anomalies
      );
      if (multiDimAnomaly) {
        anomalies.push(multiDimAnomaly);
      }
    }

    // Calculate summary
    const summary = this.calculateSummary(anomalies);

    const result: AnomalyDetectionResult = {
      anomalies,
      summary,
      detectedAt: new Date(),
    };

    // Save anomalies
    for (const anomaly of anomalies) {
      await this.anomaliesContainer.items.create(anomaly);
    }

    this.monitoring?.trackEvent('anomaly_detection.detected', {
      tenantId,
      opportunityId,
      anomalyCount: anomalies.length,
    });

    return result;
  }

  /**
   * Detect forecast miss anomalies
   */
  async detectForecastMiss(
    tenantId: string,
    opportunityId: string,
    forecast: number,
    actual: number
  ): Promise<Anomaly | null> {
    const deviation = Math.abs(forecast - actual) / Math.max(forecast, 1);
    
    if (deviation < 0.1) {
      return null; // Within 10% - not an anomaly
    }

    const severity: AnomalySeverity = 
      deviation > 0.5 ? 'critical' :
      deviation > 0.3 ? 'high' :
      deviation > 0.2 ? 'medium' :
      'low';

    const anomaly: Anomaly = {
      anomalyId: uuidv4(),
      tenantId,
      opportunityId,
      anomalyType: 'forecast_miss',
      severity,
      score: Math.min(1.0, deviation),
      detectedAt: new Date(),
      data: {
        metric: 'forecast_accuracy',
        value: actual,
        expectedValue: forecast,
        deviation,
      },
      explanation: {
        summary: `Forecast miss: Expected ${forecast}, got ${actual} (${(deviation * 100).toFixed(1)}% deviation)`,
        factors: [
          `Forecast: ${forecast}`,
          `Actual: ${actual}`,
          `Deviation: ${(deviation * 100).toFixed(1)}%`,
        ],
        impact: deviation > 0.3 
          ? 'Significant forecast miss may indicate model degradation or data quality issues'
          : 'Moderate forecast miss - review forecasting assumptions',
        recommendations: [
          'Review forecasting model assumptions',
          'Check for data quality issues',
          'Consider recalibrating forecast model',
        ],
      },
      status: 'new',
    };

    await this.anomaliesContainer.items.create(anomaly);

    // Integrate with EarlyWarningService if available
    if (this.earlyWarningService && severity !== 'low') {
      try {
        await this.earlyWarningService.detectSignals(opportunityId, tenantId, 'system');
      } catch (error) {
        this.monitoring?.trackException(error as Error, {
          operation: 'detectForecastMiss.earlyWarning',
          tenantId,
          opportunityId,
        });
      }
    }

    return anomaly;
  }

  // ============================================
  // Detection Methods
  // ============================================

  /**
   * Detect statistical anomaly using z-score
   */
  private async detectStatisticalAnomaly(
    tenantId: string,
    opportunityId: string,
    metric: string,
    value: number,
    context: string
  ): Promise<Anomaly | null> {
    // Get historical values for this metric (would query from database)
    const historicalValues = await this.getHistoricalValues(tenantId, metric, context);
    
    if (historicalValues.length < 10) {
      return null; // Not enough data
    }

    // Calculate mean and standard deviation
    const mean = historicalValues.reduce((sum, v) => sum + v, 0) / historicalValues.length;
    const variance = historicalValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / historicalValues.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
      return null; // No variation
    }

    // Calculate z-score
    const zScore = Math.abs((value - mean) / stdDev);
    
    if (zScore < 2) {
      return null; // Not an anomaly (within 2 standard deviations)
    }

    const severity: AnomalySeverity = 
      zScore > 4 ? 'critical' :
      zScore > 3 ? 'high' :
      zScore > 2.5 ? 'medium' :
      'low';

    const score = Math.min(1.0, zScore / 5);

    return {
      anomalyId: uuidv4(),
      tenantId,
      opportunityId,
      anomalyType: 'statistical',
      severity,
      score,
      detectedAt: new Date(),
      data: {
        metric,
        value,
        expectedValue: mean,
        deviation: zScore,
        context: { mean, stdDev, historicalCount: historicalValues.length },
      },
      explanation: {
        summary: `${metric} is ${zScore.toFixed(2)} standard deviations from mean (${mean.toFixed(2)})`,
        factors: [
          `Current value: ${value}`,
          `Expected range: ${(mean - 2 * stdDev).toFixed(2)} - ${(mean + 2 * stdDev).toFixed(2)}`,
          `Z-score: ${zScore.toFixed(2)}`,
        ],
        impact: `Statistical anomaly detected in ${context} - may indicate data quality issue or significant change`,
        recommendations: [
          'Verify data accuracy',
          'Check for external factors affecting this metric',
          'Review recent changes to opportunity',
        ],
      },
      status: 'new',
    };
  }

  /**
   * Detect pattern-based anomalies
   */
  private async detectPatternAnomalies(
    tenantId: string,
    opportunityId: string,
    data: Record<string, any>
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Check for unusual combinations
    if (data.riskScore !== undefined && data.activityCount !== undefined) {
      // High risk but high activity is unusual
      if (data.riskScore > 0.7 && data.activityCount > 50) {
        anomalies.push({
          anomalyId: uuidv4(),
          tenantId,
          opportunityId,
          anomalyType: 'pattern',
          severity: 'medium',
          score: 0.6,
          detectedAt: new Date(),
          data: {
            value: { riskScore: data.riskScore, activityCount: data.activityCount },
            context: { pattern: 'high_risk_high_activity' },
          },
          explanation: {
            summary: 'Unusual pattern: High risk score with high activity count',
            factors: [
              `Risk score: ${data.riskScore.toFixed(2)}`,
              `Activity count: ${data.activityCount}`,
            ],
            impact: 'This combination may indicate active risk mitigation or data inconsistency',
            recommendations: [
              'Review risk factors and activity patterns',
              'Verify data consistency',
            ],
          },
          status: 'new',
        });
      }
    }

    // Check for stage duration anomalies
    if (data.stageDuration !== undefined && data.stageDuration > 90) {
      anomalies.push({
        anomalyId: uuidv4(),
        tenantId,
        opportunityId,
        anomalyType: 'pattern',
        severity: 'high',
        score: 0.8,
        detectedAt: new Date(),
        data: {
          value: data.stageDuration,
          context: { pattern: 'extended_stage_duration' },
        },
        explanation: {
          summary: `Opportunity has been in current stage for ${data.stageDuration} days`,
          factors: [
            `Stage duration: ${data.stageDuration} days`,
            'Expected: < 30 days for most stages',
          ],
          impact: 'Extended stage duration may indicate stalled opportunity',
          recommendations: [
            'Review opportunity status',
            'Identify blockers',
            'Consider stage progression actions',
          ],
        },
        status: 'new',
      });
    }

    return anomalies;
  }

  /**
   * Detect temporal anomalies
   */
  private async detectTemporalAnomaly(
    tenantId: string,
    opportunityId: string,
    metric: string,
    value: number
  ): Promise<Anomaly | null> {
    // Get historical trend
    const historicalTrend = await this.getHistoricalTrend(tenantId, opportunityId, metric);
    
    if (historicalTrend.length < 5) {
      return null; // Not enough data
    }

    // Check for sudden change
    const recentValues = historicalTrend.slice(-3);
    const olderValues = historicalTrend.slice(0, -3);
    
    if (olderValues.length === 0) {
      return null;
    }

    const recentAvg = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
    const olderAvg = olderValues.reduce((sum, v) => sum + v, 0) / olderValues.length;
    
    const change = Math.abs(recentAvg - olderAvg) / Math.max(olderAvg, 1);
    
    if (change < 0.3) {
      return null; // Change is not significant
    }

    const severity: AnomalySeverity = 
      change > 0.7 ? 'high' :
      change > 0.5 ? 'medium' :
      'low';

    return {
      anomalyId: uuidv4(),
      tenantId,
      opportunityId,
      anomalyType: 'temporal',
      severity,
      score: Math.min(1.0, change),
      detectedAt: new Date(),
      data: {
        metric,
        value,
        expectedValue: olderAvg,
        deviation: change,
        context: { recentAvg, olderAvg, trendLength: historicalTrend.length },
      },
      explanation: {
        summary: `${metric} changed by ${(change * 100).toFixed(1)}% compared to historical average`,
        factors: [
          `Recent average: ${recentAvg.toFixed(2)}`,
          `Historical average: ${olderAvg.toFixed(2)}`,
          `Change: ${(change * 100).toFixed(1)}%`,
        ],
        impact: 'Significant temporal change detected - may indicate opportunity shift',
        recommendations: [
          'Investigate cause of change',
          'Review recent opportunity updates',
        ],
      },
      status: 'new',
    };
  }

  /**
   * Detect multi-dimensional anomaly
   */
  private async detectMultiDimensionalAnomaly(
    tenantId: string,
    opportunityId: string,
    data: Record<string, any>,
    existingAnomalies: Anomaly[]
  ): Promise<Anomaly | null> {
    if (existingAnomalies.length < 2) {
      return null; // Need multiple anomalies for multi-dimensional
    }

    const totalScore = existingAnomalies.reduce((sum, a) => sum + a.score, 0);
    const avgScore = totalScore / existingAnomalies.length;

    if (avgScore < 0.5) {
      return null; // Not significant enough
    }

    const severity: AnomalySeverity = 
      avgScore > 0.8 ? 'critical' :
      avgScore > 0.6 ? 'high' :
      'medium';

    return {
      anomalyId: uuidv4(),
      tenantId,
      opportunityId,
      anomalyType: 'multidimensional',
      severity,
      score: avgScore,
      detectedAt: new Date(),
      data: {
        value: data,
        context: {
          anomalyCount: existingAnomalies.length,
          anomalyTypes: existingAnomalies.map(a => a.anomalyType),
        },
      },
      explanation: {
        summary: `Multiple anomalies detected across ${existingAnomalies.length} dimensions`,
        factors: existingAnomalies.map(a => a.explanation.summary),
        impact: 'Multi-dimensional anomalies suggest systemic issue or significant opportunity change',
        recommendations: [
          'Comprehensive review of opportunity required',
          'Check for data quality issues',
          'Review all related metrics',
        ],
      },
      status: 'new',
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get historical values for a metric
   */
  private async getHistoricalValues(
    tenantId: string,
    metric: string,
    context: string
  ): Promise<number[]> {
    // Placeholder - would query from database
    // For now, return sample data
    return [0.5, 0.6, 0.55, 0.58, 0.52, 0.57, 0.59, 0.54, 0.56, 0.58, 0.55, 0.57];
  }

  /**
   * Get historical trend
   */
  private async getHistoricalTrend(
    tenantId: string,
    opportunityId: string,
    metric: string
  ): Promise<number[]> {
    // Placeholder - would query from database
    return [10, 12, 11, 13, 12, 14, 15];
  }

  /**
   * Calculate summary
   */
  private calculateSummary(anomalies: Anomaly[]): AnomalyDetectionResult['summary'] {
    const byType: Record<AnomalyType, number> = {
      statistical: 0,
      pattern: 0,
      temporal: 0,
      multidimensional: 0,
      forecast_miss: 0,
    };

    const bySeverity: Record<AnomalySeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalScore = 0;

    anomalies.forEach(anomaly => {
      byType[anomaly.anomalyType] = (byType[anomaly.anomalyType] || 0) + 1;
      bySeverity[anomaly.severity] = (bySeverity[anomaly.severity] || 0) + 1;
      totalScore += anomaly.score;
    });

    return {
      total: anomalies.length,
      byType,
      bySeverity,
      avgScore: anomalies.length > 0 ? totalScore / anomalies.length : 0,
    };
  }
}

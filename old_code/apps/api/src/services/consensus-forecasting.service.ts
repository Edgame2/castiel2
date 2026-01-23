/**
 * Consensus Forecasting Service
 * Aggregates multiple forecast sources into consensus
 * 
 * Features:
 * - Multi-source forecast aggregation
 * - Weighted consensus (by source reliability)
 * - Confidence interval calculation
 * - Forecast reconciliation
 * - Disagreement analysis
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { ForecastDecompositionService } from './forecast-decomposition.service.js';
import { RevenueForecastService, RevenueForecast } from './revenue-forecast.service.js';

export type ForecastSource = 'manager' | 'rep' | 'ai_model' | 'historical' | 'pipeline' | 'quota';

export interface ForecastSourceData {
  source: ForecastSource;
  forecast: number;
  confidence: number; // 0-1
  timestamp: Date;
  metadata?: {
    userId?: string;
    modelId?: string;
    method?: string;
    [key: string]: any;
  };
}

export interface ConsensusForecast {
  consensusId: string;
  tenantId: string; // Partition key
  period: string; // e.g., "2024-Q1"
  consensus: {
    value: number; // Consensus forecast value
    confidence: number; // 0-1: Overall confidence
    confidenceInterval: {
      lower: number;
      upper: number;
      level: number; // 0.95 for 95% CI
    };
  };
  sources: Array<{
    source: ForecastSource;
    forecast: number;
    weight: number; // 0-1: Weight in consensus
    reliability: number; // 0-1: Historical reliability
    contribution: number; // Contribution to consensus
  }>;
  disagreement: {
    level: 'low' | 'medium' | 'high';
    score: number; // 0-1: Disagreement score
    maxDeviation: number; // Max deviation from consensus
    sources: Array<{
      source: ForecastSource;
      deviation: number;
      reason?: string;
    }>;
  };
  reconciliation?: {
    reconciled: boolean;
    reconciledValue?: number;
    reconciliationMethod?: string;
    notes?: string;
  };
  createdAt: Date;
}

/**
 * Consensus Forecasting Service
 */
export class ConsensusForecastingService {
  private client: CosmosClient;
  private database: Database;
  private consensusContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private forecastDecompositionService?: ForecastDecompositionService;
  private revenueForecastService?: RevenueForecastService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    forecastDecompositionService?: ForecastDecompositionService,
    revenueForecastService?: RevenueForecastService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.forecastDecompositionService = forecastDecompositionService;
    this.revenueForecastService = revenueForecastService;

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
    this.consensusContainer = this.database.container(config.cosmosDb.containers.consensusForecasts);
  }

  /**
   * Generate consensus forecast from multiple sources
   */
  async generateConsensus(
    tenantId: string,
    period: string,
    sources: ForecastSourceData[]
  ): Promise<ConsensusForecast> {
    if (sources.length === 0) {
      throw new Error('At least one forecast source is required');
    }

    // Calculate source reliability (would be learned from historical accuracy)
    const sourceReliability = await this.getSourceReliability(tenantId, sources);

    // Calculate weights based on reliability and confidence
    const weights = this.calculateWeights(sources, sourceReliability);

    // Calculate weighted consensus
    const consensusValue = sources.reduce((sum, source, index) => 
      sum + source.forecast * weights[index], 0
    );

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(sources, weights);

    // Calculate confidence interval
    const confidenceInterval = this.calculateConfidenceInterval(sources, weights, consensusValue);

    // Analyze disagreement
    const disagreement = this.analyzeDisagreement(sources, consensusValue, weights);

    // Build source details
    const sourceDetails = sources.map((source, index) => ({
      source: source.source,
      forecast: source.forecast,
      weight: weights[index],
      reliability: sourceReliability[source.source] || 0.5,
      contribution: source.forecast * weights[index],
    }));

    const consensus: ConsensusForecast = {
      consensusId: uuidv4(),
      tenantId,
      period,
      consensus: {
        value: consensusValue,
        confidence: overallConfidence,
        confidenceInterval,
      },
      sources: sourceDetails,
      disagreement,
      createdAt: new Date(),
    };

    await this.consensusContainer.items.create(consensus);

    this.monitoring?.trackEvent('consensus_forecast.generated', {
      tenantId,
      period,
      sourceCount: sources.length,
      consensusValue,
      disagreementLevel: disagreement.level,
    });

    return consensus;
  }

  /**
   * Reconcile forecasts when there's high disagreement
   */
  async reconcileForecasts(
    tenantId: string,
    consensusId: string,
    method: 'average' | 'weighted_average' | 'median' | 'expert_override',
    expertValue?: number
  ): Promise<ConsensusForecast> {
    const { resource: consensus } = await this.consensusContainer.item(consensusId, tenantId).read<ConsensusForecast>();
    if (!consensus) {
      throw new Error(`Consensus forecast not found: ${consensusId}`);
    }

    let reconciledValue: number;

    switch (method) {
      case 'average':
        reconciledValue = consensus.sources.reduce((sum, s) => sum + s.forecast, 0) / consensus.sources.length;
        break;

      case 'weighted_average':
        reconciledValue = consensus.consensus.value; // Already weighted
        break;

      case 'median':
        const sortedForecasts = consensus.sources.map(s => s.forecast).sort((a, b) => a - b);
        const mid = Math.floor(sortedForecasts.length / 2);
        reconciledValue = sortedForecasts.length % 2 === 0
          ? (sortedForecasts[mid - 1] + sortedForecasts[mid]) / 2
          : sortedForecasts[mid];
        break;

      case 'expert_override':
        if (expertValue === undefined) {
          throw new Error('Expert value required for expert_override method');
        }
        reconciledValue = expertValue;
        break;

      default:
        throw new Error(`Unknown reconciliation method: ${method}`);
    }

    consensus.reconciliation = {
      reconciled: true,
      reconciledValue,
      reconciliationMethod: method,
      notes: `Reconciled using ${method} method`,
    };

    consensus.consensus.value = reconciledValue;

    await this.consensusContainer.item(consensusId, tenantId).replace(consensus);

    this.monitoring?.trackEvent('consensus_forecast.reconciled', {
      tenantId,
      consensusId,
      method,
      originalValue: consensus.consensus.value,
      reconciledValue,
    });

    return consensus;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get source reliability (would query from historical accuracy)
   */
  private async getSourceReliability(
    tenantId: string,
    sources: ForecastSourceData[]
  ): Promise<Record<ForecastSource, number>> {
    // Placeholder - would query historical accuracy from database
    // Default reliability scores
    const defaultReliability: Record<ForecastSource, number> = {
      manager: 0.75,
      rep: 0.70,
      ai_model: 0.80,
      historical: 0.85,
      pipeline: 0.75,
      quota: 0.90,
    };

    const reliability: Record<string, number> = {};
    sources.forEach(source => {
      reliability[source.source] = defaultReliability[source.source] || 0.7;
    });

    return reliability as Record<ForecastSource, number>;
  }

  /**
   * Calculate weights for sources
   */
  private calculateWeights(
    sources: ForecastSourceData[],
    reliability: Record<ForecastSource, number>
  ): number[] {
    // Weight = (reliability * confidence) / sum of all (reliability * confidence)
    const weightedScores = sources.map(source => 
      (reliability[source.source] || 0.5) * source.confidence
    );

    const sum = weightedScores.reduce((s, score) => s + score, 0);

    if (sum === 0) {
      // Equal weights if all scores are 0
      return sources.map(() => 1 / sources.length);
    }

    return weightedScores.map(score => score / sum);
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    sources: ForecastSourceData[],
    weights: number[]
  ): number {
    // Weighted average of source confidences
    return sources.reduce((sum, source, index) => 
      sum + source.confidence * weights[index], 0
    );
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidenceInterval(
    sources: ForecastSourceData[],
    weights: number[],
    consensusValue: number
  ): ConsensusForecast['consensus']['confidenceInterval'] {
    // Calculate weighted standard deviation
    const variance = sources.reduce((sum, source, index) => {
      const deviation = source.forecast - consensusValue;
      return sum + weights[index] * deviation * deviation;
    }, 0);

    const stdDev = Math.sqrt(variance);

    // 95% confidence interval (1.96 standard deviations)
    const zScore = 1.96;
    const margin = zScore * stdDev;

    return {
      lower: Math.max(0, consensusValue - margin),
      upper: consensusValue + margin,
      level: 0.95,
    };
  }

  /**
   * Analyze disagreement between sources
   */
  private analyzeDisagreement(
    sources: ForecastSourceData[],
    consensusValue: number,
    weights: number[]
  ): ConsensusForecast['disagreement'] {
    // Calculate deviations
    const deviations = sources.map((source, index) => ({
      source: source.source,
      deviation: Math.abs(source.forecast - consensusValue),
      weight: weights[index],
    }));

    const maxDeviation = Math.max(...deviations.map(d => d.deviation));

    // Calculate disagreement score (coefficient of variation)
    const meanForecast = sources.reduce((sum, s) => sum + s.forecast, 0) / sources.length;
    const variance = sources.reduce((sum, s) => {
      const diff = s.forecast - meanForecast;
      return sum + diff * diff;
    }, 0) / sources.length;
    const stdDev = Math.sqrt(variance);
    const disagreementScore = meanForecast > 0 ? stdDev / meanForecast : 0;

    const level: 'low' | 'medium' | 'high' = 
      disagreementScore > 0.2 ? 'high' :
      disagreementScore > 0.1 ? 'medium' :
      'low';

    return {
      level,
      score: Math.min(1.0, disagreementScore),
      maxDeviation,
      sources: deviations
        .sort((a, b) => b.deviation - a.deviation)
        .slice(0, 3)
        .map(d => ({
          source: d.source,
          deviation: d.deviation,
          reason: d.deviation > meanForecast * 0.2 
            ? 'Significant deviation from consensus'
            : undefined,
        })),
    };
  }
}

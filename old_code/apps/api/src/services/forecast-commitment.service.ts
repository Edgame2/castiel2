/**
 * Forecast Commitment Service
 * Intelligence about forecast commitment levels
 * 
 * Features:
 * - Commitment level scoring
 * - Sandbagging detection
 * - Happy ears detection
 * - Forecast accuracy prediction
 * - Commitment improvement recommendations
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { ConsensusForecastingService } from './consensus-forecasting.service.js';
import { RiskEvaluationService } from './risk-evaluation.service.js';

export type CommitmentLevel = 'commit' | 'best_case' | 'upside' | 'risk';

export interface CommitmentAnalysis {
  analysisId: string;
  tenantId: string; // Partition key
  forecastId?: string;
  period: string; // e.g., "2024-Q1"
  commitment: {
    commit: number; // High confidence (80%+)
    bestCase: number; // Optimistic
    upside: number; // Additional potential
    risk: number; // At-risk amount
    total: number; // Total forecast
  };
  scoring: {
    commitmentScore: number; // 0-1: Overall commitment quality
    sandbaggingScore: number; // 0-1: Likelihood of sandbagging (higher = more likely)
    happyEarsScore: number; // 0-1: Likelihood of happy ears (higher = more likely)
    accuracyPrediction: number; // 0-1: Predicted forecast accuracy
    factors: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      score: number;
    }>;
  };
  detection: {
    sandbagging: {
      detected: boolean;
      confidence: number; // 0-1
      indicators: string[];
    };
    happyEars: {
      detected: boolean;
      confidence: number; // 0-1
      indicators: string[];
    };
  };
  recommendations: Array<{
    type: 'increase_commitment' | 'reduce_sandbagging' | 'address_happy_ears' | 'improve_accuracy';
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImpact: string;
  }>;
  createdAt: Date;
}

export interface CommitmentHistory {
  historyId: string;
  tenantId: string;
  userId?: string;
  period: string;
  forecasted: number;
  actual: number;
  accuracy: number; // 0-1: How accurate was the forecast
  commitmentLevel: CommitmentLevel;
  timestamp: Date;
}

/**
 * Forecast Commitment Service
 */
export class ForecastCommitmentService {
  private client: CosmosClient;
  private database: Database;
  private analysisContainer: Container;
  private historyContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private consensusForecastingService?: ConsensusForecastingService;
  private riskEvaluationService?: RiskEvaluationService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    consensusForecastingService?: ConsensusForecastingService,
    riskEvaluationService?: RiskEvaluationService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.consensusForecastingService = consensusForecastingService;
    this.riskEvaluationService = riskEvaluationService;

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
    this.analysisContainer = this.database.container(config.cosmosDb.containers.forecastCommitments);
    this.historyContainer = this.database.container(config.cosmosDb.containers.forecastCommitments);
  }

  /**
   * Analyze forecast commitment
   */
  async analyzeCommitment(
    tenantId: string,
    period: string,
    forecast: {
      commit: number;
      bestCase: number;
      upside: number;
      risk: number;
      total: number;
    },
    userId?: string
  ): Promise<CommitmentAnalysis> {
    const analysisId = uuidv4();

    // Calculate commitment score
    const commitmentScore = this.calculateCommitmentScore(forecast);

    // Detect sandbagging
    const sandbagging = await this.detectSandbagging(tenantId, userId, forecast, period);

    // Detect happy ears
    const happyEars = await this.detectHappyEars(tenantId, userId, forecast, period);

    // Predict accuracy
    const accuracyPrediction = await this.predictAccuracy(tenantId, userId, forecast, period);

    // Build scoring factors
    const factors = this.buildScoringFactors(forecast, sandbagging, happyEars, accuracyPrediction);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      commitmentScore,
      sandbagging,
      happyEars,
      accuracyPrediction
    );

    const analysis: CommitmentAnalysis = {
      analysisId,
      tenantId,
      period,
      commitment: forecast,
      scoring: {
        commitmentScore,
        sandbaggingScore: sandbagging.confidence,
        happyEarsScore: happyEars.confidence,
        accuracyPrediction,
        factors,
      },
      detection: {
        sandbagging,
        happyEars,
      },
      recommendations,
      createdAt: new Date(),
    };

    await this.analysisContainer.items.create(analysis);

    this.monitoring?.trackEvent('forecast_commitment.analyzed', {
      tenantId,
      period,
      commitmentScore,
      sandbaggingDetected: sandbagging.detected,
      happyEarsDetected: happyEars.detected,
      userId,
    });

    return analysis;
  }

  /**
   * Record forecast outcome for learning
   */
  async recordOutcome(
    tenantId: string,
    period: string,
    forecasted: number,
    actual: number,
    commitmentLevel: CommitmentLevel,
    userId?: string
  ): Promise<CommitmentHistory> {
    const historyId = uuidv4();
    const accuracy = actual > 0 ? Math.min(1.0, Math.abs(forecasted - actual) / actual) : 1.0;

    const history: CommitmentHistory = {
      historyId,
      tenantId,
      userId,
      period,
      forecasted,
      actual,
      accuracy: 1 - accuracy, // Convert error to accuracy
      commitmentLevel,
      timestamp: new Date(),
    };

    await this.historyContainer.items.create(history);

    this.monitoring?.trackEvent('forecast_commitment.outcome_recorded', {
      tenantId,
      period,
      accuracy: history.accuracy,
      userId,
    });

    return history;
  }

  // ============================================
  // Detection Methods
  // ============================================

  /**
   * Calculate commitment score
   */
  private calculateCommitmentScore(forecast: CommitmentAnalysis['commitment']): number {
    // Higher commit percentage = better commitment score
    const commitPercentage = forecast.total > 0 ? forecast.commit / forecast.total : 0;
    
    // Lower risk percentage = better commitment score
    const riskPercentage = forecast.total > 0 ? forecast.risk / forecast.total : 0;

    // Score = commit percentage - risk percentage (weighted)
    return Math.max(0, Math.min(1.0, commitPercentage * 0.7 - riskPercentage * 0.3 + 0.5));
  }

  /**
   * Detect sandbagging (intentionally low forecasts)
   */
  private async detectSandbagging(
    tenantId: string,
    userId: string | undefined,
    forecast: CommitmentAnalysis['commitment'],
    period: string
  ): Promise<CommitmentAnalysis['detection']['sandbagging']> {
    // Get historical accuracy
    const historicalAccuracy = await this.getHistoricalAccuracy(tenantId, userId);

    // Indicators
    const indicators: string[] = [];
    let confidence = 0.0;

    // Indicator 1: Large gap between commit and best case
    const commitToBestGap = forecast.bestCase - forecast.commit;
    const gapPercentage = forecast.commit > 0 ? commitToBestGap / forecast.commit : 0;
    
    if (gapPercentage > 0.3) {
      confidence += 0.3;
      indicators.push(`Large gap between commit (${forecast.commit}) and best case (${forecast.bestCase})`);
    }

    // Indicator 2: Historical pattern of under-forecasting
    if (historicalAccuracy > 0.9) {
      confidence += 0.3;
      indicators.push('Historical pattern of consistently exceeding forecasts');
    }

    // Indicator 3: Low risk percentage (suggests conservative forecasting)
    const riskPercentage = forecast.total > 0 ? forecast.risk / forecast.total : 0;
    if (riskPercentage < 0.1) {
      confidence += 0.2;
      indicators.push('Very low risk percentage suggests conservative forecasting');
    }

    // Indicator 4: High upside potential
    const upsidePercentage = forecast.total > 0 ? forecast.upside / forecast.total : 0;
    if (upsidePercentage > 0.2) {
      confidence += 0.2;
      indicators.push('High upside potential suggests room for higher commitment');
    }

    return {
      detected: confidence > 0.5,
      confidence: Math.min(1.0, confidence),
      indicators,
    };
  }

  /**
   * Detect happy ears (overly optimistic forecasts)
   */
  private async detectHappyEars(
    tenantId: string,
    userId: string | undefined,
    forecast: CommitmentAnalysis['commitment'],
    period: string
  ): Promise<CommitmentAnalysis['detection']['happyEars']> {
    const indicators: string[] = [];
    let confidence = 0.0;

    // Indicator 1: High best case relative to commit
    const bestCasePercentage = forecast.commit > 0 ? forecast.bestCase / forecast.commit : 0;
    if (bestCasePercentage > 1.5) {
      confidence += 0.3;
      indicators.push(`Best case (${forecast.bestCase}) significantly exceeds commit (${forecast.commit})`);
    }

    // Indicator 2: Low risk percentage (ignoring risks)
    const riskPercentage = forecast.total > 0 ? forecast.risk / forecast.total : 0;
    if (riskPercentage < 0.05) {
      confidence += 0.3;
      indicators.push('Very low risk percentage may indicate ignoring potential issues');
    }

    // Indicator 3: Historical pattern of missing forecasts
    const historicalAccuracy = await this.getHistoricalAccuracy(tenantId, userId);
    if (historicalAccuracy < 0.7) {
      confidence += 0.4;
      indicators.push('Historical pattern of missing forecasts');
    }

    // Indicator 4: High commitment with low confidence signals
    const commitPercentage = forecast.total > 0 ? forecast.commit / forecast.total : 0;
    if (commitPercentage > 0.8 && riskPercentage < 0.1) {
      confidence += 0.2;
      indicators.push('High commitment with low risk may indicate overconfidence');
    }

    return {
      detected: confidence > 0.5,
      confidence: Math.min(1.0, confidence),
      indicators,
    };
  }

  /**
   * Predict forecast accuracy
   */
  private async predictAccuracy(
    tenantId: string,
    userId: string | undefined,
    forecast: CommitmentAnalysis['commitment'],
    period: string
  ): Promise<number> {
    // Get historical accuracy
    const historicalAccuracy = await this.getHistoricalAccuracy(tenantId, userId);

    // Adjust based on commitment quality
    const commitmentScore = this.calculateCommitmentScore(forecast);
    
    // Predict accuracy = historical accuracy adjusted by commitment quality
    const predictedAccuracy = historicalAccuracy * 0.7 + commitmentScore * 0.3;

    return Math.max(0, Math.min(1.0, predictedAccuracy));
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get historical accuracy
   */
  private async getHistoricalAccuracy(
    tenantId: string,
    userId: string | undefined
  ): Promise<number> {
    // Query historical outcomes
    let querySpec: any = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.timestamp DESC',
      parameters: [{ name: '@tenantId', value: tenantId }],
    };

    if (userId) {
      querySpec.query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId ORDER BY c.timestamp DESC';
    }

    querySpec.query += ' OFFSET 0 LIMIT 10';

    try {
      const { resources } = await this.historyContainer.items.query(querySpec).fetchAll();
      const history = resources as CommitmentHistory[];

      if (history.length === 0) {
        return 0.75; // Default accuracy
      }

      const avgAccuracy = history.reduce((sum, h) => sum + h.accuracy, 0) / history.length;
      return avgAccuracy;
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'getHistoricalAccuracy',
        tenantId,
        userId,
      });
      return 0.75; // Default
    }
  }

  /**
   * Build scoring factors
   */
  private buildScoringFactors(
    forecast: CommitmentAnalysis['commitment'],
    sandbagging: CommitmentAnalysis['detection']['sandbagging'],
    happyEars: CommitmentAnalysis['detection']['happyEars'],
    accuracyPrediction: number
  ): CommitmentAnalysis['scoring']['factors'] {
    const factors: CommitmentAnalysis['scoring']['factors'] = [];

    const commitPercentage = forecast.total > 0 ? forecast.commit / forecast.total : 0;
    factors.push({
      factor: 'Commit percentage',
      impact: commitPercentage > 0.7 ? 'positive' : commitPercentage < 0.5 ? 'negative' : 'neutral',
      score: commitPercentage,
    });

    if (sandbagging.detected) {
      factors.push({
        factor: 'Sandbagging detected',
        impact: 'negative',
        score: sandbagging.confidence,
      });
    }

    if (happyEars.detected) {
      factors.push({
        factor: 'Happy ears detected',
        impact: 'negative',
        score: happyEars.confidence,
      });
    }

    factors.push({
      factor: 'Predicted accuracy',
      impact: accuracyPrediction > 0.8 ? 'positive' : accuracyPrediction < 0.6 ? 'negative' : 'neutral',
      score: accuracyPrediction,
    });

    return factors;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    commitmentScore: number,
    sandbagging: CommitmentAnalysis['detection']['sandbagging'],
    happyEars: CommitmentAnalysis['detection']['happyEars'],
    accuracyPrediction: number
  ): CommitmentAnalysis['recommendations'] {
    const recommendations: CommitmentAnalysis['recommendations'] = [];

    if (commitmentScore < 0.6) {
      recommendations.push({
        type: 'increase_commitment',
        priority: 'high',
        description: 'Low commitment score - focus on increasing high-confidence commitments',
        expectedImpact: 'Could improve forecast reliability by 15-20%',
      });
    }

    if (sandbagging.detected) {
      recommendations.push({
        type: 'reduce_sandbagging',
        priority: 'medium',
        description: 'Sandbagging detected - encourage more realistic forecasting',
        expectedImpact: 'Could increase forecast accuracy by 10-15%',
      });
    }

    if (happyEars.detected) {
      recommendations.push({
        type: 'address_happy_ears',
        priority: 'high',
        description: 'Happy ears detected - address over-optimism and risk factors',
        expectedImpact: 'Could prevent forecast misses by 20-25%',
      });
    }

    if (accuracyPrediction < 0.7) {
      recommendations.push({
        type: 'improve_accuracy',
        priority: 'medium',
        description: 'Predicted accuracy is below optimal - review forecasting process',
        expectedImpact: 'Could improve forecast accuracy by 10-15%',
      });
    }

    return recommendations;
  }
}

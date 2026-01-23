/**
 * Evaluation Service
 * 
 * Evaluates model performance and detects drift.
 * Monitors feature distribution, prediction distribution, and outcome drift.
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { CosmosClient, Database } from '@azure/cosmos';
import type {
  ModelMetrics,
  DriftDetectionResult,
  ModelType,
} from '../../types/ml.types.js';

export class EvaluationService {
  constructor(
    private monitoring: IMonitoringProvider,
    private cosmosClient: CosmosClient,
    private database: Database
  ) {}

  /**
   * Evaluate model performance
   */
  async evaluateModel(
    modelId: string,
    predictions: Array<{ prediction: number; actual: number; timestamp: Date }>,
    modelType: ModelType
  ): Promise<ModelMetrics> {
    try {
      // Calculate metrics based on model type
      const metrics = this.calculateMetrics(predictions, modelType);

      // Detect drift
      const drift = {
        featureDistribution: await this.detectFeatureDistributionDrift(modelId),
        predictionDistribution: await this.detectPredictionDistributionDrift(modelId),
        outcome: await this.detectOutcomeDrift(modelId, predictions),
      };

      const modelMetrics: ModelMetrics = {
        modelId,
        modelVersion: '1.0.0', // Would get from model metadata
        modelType,
        metrics,
        drift,
        evaluationExamples: predictions.length,
        timeWindow: {
          start: predictions[0]?.timestamp || new Date(),
          end: predictions[predictions.length - 1]?.timestamp || new Date(),
        },
        calculatedAt: new Date(),
      };

      // Log metrics to Application Insights
      await this.logMetrics(modelId, modelMetrics);

      return modelMetrics;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'evaluation_service.evaluate_model',
        modelId,
      });
      throw error;
    }
  }

  /**
   * Track prediction outcome for drift detection
   */
  async trackPrediction(
    modelId: string,
    prediction: number,
    actual: number | null,
    timestamp: Date = new Date()
  ): Promise<void> {
    try {
      // Store prediction for later evaluation
      // In production, store in Cosmos DB or time-series database
      const container = this.database.container('ml_training_jobs'); // Reuse container or create ml_predictions
      
      await container.items.create({
        id: `pred-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        modelId,
        prediction,
        actual,
        timestamp,
        createdAt: new Date(),
      });
    } catch (error) {
      // Log but don't fail - tracking is not critical
      this.monitoring.trackException(error as Error, {
        operation: 'evaluation_service.track_prediction',
        modelId,
      });
    }
  }

  /**
   * Detect feature distribution drift
   */
  async detectFeatureDistributionDrift(modelId: string): Promise<DriftDetectionResult> {
    try {
      // Get baseline feature distribution (from training data)
      const baseline = await this.getBaselineFeatureDistribution(modelId);
      
      // Get current feature distribution (from recent predictions)
      const current = await this.getCurrentFeatureDistribution(modelId);

      // Perform Kolmogorov-Smirnov test
      const ksScore = this.kolmogorovSmirnovTest(baseline, current);
      const threshold = 0.1; // Configurable threshold

      const detected = ksScore > threshold;

      if (detected) {
        this.monitoring.trackMetric('ml.drift.feature_distribution.detected', 1, {
          modelId,
          score: ksScore,
        });
      }

      return {
        type: 'feature_distribution',
        detected,
        score: ksScore,
        threshold,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'evaluation_service.detect_feature_drift',
        modelId,
      });
      return {
        type: 'feature_distribution',
        detected: false,
        score: 0,
        threshold: 0.1,
      };
    }
  }

  /**
   * Detect prediction distribution drift
   */
  async detectPredictionDistributionDrift(modelId: string): Promise<DriftDetectionResult> {
    try {
      // Get baseline prediction distribution
      const baseline = await this.getBaselinePredictionDistribution(modelId);
      
      // Get current prediction distribution
      const current = await this.getCurrentPredictionDistribution(modelId);

      // Perform Kolmogorov-Smirnov test
      const ksScore = this.kolmogorovSmirnovTest(baseline, current);
      const threshold = 0.1;

      const detected = ksScore > threshold;

      if (detected) {
        this.monitoring.trackMetric('ml.drift.prediction_distribution.detected', 1, {
          modelId,
          score: ksScore,
        });
      }

      return {
        type: 'prediction_distribution',
        detected,
        score: ksScore,
        threshold,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'evaluation_service.detect_prediction_drift',
        modelId,
      });
      return {
        type: 'prediction_distribution',
        detected: false,
        score: 0,
        threshold: 0.1,
      };
    }
  }

  /**
   * Detect outcome drift (most critical)
   */
  async detectOutcomeDrift(
    modelId: string,
    recentPredictions: Array<{ prediction: number; actual: number }>
  ): Promise<DriftDetectionResult> {
    try {
      // Get baseline accuracy
      const baselineAccuracy = await this.getBaselineAccuracy(modelId);
      
      // Calculate current accuracy
      const currentAccuracy = this.calculateAccuracy(recentPredictions);

      // Calculate accuracy degradation
      const accuracyDegradation = baselineAccuracy - currentAccuracy;
      const threshold = 0.05; // 5% degradation threshold

      const detected = accuracyDegradation > threshold;

      if (detected) {
        this.monitoring.trackMetric('ml.drift.outcome.detected', 1, {
          modelId,
          degradation: accuracyDegradation,
        });
      }

      return {
        type: 'outcome',
        detected,
        score: accuracyDegradation,
        threshold,
        details: {
          baselineAccuracy,
          currentAccuracy,
          degradation: accuracyDegradation,
        },
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'evaluation_service.detect_outcome_drift',
        modelId,
      });
      return {
        type: 'outcome',
        detected: false,
        score: 0,
        threshold: 0.05,
      };
    }
  }

  /**
   * Determine if model should be retrained
   */
  async shouldRetrain(modelId: string): Promise<boolean> {
    try {
      const drift = {
        feature: await this.detectFeatureDistributionDrift(modelId),
        prediction: await this.detectPredictionDistributionDrift(modelId),
        outcome: await this.detectOutcomeDrift(modelId, []), // Would pass recent predictions
      };

      // Retrain if any drift is detected
      return drift.feature.detected || drift.prediction.detected || drift.outcome.detected;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'evaluation_service.should_retrain',
        modelId,
      });
      return false;
    }
  }

  /**
   * Log metrics to Application Insights
   */
  private async logMetrics(modelId: string, metrics: ModelMetrics): Promise<void> {
    // Log all metrics to Application Insights
    this.monitoring.trackMetric('ml.model.metrics', 1, {
      modelId,
      modelType: metrics.modelType,
      ...metrics.metrics,
    });

    // Log drift detection
    if (metrics.drift.featureDistribution?.detected) {
      this.monitoring.trackMetric('ml.drift.feature', metrics.drift.featureDistribution.score, {
        modelId,
      });
    }

    if (metrics.drift.predictionDistribution?.detected) {
      this.monitoring.trackMetric('ml.drift.prediction', metrics.drift.predictionDistribution.score, {
        modelId,
      });
    }

    if (metrics.drift.outcome?.detected) {
      this.monitoring.trackMetric('ml.drift.outcome', metrics.drift.outcome.score, {
        modelId,
        degradation: metrics.drift.outcome.accuracyDegradation,
      });
    }
  }

  // ============================================================================
  // Private Methods - Metrics Calculation
  // ============================================================================

  /**
   * Calculate metrics based on model type
   */
  private calculateMetrics(
    predictions: Array<{ prediction: number; actual: number }>,
    modelType: ModelType
  ): ModelMetrics['metrics'] {
    const metrics: ModelMetrics['metrics'] = {};

    switch (modelType) {
      case 'risk_scoring':
        // Regression metrics
        const errors = predictions.map(p => p.prediction - p.actual);
        const mse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
        const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length;
        const meanActual = predictions.reduce((sum, p) => sum + p.actual, 0) / predictions.length;
        const ssRes = errors.reduce((sum, e) => sum + e * e, 0);
        const ssTot = predictions.reduce((sum, p) => sum + Math.pow(p.actual - meanActual, 2), 0);
        const r2 = 1 - (ssRes / ssTot);

        metrics.mse = mse;
        metrics.mae = mae;
        metrics.r2Score = r2;
        break;

      case 'forecasting':
        // Forecasting metrics
        const forecastErrors = predictions.map(p => Math.abs(p.prediction - p.actual) / p.actual);
        const mape = forecastErrors.reduce((sum, e) => sum + e, 0) / forecastErrors.length;
        const forecastMse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
        const rmse = Math.sqrt(forecastMse);

        metrics.mape = mape;
        metrics.rmse = rmse;
        break;

      case 'recommendations':
        // Ranking metrics (simplified)
        metrics.precision = 0.5; // Placeholder
        metrics.recall = 0.5; // Placeholder
        break;
    }

    return metrics;
  }

  /**
   * Calculate accuracy
   */
  private calculateAccuracy(
    predictions: Array<{ prediction: number; actual: number }>
  ): number {
    if (predictions.length === 0) return 0;

    // For regression, use R² or similar
    // For classification, use accuracy
    const errors = predictions.map(p => Math.abs(p.prediction - p.actual));
    const meanError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
    const meanActual = predictions.reduce((sum, p) => sum + p.actual, 0) / predictions.length;
    
    return Math.max(0, 1 - (meanError / (meanActual + 1e-6)));
  }

  // ============================================================================
  // Private Methods - Drift Detection
  // ============================================================================

  /**
   * Kolmogorov-Smirnov test
   */
  private kolmogorovSmirnovTest(
    baseline: number[],
    current: number[]
  ): number {
    // Sort both distributions
    const sortedBaseline = [...baseline].sort((a, b) => a - b);
    const sortedCurrent = [...current].sort((a, b) => a - b);

    // Calculate empirical CDFs
    const maxDiff = this.calculateMaxCDFDifference(sortedBaseline, sortedCurrent);

    return maxDiff;
  }

  /**
   * Calculate maximum difference between CDFs
   */
  private calculateMaxCDFDifference(
    sorted1: number[],
    sorted2: number[]
  ): number {
    const allValues = [...new Set([...sorted1, ...sorted2])].sort((a, b) => a - b);
    let maxDiff = 0;

    for (const value of allValues) {
      const cdf1 = sorted1.filter(v => v <= value).length / sorted1.length;
      const cdf2 = sorted2.filter(v => v <= value).length / sorted2.length;
      const diff = Math.abs(cdf1 - cdf2);
      maxDiff = Math.max(maxDiff, diff);
    }

    return maxDiff;
  }

  // ============================================================================
  // Private Methods - Data Retrieval (Placeholders)
  // ============================================================================

  private async getBaselineFeatureDistribution(modelId: string): Promise<number[]> {
    // In production, retrieve from training data
    return [0.5, 0.6, 0.7, 0.8, 0.9]; // Placeholder
  }

  private async getCurrentFeatureDistribution(modelId: string): Promise<number[]> {
    // In production, retrieve from recent predictions
    return [0.4, 0.5, 0.6, 0.7, 0.8]; // Placeholder
  }

  private async getBaselinePredictionDistribution(modelId: string): Promise<number[]> {
    // In production, retrieve from training predictions
    return [0.3, 0.4, 0.5, 0.6, 0.7]; // Placeholder
  }

  private async getCurrentPredictionDistribution(modelId: string): Promise<number[]> {
    // In production, retrieve from recent predictions
    return [0.2, 0.3, 0.4, 0.5, 0.6]; // Placeholder
  }

  private async getBaselineAccuracy(modelId: string): Promise<number> {
    // In production, retrieve from model metadata
    return 0.85; // Placeholder
  }
}

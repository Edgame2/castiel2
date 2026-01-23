/**
 * Model Service
 * 
 * Manages ML model inference via Azure ML Managed Endpoints.
 * Handles model selection, prediction caching, and metadata sync.
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { CosmosClient, Database } from '@azure/cosmos';
import axios, { AxiosInstance } from 'axios';
import type {
  ModelType,
  ModelScope,
  MLModel,
  RiskScorePrediction,
  ForecastPrediction,
  FeatureVector,
} from '../../types/ml.types.js';
import { CalibrationService } from './calibration.service.js';

export class ModelService {
  private readonly PREDICTION_CACHE_PREFIX = 'ml:predictions:';
  private readonly MODEL_METADATA_CACHE_PREFIX = 'ml:model-metadata:';
  private readonly PREDICTION_CACHE_TTL = 15 * 60; // 15 minutes
  private readonly MODEL_METADATA_CACHE_TTL = 60 * 60; // 1 hour

  private httpClient: AxiosInstance;
  private calibrationService: CalibrationService;

  constructor(
    private monitoring: IMonitoringProvider,
    private redis: Redis | null,
    private cosmosClient: CosmosClient,
    private database: Database,
    private azureMLWorkspaceUrl: string,
    private azureMLApiKey?: string
  ) {
    this.httpClient = axios.create({
      timeout: 10000, // 10 seconds
      headers: azureMLApiKey
        ? { Authorization: `Bearer ${azureMLApiKey}` }
        : {},
    });

    this.calibrationService = new CalibrationService(monitoring, cosmosClient, database);
  }

  /**
   * Predict risk score for an opportunity
   */
  async predictRiskScore(
    features: FeatureVector,
    industryId?: string,
    requestId?: string
  ): Promise<RiskScorePrediction> {
    const startTime = Date.now();

    try {
      // Check cache
      const cacheKey = this.getPredictionCacheKey('risk_scoring', features, industryId);
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.monitoring.trackMetric('ml.predictions.cache_hit', 1, {
            modelType: 'risk_scoring',
          });
          return JSON.parse(cached) as RiskScorePrediction;
        }
      }

      // Select model
      const model = await this.selectModel('risk_scoring', industryId, requestId);

      // Call Azure ML endpoint
      const rawScore = await this.callAzureMLEndpoint(model.endpointUrl, features);

      // Apply calibration
      const calibratedScore = await this.calibrationService.applyCalibration(
        rawScore,
        model.version
      );

      const prediction: RiskScorePrediction = {
        riskScore: calibratedScore,
        rawScore,
        confidence: 0.9, // Placeholder - would come from model
        modelVersion: model.version,
        modelId: model.id,
        timestamp: new Date(),
      };

      // Cache prediction
      if (this.redis) {
        await this.redis.setex(
          cacheKey,
          this.PREDICTION_CACHE_TTL,
          JSON.stringify(prediction)
        );
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('ml.predictions.duration_ms', duration, {
        modelType: 'risk_scoring',
        modelId: model.id,
      });

      return prediction;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'model_service.predict_risk_score',
        industryId,
      });
      throw error;
    }
  }

  /**
   * Predict forecast for revenue forecasting
   */
  async predictForecast(
    features: FeatureVector,
    industryId?: string
  ): Promise<ForecastPrediction> {
    const startTime = Date.now();

    try {
      // Check cache
      const cacheKey = this.getPredictionCacheKey('forecasting', features, industryId);
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.monitoring.trackMetric('ml.predictions.cache_hit', 1, {
            modelType: 'forecasting',
          });
          return JSON.parse(cached) as ForecastPrediction;
        }
      }

      // Select model
      const model = await this.selectModel('forecasting', industryId);

      // Call Azure ML endpoint (quantile regression returns P10/P50/P90)
      const quantiles = await this.callAzureMLEndpoint(model.endpointUrl, features) as {
        p10: number;
        p50: number;
        p90: number;
      };

      const prediction: ForecastPrediction = {
        pointForecast: quantiles.p50,
        uncertainty: {
          p10: quantiles.p10,
          p50: quantiles.p50,
          p90: quantiles.p90,
        },
        confidence: 0.9, // Placeholder
        modelVersion: model.version,
        modelId: model.id,
        timestamp: new Date(),
      };

      // Cache prediction
      if (this.redis) {
        await this.redis.setex(
          cacheKey,
          this.PREDICTION_CACHE_TTL,
          JSON.stringify(prediction)
        );
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('ml.predictions.duration_ms', duration, {
        modelType: 'forecasting',
        modelId: model.id,
      });

      return prediction;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'model_service.predict_forecast',
        industryId,
      });
      throw error;
    }
  }

  /**
   * Get recommendations
   */
  async getRecommendations(
    features: FeatureVector,
    industryId?: string,
    limit: number = 10
  ): Promise<Array<{ itemId: string; score: number; rank: number }>> {
    const startTime = Date.now();

    try {
      // Select model
      const model = await this.selectModel('recommendations', industryId);

      // Call Azure ML endpoint
      const recommendations = await this.callAzureMLEndpoint(
        model.endpointUrl,
        features
      ) as Array<{ itemId: string; score: number }>;

      // Sort and rank
      const ranked = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((rec, index) => ({
          ...rec,
          rank: index + 1,
        }));

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('ml.predictions.duration_ms', duration, {
        modelType: 'recommendations',
        modelId: model.id,
      });

      return ranked;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'model_service.get_recommendations',
        industryId,
      });
      throw error;
    }
  }

  /**
   * Select model (global vs. industry-specific)
   * Implements shadow evaluation for industry models
   */
  async selectModel(
    modelType: ModelType,
    industryId?: string,
    requestId?: string
  ): Promise<MLModel> {
    try {
      // 1. Check for industry-specific model
      if (industryId) {
        const industryModel = await this.getIndustryModel(modelType, industryId);
        if (industryModel && industryModel.status === 'active') {
          // Check if industry model is better
          if (industryModel.performanceImprovement && industryModel.performanceImprovement > 0.05) {
            // Trigger shadow evaluation (async, non-blocking)
            if (requestId) {
              this.triggerShadowEvaluation(
                requestId,
                industryModel.id,
                modelType
              ).catch(error => {
                // Log error but don't block inference
                this.monitoring.trackException(error as Error, {
                  operation: 'model_service.shadow_evaluation',
                  modelType,
                  industryId,
                });
              });
            }

            return industryModel;
          }
        }
      }

      // 2. Fall back to global model
      return await this.getGlobalModel(modelType);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'model_service.select_model',
        modelType,
        industryId,
      });
      throw error;
    }
  }

  /**
   * Get model metadata
   */
  async getModelMetadata(modelType: ModelType, scope?: ModelScope): Promise<MLModel | null> {
    try {
      const container = this.database.container('ml_models');
      let query: any = {
        query: 'SELECT * FROM c WHERE c.modelType = @modelType AND c.status = @status',
        parameters: [
          { name: '@modelType', value: modelType },
          { name: '@status', value: 'active' },
        ],
      };

      if (scope) {
        query.query += ' AND c.scope = @scope';
        query.parameters.push({ name: '@scope', value: scope });
      }

      query.query += ' ORDER BY c.trainingDate DESC OFFSET 0 LIMIT 1';

      const { resources } = await container.items.query(query).fetchAll();
      return resources.length > 0 ? (resources[0] as MLModel) : null;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'model_service.get_model_metadata',
        modelType,
        scope,
      });
      return null;
    }
  }

  /**
   * Invalidate prediction cache for an opportunity
   */
  async invalidatePredictionCache(opportunityId: string, tenantId: string): Promise<void> {
    if (!this.redis) return;

    try {
      const pattern = `${this.PREDICTION_CACHE_PREFIX}${tenantId}:${opportunityId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.monitoring.trackMetric('ml.predictions.cache_invalidated', keys.length, {
          opportunityId,
          tenantId,
        });
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'model_service.invalidate_cache',
        opportunityId,
      });
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Call Azure ML Managed Endpoint
   */
  private async callAzureMLEndpoint(
    endpointUrl: string,
    features: FeatureVector
  ): Promise<number | { p10: number; p50: number; p90: number } | Array<{ itemId: string; score: number }>> {
    try {
      const response = await this.httpClient.post(endpointUrl, {
        input_data: {
          columns: Object.keys(features),
          data: [Object.values(features)],
        },
      });

      // Extract prediction from response
      // Azure ML returns predictions in various formats depending on model type
      const predictions = response.data?.outputs?.[0]?.data || response.data?.predictions || response.data;
      
      return predictions;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'model_service.call_endpoint',
        endpointUrl,
      });
      throw new Error(`Azure ML endpoint call failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get global model
   */
  private async getGlobalModel(modelType: ModelType): Promise<MLModel> {
    const cacheKey = `${this.MODEL_METADATA_CACHE_PREFIX}global:${modelType}`;
    
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as MLModel;
      }
    }

    const model = await this.getModelMetadata(modelType, 'global');
    
    if (!model) {
      throw new Error(`Global model not found for type: ${modelType}`);
    }

    if (this.redis) {
      await this.redis.setex(
        cacheKey,
        this.MODEL_METADATA_CACHE_TTL,
        JSON.stringify(model)
      );
    }

    return model;
  }

  /**
   * Get industry-specific model
   */
  private async getIndustryModel(
    modelType: ModelType,
    industryId: string
  ): Promise<MLModel | null> {
    const cacheKey = `${this.MODEL_METADATA_CACHE_PREFIX}industry:${modelType}:${industryId}`;
    
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as MLModel;
      }
    }

    const container = this.database.container('ml_models');
    const query = {
      query: 'SELECT * FROM c WHERE c.modelType = @modelType AND c.scope = @scope AND c.industryId = @industryId AND c.status = @status ORDER BY c.trainingDate DESC OFFSET 0 LIMIT 1',
      parameters: [
        { name: '@modelType', value: modelType },
        { name: '@scope', value: 'industry' },
        { name: '@industryId', value: industryId },
        { name: '@status', value: 'active' },
      ],
    };

    const { resources } = await container.items.query(query).fetchAll();
    const model = resources.length > 0 ? (resources[0] as MLModel) : null;

    if (model && this.redis) {
      await this.redis.setex(
        cacheKey,
        this.MODEL_METADATA_CACHE_TTL,
        JSON.stringify(model)
      );
    }

    return model;
  }

  /**
   * Trigger shadow evaluation (async, non-blocking)
   */
  private async triggerShadowEvaluation(
    requestId: string,
    primaryModelId: string,
    modelType: ModelType
  ): Promise<void> {
    // Queue shadow evaluation job (Azure Service Bus or background worker)
    // This runs asynchronously and does not block the primary inference
    
    // For Phase 1, just log the shadow evaluation request
    // In Phase 2, implement actual queue-based shadow evaluation
    this.monitoring.trackMetric('ml.shadow_evaluation.triggered', 1, {
      requestId,
      primaryModelId,
      modelType,
    });
  }

  /**
   * Get prediction cache key
   */
  private getPredictionCacheKey(
    modelType: ModelType,
    features: FeatureVector,
    industryId?: string
  ): string {
    // Create hash of features for cache key
    const featureHash = Buffer.from(JSON.stringify(features)).toString('base64').substring(0, 16);
    return `${this.PREDICTION_CACHE_PREFIX}${modelType}:${industryId || 'global'}:${featureHash}`;
  }
}

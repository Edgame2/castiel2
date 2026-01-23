/**
 * ML API Routes
 * 
 * REST API endpoints for ML predictions, model management, training, and evaluation.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { FeatureStoreService } from '../services/ml/feature-store.service.js';
import { ModelService } from '../services/ml/model.service.js';
import { TrainingService } from '../services/ml/training.service.js';
import { EvaluationService } from '../services/ml/evaluation.service.js';
import type {
  PredictRiskScoreRequest,
  PredictRiskScoreResponse,
  PredictForecastRequest,
  PredictForecastResponse,
  GetRecommendationsRequest,
  GetRecommendationsResponse,
  TrainingJobOptions,
} from '../types/ml.types.js';

interface MLRoutesOptions {
  monitoring: IMonitoringProvider;
  featureStoreService: FeatureStoreService;
  modelService: ModelService;
  trainingService: TrainingService;
  evaluationService: EvaluationService;
  cosmosDatabase: import('@azure/cosmos').Database;
}

/**
 * Register ML routes
 */
export async function registerMLRoutes(
  server: FastifyInstance,
  options: MLRoutesOptions
): Promise<void> {
  const {
    monitoring,
    featureStoreService,
    modelService,
    trainingService,
    evaluationService,
    cosmosDatabase,
  } = options;

  // ============================================================================
  // Risk Scoring Endpoints
  // ============================================================================

  server.post<{ Body: PredictRiskScoreRequest }>(
    '/api/v1/ml/risk-scoring/predict',
    {
      schema: {
        description: 'Predict risk score for an opportunity',
        tags: ['ml', 'risk-scoring'],
        body: {
          type: 'object',
          required: ['opportunityId', 'tenantId'],
          properties: {
            opportunityId: { type: 'string' },
            tenantId: { type: 'string' },
            industryId: { type: 'string' },
            includeFeatureImportance: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              prediction: {
                type: 'object',
                properties: {
                  riskScore: { type: 'number' },
                  rawScore: { type: 'number' },
                  confidence: { type: 'number' },
                  modelVersion: { type: 'string' },
                  modelId: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
              features: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: PredictRiskScoreRequest }>, reply: FastifyReply) => {
      try {
        const { opportunityId, tenantId, industryId, includeFeatureImportance } = request.body;

        // Extract features
        const featureSet = await featureStoreService.extractFeatures(
          opportunityId,
          tenantId
        );

        // Get prediction
        const prediction = await modelService.predictRiskScore(
          featureSet.features,
          industryId,
          request.id
        );

        const response: PredictRiskScoreResponse = {
          prediction,
          ...(includeFeatureImportance ? { features: featureSet.features } : {}),
        };

        return reply.code(200).send(response);
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'ml_api.predict_risk_score',
        });
        return reply.code(500).send({
          error: 'Failed to predict risk score',
          message: (error as Error).message,
        });
      }
    }
  );

  // ============================================================================
  // Forecasting Endpoints
  // ============================================================================

  server.post<{ Body: PredictForecastRequest }>(
    '/api/v1/ml/forecasting/predict',
    {
      schema: {
        description: 'Predict revenue forecast',
        tags: ['ml', 'forecasting'],
        body: {
          type: 'object',
          required: ['tenantId'],
          properties: {
            opportunityId: { type: 'string' },
            tenantId: { type: 'string' },
            teamId: { type: 'string' },
            industryId: { type: 'string' },
            forecastHorizon: { type: 'number' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: PredictForecastRequest }>, reply: FastifyReply) => {
      try {
        const { opportunityId, tenantId, industryId } = request.body;

        if (!opportunityId) {
          return reply.code(400).send({
            error: 'opportunityId is required for forecasting',
          });
        }

        // Extract features
        const featureSet = await featureStoreService.extractFeatures(
          opportunityId,
          tenantId
        );

        // Get prediction
        const prediction = await modelService.predictForecast(
          featureSet.features,
          industryId
        );

        const response: PredictForecastResponse = {
          prediction,
          level: 'opportunity',
        };

        return reply.code(200).send(response);
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'ml_api.predict_forecast',
        });
        return reply.code(500).send({
          error: 'Failed to predict forecast',
          message: (error as Error).message,
        });
      }
    }
  );

  // ============================================================================
  // Recommendations Endpoints
  // ============================================================================

  server.post<{ Body: GetRecommendationsRequest }>(
    '/api/v1/ml/recommendations/predict',
    {
      schema: {
        description: 'Get ML-enhanced recommendations',
        tags: ['ml', 'recommendations'],
        body: {
          type: 'object',
          required: ['userId', 'tenantId'],
          properties: {
            userId: { type: 'string' },
            tenantId: { type: 'string' },
            context: { type: 'object' },
            limit: { type: 'number' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: GetRecommendationsRequest }>, reply: FastifyReply) => {
      try {
        const { userId, tenantId, context, limit } = request.body;

        // Convert context to features (simplified)
        const features: Record<string, unknown> = {
          userId,
          ...context,
        };

        // Get recommendations
        const recommendations = await modelService.getRecommendations(
          features,
          undefined,
          limit
        );

        const response: GetRecommendationsResponse = {
          recommendations: recommendations.map(rec => ({
            itemId: rec.itemId,
            score: rec.score,
            rank: rec.rank,
            modelVersion: '1.0.0', // Would get from model
            modelId: 'model-id', // Would get from model
            timestamp: new Date(),
          })),
        };

        return reply.code(200).send(response);
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'ml_api.get_recommendations',
        });
        return reply.code(500).send({
          error: 'Failed to get recommendations',
          message: (error as Error).message,
        });
      }
    }
  );

  // ============================================================================
  // Model Management Endpoints
  // ============================================================================

  server.get(
    '/api/v1/ml/models',
    {
      schema: {
        description: 'List all models',
        tags: ['ml', 'models'],
        querystring: {
          type: 'object',
          properties: {
            modelType: { type: 'string' },
            scope: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { modelType?: string; scope?: string } }>, reply: FastifyReply) => {
      try {
        const { modelType, scope } = request.query;

        // Get models from Cosmos DB
        const container = cosmosDatabase.container('ml_models');
        let query: any = {
          query: 'SELECT * FROM c WHERE 1=1',
          parameters: [],
        };

        if (modelType) {
          query.query += ' AND c.modelType = @modelType';
          query.parameters.push({ name: '@modelType', value: modelType });
        }

        if (scope) {
          query.query += ' AND c.scope = @scope';
          query.parameters.push({ name: '@scope', value: scope });
        }

        query.query += ' ORDER BY c.trainingDate DESC';

        const { resources } = await container.items.query(query).fetchAll();

        return reply.code(200).send({ models: resources });
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'ml_api.list_models',
        });
        return reply.code(500).send({
          error: 'Failed to list models',
          message: (error as Error).message,
        });
      }
    }
  );

  server.get(
    '/api/v1/ml/models/:modelId',
    {
      schema: {
        description: 'Get model metadata',
        tags: ['ml', 'models'],
        params: {
          type: 'object',
          properties: {
            modelId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { modelId: string } }>, reply: FastifyReply) => {
      try {
        const { modelId } = request.params;

        const model = await modelService.getModelMetadata('risk_scoring'); // Would get by ID

        if (!model) {
          return reply.code(404).send({
            error: 'Model not found',
          });
        }

        return reply.code(200).send(model);
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'ml_api.get_model',
          modelId: request.params.modelId,
        });
        return reply.code(500).send({
          error: 'Failed to get model',
          message: (error as Error).message,
        });
      }
    }
  );

  // ============================================================================
  // Training Endpoints
  // ============================================================================

  server.post<{ Body: TrainingJobOptions & { tenantId: string } }>(
    '/api/v1/ml/training/schedule',
    {
      schema: {
        description: 'Schedule a training job',
        tags: ['ml', 'training'],
        body: {
          type: 'object',
          required: ['modelType', 'tenantId'],
          properties: {
            modelType: { type: 'string' },
            tenantId: { type: 'string' },
            scope: { type: 'string' },
            industryId: { type: 'string' },
            useSyntheticData: { type: 'boolean' },
            syntheticDataRatio: { type: 'number' },
            parentModelId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: TrainingJobOptions & { tenantId: string } }>, reply: FastifyReply) => {
      try {
        const { tenantId, ...options } = request.body;

        const job = await trainingService.scheduleTraining(tenantId, options);

        return reply.code(200).send(job);
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'ml_api.schedule_training',
        });
        return reply.code(500).send({
          error: 'Failed to schedule training',
          message: (error as Error).message,
        });
      }
    }
  );

  server.get(
    '/api/v1/ml/training/jobs/:jobId',
    {
      schema: {
        description: 'Get training job status',
        tags: ['ml', 'training'],
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { jobId: string }; Querystring: { tenantId: string } }>, reply: FastifyReply) => {
      try {
        const { jobId } = request.params;
        const { tenantId } = request.query;

        if (!tenantId) {
          return reply.code(400).send({
            error: 'tenantId is required',
          });
        }

        const job = await trainingService.getTrainingStatus(jobId, tenantId);

        return reply.code(200).send(job);
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'ml_api.get_training_status',
          jobId: request.params.jobId,
        });
        return reply.code(500).send({
          error: 'Failed to get training status',
          message: (error as Error).message,
        });
      }
    }
  );

  // ============================================================================
  // Evaluation Endpoints
  // ============================================================================

  server.get(
    '/api/v1/ml/evaluation/metrics/:modelId',
    {
      schema: {
        description: 'Get model evaluation metrics',
        tags: ['ml', 'evaluation'],
        params: {
          type: 'object',
          properties: {
            modelId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { modelId: string } }>, reply: FastifyReply) => {
      try {
        const { modelId } = request.params;

        // Get recent predictions for evaluation
        // In production, query from storage
        const predictions: Array<{ prediction: number; actual: number; timestamp: Date }> = [];

        const metrics = await evaluationService.evaluateModel(
          modelId,
          predictions,
          'risk_scoring' // Would get from model metadata
        );

        return reply.code(200).send(metrics);
      } catch (error) {
        monitoring.trackException(error as Error, {
          operation: 'ml_api.get_metrics',
          modelId: request.params.modelId,
        });
        return reply.code(500).send({
          error: 'Failed to get metrics',
          message: (error as Error).message,
        });
      }
    }
  );
}

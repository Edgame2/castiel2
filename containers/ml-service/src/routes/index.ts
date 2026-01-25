/**
 * Route Registration
 * ML Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { MLModelService } from '../services/MLModelService';
import { FeatureService, FeaturePurpose } from '../services/FeatureService';
import { TrainingService } from '../services/TrainingService';
import { PredictionService } from '../services/PredictionService';
import { MultiModalService } from '../services/MultiModalService';
import { ModelMonitoringService } from '../services/ModelMonitoringService';
import { selectRiskScoringModel, selectWinProbabilityModel } from '../services/ModelSelectionService';
import { AzureMLClient } from '../clients/AzureMLClient';
import {
  CreateMLModelInput,
  UpdateMLModelInput,
  CreateTrainingJobInput,
  CreatePredictionInput,
  ModelType,
  ModelStatus,
  TrainingJobStatus,
} from '../types/ml.types';
import {
  CreateMultiModalJobInput,
  UpdateMultiModalJobInput,
  ModalType,
  ProcessingStatus,
} from '../types/multimodal.types';
import { trace } from '@opentelemetry/api';
import { mlPredictionsTotal, mlPredictionDurationSeconds } from '../metrics';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const modelService = new MLModelService();
  const featureService = new FeatureService(app);
  const trainingService = new TrainingService(modelService);
  const azureMlClient = new AzureMLClient(config.azure_ml || {});
  const predictionService = new PredictionService(modelService, featureService, azureMlClient, app);
  const multiModalService = new MultiModalService();
  const modelMonitoringService = new ModelMonitoringService();

  // ===== MODEL ROUTES =====

  /**
   * Create ML model
   * POST /api/v1/ml/models
   */
  app.post<{ Body: Omit<CreateMLModelInput, 'tenantId' | 'userId'> }>(
    '/api/v1/ml/models',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new ML model',
        tags: ['Models'],
        body: {
          type: 'object',
          required: ['name', 'type', 'features'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['classification', 'regression', 'clustering', 'recommendation', 'forecasting', 'anomaly_detection'] },
            algorithm: { type: 'string' },
            features: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
            hyperparameters: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'ML model created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateMLModelInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
      };

      const model = await modelService.create(input);
      reply.code(201).send(model);
    }
  );

  /**
   * Get model by ID
   * GET /api/v1/ml/models/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/ml/models/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get ML model by ID',
        tags: ['Models'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'ML model details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const model = await modelService.getById(request.params.id, tenantId);
      reply.send(model);
    }
  );

  /**
   * Get model card (Plan §11.9, §946): purpose, input, output, limitations
   * GET /api/v1/ml/models/:id/card
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/ml/models/:id/card',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Model card (purpose, input, output, limitations). Plan §11.9, §946.',
        tags: ['Models'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Model card',
            properties: {
              modelId: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              version: { type: 'number' },
              purpose: { type: 'string' },
              input: { type: 'array', items: { type: 'string' } },
              output: { type: 'string' },
              limitations: { type: 'array', items: { type: 'string' } },
            },
          },
          404: { description: 'Model not found' },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const card = await modelService.getModelCard(request.params.id, tenantId);
      reply.send(card);
    }
  );

  /**
   * Update model
   * PUT /api/v1/ml/models/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateMLModelInput }>(
    '/api/v1/ml/models/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update ML model',
        tags: ['Models'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'training', 'evaluating', 'ready', 'deployed', 'archived', 'failed'] },
            metrics: { type: 'object' },
            modelPath: { type: 'string' },
            limitations: { type: 'array', items: { type: 'string' }, description: 'Model card limitations (Plan §946)' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'ML model updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const model = await modelService.update(request.params.id, tenantId, request.body);
      reply.send(model);
    }
  );

  /**
   * Deploy model
   * POST /api/v1/ml/models/:id/deploy
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/ml/models/:id/deploy',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Deploy ML model',
        tags: ['Models'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Model deployed successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const model = await modelService.deploy(request.params.id, tenantId);
      reply.send(model);
    }
  );

  /**
   * Delete model
   * DELETE /api/v1/ml/models/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/ml/models/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete ML model',
        tags: ['Models'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'ML model deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await modelService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List models
   * GET /api/v1/ml/models
   */
  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/ml/models',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List ML models',
        tags: ['Models'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['classification', 'regression', 'clustering', 'recommendation', 'forecasting', 'anomaly_detection'] },
            status: { type: 'string', enum: ['draft', 'training', 'evaluating', 'ready', 'deployed', 'archived', 'failed'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of ML models',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await modelService.list(tenantId, {
        type: request.query.type as any,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== FEATURE ROUTES =====

  /**
   * Create feature
   * POST /api/v1/ml/features
   */
  app.post<{
    Body: {
      name: string;
      description?: string;
      type: 'numeric' | 'categorical' | 'text' | 'datetime' | 'boolean';
      source?: string;
      transformation?: string;
      statistics?: any;
    };
  }>(
    '/api/v1/ml/features',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new feature',
        tags: ['Features'],
        body: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['numeric', 'categorical', 'text', 'datetime', 'boolean'] },
            source: { type: 'string' },
            transformation: { type: 'string' },
            statistics: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Feature created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const feature = await featureService.create(tenantId, userId, request.body);
      reply.code(201).send(feature);
    }
  );

  /**
   * Get feature by ID
   * GET /api/v1/ml/features/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/ml/features/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get feature by ID',
        tags: ['Features'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Feature details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const feature = await featureService.getById(request.params.id, tenantId);
      reply.send(feature);
    }
  );

  /**
   * Update feature
   * PUT /api/v1/ml/features/:id
   */
  app.put<{ Params: { id: string }; Body: Partial<{ name: string; description: string; type: string; source: string; transformation: string; statistics: any }> }>(
    '/api/v1/ml/features/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update feature',
        tags: ['Features'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string' },
            source: { type: 'string' },
            transformation: { type: 'string' },
            statistics: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Feature updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const feature = await featureService.update(request.params.id, tenantId, request.body);
      reply.send(feature);
    }
  );

  /**
   * Delete feature
   * DELETE /api/v1/ml/features/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/ml/features/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete feature',
        tags: ['Features'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Feature deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await featureService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List features
   * GET /api/v1/ml/features
   */
  app.get<{
    Querystring: {
      type?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/ml/features',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List features',
        tags: ['Features'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['numeric', 'categorical', 'text', 'datetime', 'boolean'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of features',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await featureService.list(tenantId, {
        type: request.query.type,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Build feature vector for an opportunity (BI_SALES_RISK_FEATURE_PIPELINE_SPEC, FIRST_STEPS §6).
   * POST /api/v1/ml/features/build
   */
  app.post<{ Body: { opportunityId: string; purpose: FeaturePurpose } }>(
    '/api/v1/ml/features/build',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Build feature vector for an opportunity from shard-manager and risk-analytics. Purpose: risk-scoring | win-probability | lstm | anomaly | forecasting.',
        tags: ['Features'],
        body: {
          type: 'object',
          required: ['opportunityId', 'purpose'],
          properties: {
            opportunityId: { type: 'string' },
            purpose: { type: 'string', enum: ['risk-scoring', 'win-probability', 'lstm', 'anomaly', 'forecasting'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: { features: { type: 'object', additionalProperties: { type: 'number' } } },
          },
          404: { description: 'Opportunity not found' },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { opportunityId, purpose } = request.body;
      const vec = await featureService.buildVectorForOpportunity(tenantId, opportunityId, purpose);
      if (vec == null) return reply.status(404).send({ error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' } });
      return reply.send({ features: vec });
    }
  );

  // ===== TRAINING JOB ROUTES =====

  /**
   * Create training job
   * POST /api/v1/ml/training-jobs
   */
  app.post<{ Body: Omit<CreateTrainingJobInput, 'tenantId' | 'userId'> }>(
    '/api/v1/ml/training-jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new training job',
        tags: ['Training'],
        body: {
          type: 'object',
          required: ['name', 'modelType', 'algorithm', 'features', 'hyperparameters'],
          properties: {
            modelId: { type: 'string', format: 'uuid' },
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            modelType: { type: 'string', enum: ['classification', 'regression', 'clustering', 'recommendation', 'forecasting', 'anomaly_detection'] },
            algorithm: { type: 'string' },
            features: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
            hyperparameters: { type: 'object' },
            trainingDataPath: { type: 'string' },
            validationDataPath: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Training job created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateTrainingJobInput = {
        ...request.body,
        tenantId,
        userId,
        modelType: request.body.modelType as any,
      };

      const job = await trainingService.create(input);
      reply.code(201).send(job);
    }
  );

  /**
   * Get training job by ID
   * GET /api/v1/ml/training-jobs/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/ml/training-jobs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get training job by ID',
        tags: ['Training'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Training job details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await trainingService.getById(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * Update training job status
   * PUT /api/v1/ml/training-jobs/:id/status
   */
  app.put<{
    Params: { id: string };
    Body: {
      status: string;
      progress?: number;
      metrics?: any;
      error?: string;
    };
  }>(
    '/api/v1/ml/training-jobs/:id/status',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update training job status',
        tags: ['Training'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
            progress: { type: 'number', minimum: 0, maximum: 100 },
            metrics: { type: 'object' },
            error: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Training job status updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await trainingService.updateStatus(request.params.id, tenantId, {
        status: request.body.status as any,
        progress: request.body.progress,
        metrics: request.body.metrics,
        error: request.body.error,
      });
      reply.send(job);
    }
  );

  /**
   * Cancel training job
   * POST /api/v1/ml/training-jobs/:id/cancel
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/ml/training-jobs/:id/cancel',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Cancel training job',
        tags: ['Training'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Training job cancelled successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await trainingService.cancel(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * List training jobs
   * GET /api/v1/ml/training-jobs
   */
  app.get<{
    Querystring: {
      modelId?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/ml/training-jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List training jobs',
        tags: ['Training'],
        querystring: {
          type: 'object',
          properties: {
            modelId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of training jobs',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await trainingService.list(tenantId, {
        modelId: request.query.modelId,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== PREDICTION ROUTES =====

  /**
   * Create prediction
   * POST /api/v1/ml/models/:id/predict
   */
  app.post<{
    Params: { id: string };
    Body: Omit<CreatePredictionInput, 'tenantId' | 'modelId'>;
  }>(
    '/api/v1/ml/models/:id/predict',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Make prediction using ML model',
        tags: ['Predictions'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['input'],
          properties: {
            modelVersion: { type: 'number' },
            input: { type: 'object', additionalProperties: true },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Prediction created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const input: CreatePredictionInput = {
        tenantId,
        modelId: request.params.id,
        ...request.body,
      };

      const prediction = await predictionService.predict(input);
      reply.code(201).send(prediction);
    }
  );

  /**
   * Get prediction by ID
   * GET /api/v1/ml/predictions/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/ml/predictions/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get prediction by ID',
        tags: ['Predictions'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Prediction details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const prediction = await predictionService.getById(request.params.id, tenantId);
      reply.send(prediction);
    }
  );

  /**
   * List predictions
   * GET /api/v1/ml/predictions
   */
  app.get<{
    Querystring: {
      modelId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/ml/predictions',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List predictions',
        tags: ['Predictions'],
        querystring: {
          type: 'object',
          properties: {
            modelId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of predictions',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await predictionService.list(tenantId, {
        modelId: request.query.modelId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Risk-scoring prediction (MISSING_FEATURES 4.2)
   * POST /api/v1/ml/risk-scoring/predict
   */
  app.post<{
    Body: { opportunityId: string; modelId?: string; features?: Record<string, unknown> };
  }>(
    '/api/v1/ml/risk-scoring/predict',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Predict risk score for an opportunity; uses deployed model when available, else feature-based heuristic.',
        tags: ['Predictions'],
        body: {
          type: 'object',
          required: ['opportunityId'],
          properties: {
            opportunityId: { type: 'string' },
            modelId: { type: 'string' },
            features: { type: 'object', additionalProperties: true },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              riskScore: { type: 'number', minimum: 0, maximum: 1 },
              confidence: { type: 'number' },
              modelId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const body = {
        opportunityId: request.body.opportunityId,
        modelId: request.body.modelId,
        features: request.body.features || {},
      };
      const end = mlPredictionDurationSeconds.startTimer();
      let out: { modelId?: string } | undefined = undefined;
      try {
        out = await predictionService.predictRiskScore(tenantId, body);
        const model = out.modelId || 'risk-scoring';
        mlPredictionsTotal.inc({ model });
        trace.getTracer('ml-service').startSpan('ml.prediction', {
          attributes: { model, opportunityId: body.opportunityId },
        }).end();
        reply.send(out);
      } finally {
        end({ model: out?.modelId || 'risk-scoring' });
      }
    }
  );

  /**
   * Win-probability prediction (BI_SALES_RISK Plan §5.4, §5.7)
   * POST /api/v1/ml/win-probability/predict
   */
  app.post<{ Body: { opportunityId: string } }>(
    '/api/v1/ml/win-probability/predict',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Predict win probability for an opportunity; uses Azure ML win-probability-model when configured, else heuristic from features.',
        tags: ['Predictions'],
        body: {
          type: 'object',
          required: ['opportunityId'],
          properties: { opportunityId: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: { probability: { type: 'number', minimum: 0, maximum: 1 } },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const out = await predictionService.predictWinProbability(tenantId, request.body.opportunityId);
      reply.send(out);
    }
  );

  /**
   * Win-probability explain (Plan §905, §11.2). Top drivers for win-probability.
   * POST /api/v1/ml/win-probability/explain
   */
  app.post<{ Body: { opportunityId: string } }>(
    '/api/v1/ml/win-probability/explain',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Top drivers for win-probability. Phase 1: top features by magnitude from buildVector; Phase 2: tree importance or SHAP.',
        tags: ['Predictions'],
        body: {
          type: 'object',
          required: ['opportunityId'],
          properties: { opportunityId: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              topDrivers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    feature: { type: 'string' },
                    contribution: { type: 'number' },
                    direction: { type: 'string', enum: ['increases', 'decreases'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const end = mlPredictionDurationSeconds.startTimer({ model: 'win-probability-explain' });
      try {
        const out = await predictionService.getWinProbabilityExplain(tenantId, request.body.opportunityId);
        mlPredictionsTotal.inc({ model: 'win-probability-explain' });
        reply.send(out);
      } finally {
        end();
      }
    }
  );

  /**
   * Anomaly prediction (Plan §5.5). buildVector('anomaly') → Azure ML anomaly endpoint.
   * POST /api/v1/ml/anomaly/predict
   */
  app.post<{ Body: { opportunityId: string } }>(
    '/api/v1/ml/anomaly/predict',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Anomaly detection (Isolation Forest) for an opportunity. Requires azure_ml.endpoints.anomaly.',
        tags: ['Predictions'],
        body: {
          type: 'object',
          required: ['opportunityId'],
          properties: { opportunityId: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              isAnomaly: { type: 'number', description: '-1=anomaly, 1=normal (sklearn)' },
              anomalyScore: { type: 'number', description: 'Higher = more anomalous' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const end = mlPredictionDurationSeconds.startTimer({ model: 'anomaly' });
      try {
        const out = await predictionService.predictAnomaly(tenantId, request.body.opportunityId);
        mlPredictionsTotal.inc({ model: 'anomaly' });
        reply.send(out);
      } finally {
        end();
      }
    }
  );

  /**
   * LSTM risk-trajectory (Plan §5.5, §875). Body: { sequence: number[][] } from risk_snapshots [riskScore, 0, 0] per row.
   * POST /api/v1/ml/risk-trajectory/predict
   */
  app.post<{ Body: { sequence: number[][]; opportunityId?: string } }>(
    '/api/v1/ml/risk-trajectory/predict',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: '30/60/90-day risk from LSTM. sequence: [[risk_score, activity_count_30d, days_since_last_activity], ...] (pad to 30). Requires azure_ml.endpoints.risk_trajectory_lstm.',
        tags: ['Predictions'],
        body: {
          type: 'object',
          required: ['sequence'],
          properties: {
            sequence: { type: 'array', items: { type: 'array', items: { type: 'number' } } },
            opportunityId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              risk_30: { type: 'number' }, risk_60: { type: 'number' }, risk_90: { type: 'number' }, confidence: { type: 'number' },
            },
          },
          503: { type: 'object', properties: { error: { type: 'object' } } },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const end = mlPredictionDurationSeconds.startTimer({ model: 'risk_trajectory_lstm' });
      try {
        const out = await predictionService.predictLstmTrajectory(request.body.sequence);
        mlPredictionsTotal.inc({ model: 'risk_trajectory_lstm' });
        reply.send(out);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('not configured') || msg.includes('endpoint')) {
          return reply.code(503).send({ error: { code: 'LSTM_ENDPOINT_NOT_CONFIGURED', message: msg } });
        }
        throw e;
      } finally {
        end();
      }
    }
  );

  /**
   * Model selection: risk-scoring (Plan §5.4, §874). Global vs industry by endpoint; stub. Full: >3000 examples, >5% improvement.
   * GET /api/v1/ml/model-selection/risk-scoring
   */
  app.get<{ Querystring: { industryId?: string } }>(
    '/api/v1/ml/model-selection/risk-scoring',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Select risk-scoring model: global or industry. Stub: industry when industryId and risk_scoring_industry endpoint; else global.',
        tags: ['Models'],
        querystring: { industryId: { type: 'string' } },
        response: {
          200: {
            type: 'object',
            properties: { modelId: { type: 'string' }, confidence: { type: 'number' } },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const industryId = request.query.industryId;
      const out = selectRiskScoringModel(tenantId, industryId);
      return reply.send(out);
    }
  );

  /**
   * Model selection: win-probability (Plan §5.4, §874). Stub: win-probability-model when configured.
   * GET /api/v1/ml/model-selection/win-probability
   */
  app.get(
    '/api/v1/ml/model-selection/win-probability',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Select win-probability model. Stub: win-probability-model or win_probability when endpoint configured.',
        tags: ['Models'],
        response: {
          200: {
            type: 'object',
            properties: { modelId: { type: 'string' }, confidence: { type: 'number' } },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const out = selectWinProbabilityModel(tenantId);
      return reply.send(out);
    }
  );

  /**
   * Forecast prediction (MISSING_FEATURES 5.1)
   * POST /api/v1/ml/forecast/predict
   */
  app.post<{
    Body: {
      opportunityId: string;
      tenantId?: string;
      level?: string;
      modelId?: string;
      features?: { opportunityValue?: number; probability?: number; stage?: string; daysInStage?: number };
    };
  }>(
    '/api/v1/ml/forecast/predict',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Revenue forecast with P10/P50/P90 and best/base/worst scenarios. Uses deployed model when available.',
        tags: ['Predictions'],
        body: {
          type: 'object',
          required: ['opportunityId'],
          properties: {
            opportunityId: { type: 'string' },
            tenantId: { type: 'string' },
            level: { type: 'string' },
            modelId: { type: 'string' },
            features: {
              type: 'object',
              properties: {
                opportunityValue: { type: 'number' },
                probability: { type: 'number' },
                stage: { type: 'string' },
                daysInStage: { type: 'number' },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              pointForecast: { type: 'number' },
              uncertainty: {
                type: 'object',
                properties: { p10: { type: 'number' }, p50: { type: 'number' }, p90: { type: 'number' } },
              },
              scenarios: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { scenario: { type: 'string' }, probability: { type: 'number' }, forecast: { type: 'number' } },
                },
              },
              confidence: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const body = {
        opportunityId: request.body.opportunityId,
        level: request.body.level,
        modelId: request.body.modelId,
        features: request.body.features || {},
      };
      const end = mlPredictionDurationSeconds.startTimer();
      let out: unknown = undefined;
      try {
        out = await predictionService.predictForecast(tenantId, body);
        const model = (out as { modelId?: string })?.modelId ?? request.body.modelId ?? 'forecast';
        mlPredictionsTotal.inc({ model });
        trace.getTracer('ml-service').startSpan('ml.prediction', {
          attributes: { model, opportunityId: body.opportunityId },
        }).end();
        reply.send(out);
      } finally {
        end({ model: (out as { modelId?: string })?.modelId ?? request.body.modelId ?? 'forecast' });
      }
    }
  );

  /**
   * Prophet revenue-forecast period (Plan §877). Body: { history: [[ds,y],...], periods? }.
   * POST /api/v1/ml/forecast/period
   */
  app.post<{ Body: { history: Array<[string, number]>; periods?: number } }>(
    '/api/v1/ml/forecast/period',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Prophet revenue-forecast for one period. Body: history [[date, value], ...] (chronological), periods (default 1). Requires azure_ml.endpoints.revenue_forecasting. 503 when endpoint not configured.',
        tags: ['Predictions'],
        body: {
          type: 'object',
          required: ['history'],
          properties: {
            history: {
              type: 'array',
              items: { type: 'array' },
              description: 'Chronological [dateString, value] pairs, e.g. [["2024-01-01", 100], ...]',
            },
            periods: { type: 'number', minimum: 1, maximum: 365, default: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              p10: { type: 'number' },
              p50: { type: 'number' },
              p90: { type: 'number' },
              modelId: { type: 'string' },
            },
          },
          503: { type: 'object', properties: { error: { type: 'object' } } },
        },
      },
    },
    async (request, reply) => {
      const { history, periods } = request.body;
      try {
        const out = await predictionService.predictRevenueForecastPeriod(history, periods);
        reply.send(out);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('not configured') || msg.includes('endpoint')) {
          return reply.code(503).send({ error: { code: 'REVENUE_FORECAST_ENDPOINT_NOT_CONFIGURED', message: msg } });
        }
        throw e;
      }
    }
  );

  /**
   * Model monitoring run (Plan §940, §9.3). Internal: called by risk-analytics BatchJobWorker.
   * POST /api/v1/ml/model-monitoring/run
   */
  app.post<{ Body: { tenantIds?: string[] } }>(
    '/api/v1/ml/model-monitoring/run',
    {
      schema: {
        description: 'Run model monitoring (drift PSI + performance Brier/MAE). Internal; called by risk-analytics BatchJobWorker. Stub until drift/performance wired.',
        tags: ['Predictions'],
        body: {
          type: 'object',
          properties: { tenantIds: { type: 'array', items: { type: 'string' } } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              driftChecked: { type: 'number' },
              performanceChecked: { type: 'number' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const tenantIds = _request.body?.tenantIds ?? [];
      const out = await modelMonitoringService.runForTenants(tenantIds);
      reply.send(out);
    }
  );

  // ===== MULTI-MODAL JOB ROUTES (from multi-modal-service) =====

  /**
   * Create multi-modal job
   * POST /api/v1/multimodal/jobs
   */
  app.post<{ Body: Omit<CreateMultiModalJobInput, 'tenantId' | 'userId'> }>(
    '/api/v1/multimodal/jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new multi-modal processing job',
        tags: ['Multi-Modal'],
        body: {
          type: 'object',
          required: ['type', 'input'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['image', 'diagram', 'audio', 'video', 'whiteboard', 'custom'] },
            input: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                data: { type: 'string' },
                mimeType: { type: 'string' },
                metadata: { type: 'object' },
              },
            },
            options: {
              type: 'object',
              properties: {
                generateCode: { type: 'boolean' },
                extractText: { type: 'boolean' },
                transcribe: { type: 'boolean' },
                analyze: { type: 'boolean' },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Multi-modal job created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateMultiModalJobInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
      };

      const job = await multiModalService.create(input);
      reply.code(201).send(job);
    }
  );

  /**
   * Get multi-modal job by ID
   * GET /api/v1/multimodal/jobs/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/multimodal/jobs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get multi-modal job by ID',
        tags: ['Multi-Modal'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Multi-modal job details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await multiModalService.getById(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * Update multi-modal job
   * PUT /api/v1/multimodal/jobs/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateMultiModalJobInput }>(
    '/api/v1/multimodal/jobs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update multi-modal job',
        tags: ['Multi-Modal'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] },
            output: { type: 'object' },
            analysis: { type: 'object' },
            error: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Multi-modal job updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await multiModalService.updateStatus(
        request.params.id,
        tenantId,
        request.body.status || ProcessingStatus.PENDING,
        {
          output: request.body.output,
          analysis: request.body.analysis,
          error: request.body.error,
        }
      );
      reply.send(job);
    }
  );

  /**
   * Cancel multi-modal job
   * POST /api/v1/multimodal/jobs/:id/cancel
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/multimodal/jobs/:id/cancel',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Cancel multi-modal job',
        tags: ['Multi-Modal'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Multi-modal job cancelled successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await multiModalService.cancel(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * List multi-modal jobs
   * GET /api/v1/multimodal/jobs
   */
  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/multimodal/jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List multi-modal jobs',
        tags: ['Multi-Modal'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['image', 'diagram', 'audio', 'video', 'whiteboard', 'custom'] },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of multi-modal jobs',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await multiModalService.list(tenantId, {
        type: request.query.type as any,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );
}

/**
 * Route Registration
 * ML Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { MLModelService } from '../services/MLModelService';
import { FeatureService } from '../services/FeatureService';
import { TrainingService } from '../services/TrainingService';
import { PredictionService } from '../services/PredictionService';
import {
  CreateMLModelInput,
  UpdateMLModelInput,
  CreateTrainingJobInput,
  CreatePredictionInput,
  ModelType,
  ModelStatus,
  TrainingJobStatus,
} from '../types/ml.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const modelService = new MLModelService();
  const featureService = new FeatureService();
  const trainingService = new TrainingService(modelService);
  const predictionService = new PredictionService(modelService);

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
}

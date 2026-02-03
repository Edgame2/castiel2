/**
 * Route Registration
 * ML Service routes
 */

import { randomUUID } from 'crypto';
import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { MLModelService } from '../services/MLModelService';
import { FeatureService, FeaturePurpose } from '../services/FeatureService';
import { FeatureStoreService } from '../services/FeatureStoreService';
import { FeatureVersionManager } from '../services/FeatureVersionManager';
import { FeatureQualityMonitor } from '../services/FeatureQualityMonitor';
import { TrainingService } from '../services/TrainingService';
import { PredictionService } from '../services/PredictionService';
import { MultiModalService } from '../services/MultiModalService';
import { ModelMonitoringService } from '../services/ModelMonitoringService';
import { EvaluationService } from '../services/EvaluationService';
import { ContinuousLearningService } from '../services/ContinuousLearningService';
import { ReactivationPredictionService } from '../services/ReactivationPredictionService';
import { selectRiskScoringModel, selectWinProbabilityModel } from '../services/ModelSelectionService';
import { AzureMLClient } from '../clients/AzureMLClient';
import {
  CreateMLModelInput,
  UpdateMLModelInput,
  CreateTrainingJobInput,
  CreatePredictionInput,
  type Feature,
} from '../types/ml.types';
import {
  CreateMultiModalJobInput,
  UpdateMultiModalJobInput,
  ProcessingStatus,
} from '../types/multimodal.types';
import { trace } from '@opentelemetry/api';
import { getContainer } from '@coder/shared/database';
import { mlPredictionsTotal, mlPredictionDurationSeconds } from '../metrics';
import { publishMlModelDeployed, publishMlPredictionFailed } from '../events/publishers/MLServiceEventPublisher';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const modelService = new MLModelService();
  const featureService = new FeatureService(app);
  const featureStoreService = new FeatureStoreService(featureService);
  const featureVersionManager = new FeatureVersionManager();
  const featureQualityMonitor = new FeatureQualityMonitor();
  const trainingService = new TrainingService(modelService);
  const azureMlClient = new AzureMLClient(config.azure_ml || {});
  const predictionService = new PredictionService(modelService, featureService, azureMlClient, app);
  const multiModalService = new MultiModalService();
  const modelMonitoringService = new ModelMonitoringService();
  const evaluationService = new EvaluationService();
  const continuousLearningService = new ContinuousLearningService();
  const reactivationPredictionService = new ReactivationPredictionService(featureStoreService);

  // ===== MODEL ROUTES =====

  /**
   * Create ML model
   * POST /api/v1/ml/models
   */
  app.post<{ Body: Omit<CreateMLModelInput, 'tenantId' | 'userId'> }>(
    '/api/v1/ml/models',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
   * Model/endpoint health (W4 Layer 3). GET /api/v1/ml/models/health
   * Returns Azure ML endpoint status and latency per modelId.
   */
  app.get<Record<string, never>>(
    '/api/v1/ml/models/health',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Azure ML endpoint health (status, latency). W4 Layer 3.',
        tags: ['Models', 'Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              endpoints: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'unreachable'] },
                    latencyMs: { type: 'number' },
                  },
                },
              },
              overall: { type: 'string', enum: ['ok', 'degraded', 'not_configured'] },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const ep = config.azure_ml?.endpoints ?? {};
      const entries = Object.entries(ep).filter(([, u]) => typeof u === 'string' && u.length > 0) as [string, string][];
      const endpoints: Record<string, { status: 'ok' | 'unreachable'; latencyMs?: number }> = {};
      for (const [modelId, url] of entries) {
        const t0 = Date.now();
        try {
          await globalThis.fetch(url, { method: 'GET', signal: AbortSignal.timeout(2000) });
          endpoints[modelId] = { status: 'ok', latencyMs: Date.now() - t0 };
        } catch {
          endpoints[modelId] = { status: 'unreachable', latencyMs: Date.now() - t0 };
        }
      }
      const allOk = entries.length === 0 || Object.values(endpoints).every((e) => e.status === 'ok');
      return reply.send({
        endpoints,
        overall: entries.length === 0 ? 'not_configured' : allOk ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * List ML endpoints (Super Admin §4.2). GET /api/v1/ml/endpoints
   * Returns configured Azure ML endpoints with health status and latency. URLs from config only.
   */
  app.get<Record<string, never>>(
    '/api/v1/ml/endpoints',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'List ML endpoints with health status. Super Admin §4.2.',
        tags: ['Models', 'Endpoints'],
        response: {
          200: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    url: { type: 'string' },
                    status: { type: 'string', enum: ['online', 'offline', 'degraded'] },
                    latencyMs: { type: 'number' },
                    models: { type: 'array', items: { type: 'string' } },
                    lastHealthCheck: { type: 'string' },
                  },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const ep = config.azure_ml?.endpoints ?? {};
      const entries = Object.entries(ep).filter(([, u]) => typeof u === 'string' && u.length > 0) as [string, string][];
      const now = new Date().toISOString();
      const items: Array<{
        id: string;
        name: string;
        url: string;
        status: 'online' | 'offline' | 'degraded';
        latencyMs: number;
        models: string[];
        lastHealthCheck: string;
      }> = [];
      for (const [modelId, url] of entries) {
        const t0 = Date.now();
        let status: 'online' | 'offline' | 'degraded' = 'offline';
        try {
          await globalThis.fetch(url, { method: 'GET', signal: AbortSignal.timeout(2000) });
          const latencyMs = Date.now() - t0;
          status = latencyMs > 1500 ? 'degraded' : 'online';
          items.push({
            id: modelId,
            name: modelId,
            url,
            status,
            latencyMs,
            models: [modelId],
            lastHealthCheck: now,
          });
        } catch {
          items.push({
            id: modelId,
            name: modelId,
            url,
            status: 'offline',
            latencyMs: Date.now() - t0,
            models: [modelId],
            lastHealthCheck: now,
          });
        }
      }
      return reply.send({ items, timestamp: now });
    }
  );

  /**
   * List ML alert rules (Super Admin §4.4.2). GET /api/v1/ml/monitoring/alerts
   * Returns tenant-scoped alert rules from Cosmos (partitionKey: tenantId).
   */
  app.get<Record<string, never>>(
    '/api/v1/ml/monitoring/alerts',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'List ML monitoring alert rules. Super Admin §4.4.2.',
        tags: ['Models', 'Monitoring'],
        response: {
          200: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    enabled: { type: 'boolean' },
                    metric: { type: 'string' },
                    operator: { type: 'string' },
                    threshold: { type: 'number' },
                    duration: { type: 'number' },
                    modelIds: { type: 'array', items: { type: 'string' } },
                    severity: { type: 'string' },
                    throttleMinutes: { type: 'number' },
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
      const containerName = config.cosmos_db?.containers?.alert_rules ?? 'ml_alert_rules';
      const container = getContainer(containerName);
      const { resources } = await container.items
        .query(
          { query: 'SELECT * FROM c WHERE c.tenantId = @tenantId', parameters: [{ name: '@tenantId', value: tenantId }] },
          { partitionKey: tenantId }
        )
        .fetchAll();
      const items = (resources ?? []).map((r: Record<string, unknown>) => ({
        id: r.id,
        name: r.name,
        enabled: r.enabled,
        metric: r.metric,
        operator: r.operator,
        threshold: r.threshold,
        duration: r.duration,
        modelIds: r.modelIds,
        severity: r.severity,
        throttleMinutes: r.throttleMinutes,
      }));
      return reply.send({ items });
    }
  );

  /**
   * Create ML alert rule (Super Admin §4.4.2). POST /api/v1/ml/monitoring/alerts
   * Body: name, enabled?, metric, operator, threshold, duration?, modelIds?, severity?, throttleMinutes?, actions?
   */
  app.post<{
    Body: {
      name: string;
      enabled?: boolean;
      metric: string;
      operator: string;
      threshold: number;
      duration?: number;
      modelIds?: string[];
      severity?: string;
      throttleMinutes?: number;
      actions?: Array<{ type: string; config?: Record<string, unknown> }>;
    };
  }>(
    '/api/v1/ml/monitoring/alerts',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Create ML monitoring alert rule. Super Admin §4.4.2.',
        tags: ['Models', 'Monitoring'],
        body: {
          type: 'object',
          required: ['name', 'metric', 'operator', 'threshold'],
          properties: {
            name: { type: 'string' },
            enabled: { type: 'boolean' },
            metric: { type: 'string' },
            operator: { type: 'string' },
            threshold: { type: 'number' },
            duration: { type: 'number' },
            modelIds: { type: 'array', items: { type: 'string' } },
            severity: { type: 'string' },
            throttleMinutes: { type: 'number' },
            actions: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, config: { type: 'object' } } } },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              enabled: { type: 'boolean' },
              metric: { type: 'string' },
              operator: { type: 'string' },
              threshold: { type: 'number' },
              duration: { type: 'number' },
              modelIds: { type: 'array', items: { type: 'string' } },
              severity: { type: 'string' },
              throttleMinutes: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const body = request.body;
      const id = `alert_${tenantId}_${randomUUID()}`;
      const doc = {
        id,
        tenantId,
        name: body.name,
        enabled: body.enabled !== false,
        metric: body.metric,
        operator: body.operator,
        threshold: body.threshold,
        duration: body.duration ?? 0,
        modelIds: body.modelIds ?? [],
        severity: body.severity ?? 'medium',
        throttleMinutes: body.throttleMinutes ?? 60,
        actions: body.actions ?? [],
      };
      const containerName = config.cosmos_db?.containers?.alert_rules ?? 'ml_alert_rules';
      const container = getContainer(containerName);
      const { resource } = await container.items.create(doc, { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]);
      const created = resource as unknown as Record<string, unknown>;
      return reply.code(201).send({
        id: created.id,
        name: created.name,
        enabled: created.enabled,
        metric: created.metric,
        operator: created.operator,
        threshold: created.threshold,
        duration: created.duration,
        modelIds: created.modelIds,
        severity: created.severity,
        throttleMinutes: created.throttleMinutes,
      });
    }
  );

  /**
   * Update ML alert rule. PUT /api/v1/ml/monitoring/alerts/:id
   */
  app.put<{
    Params: { id: string };
    Body: Partial<{
      name: string;
      enabled: boolean;
      metric: string;
      operator: string;
      threshold: number;
      duration: number;
      modelIds: string[];
      severity: string;
      throttleMinutes: number;
      actions: Array<{ type: string; config?: Record<string, unknown> }>;
    }>;
  }>(
    '/api/v1/ml/monitoring/alerts/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Update ML monitoring alert rule. Super Admin §4.4.2.',
        tags: ['Models', 'Monitoring'],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: { type: 'object', properties: { name: { type: 'string' }, enabled: { type: 'boolean' }, metric: { type: 'string' }, operator: { type: 'string' }, threshold: { type: 'number' }, duration: { type: 'number' }, modelIds: { type: 'array', items: { type: 'string' } }, severity: { type: 'string' }, throttleMinutes: { type: 'number' }, actions: { type: 'array' } } },
        response: { 200: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, enabled: { type: 'boolean' }, metric: { type: 'string' }, operator: { type: 'string' }, threshold: { type: 'number' }, duration: { type: 'number' }, modelIds: { type: 'array' }, severity: { type: 'string' }, throttleMinutes: { type: 'number' } } } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params;
      const containerName = config.cosmos_db?.containers?.alert_rules ?? 'ml_alert_rules';
      const container = getContainer(containerName);
      let existing: Record<string, unknown>;
      try {
        const { resource } = await container.item(id, tenantId).read();
        if (!resource) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Alert rule not found' } });
        existing = resource as Record<string, unknown>;
      } catch (err: unknown) {
        const code = (err as { code?: number })?.code;
        if (code === 404) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Alert rule not found' } });
        throw err;
      }
      const body = request.body || {};
      const merged = {
        ...existing,
        ...body,
        id: existing.id as string,
        tenantId: existing.tenantId as string,
      };
      const { resource } = await container.item(id, tenantId).replace(merged as Record<string, unknown>);
      const updated = resource as Record<string, unknown>;
      return reply.send({
        id: updated.id,
        name: updated.name,
        enabled: updated.enabled,
        metric: updated.metric,
        operator: updated.operator,
        threshold: updated.threshold,
        duration: updated.duration,
        modelIds: updated.modelIds,
        severity: updated.severity,
        throttleMinutes: updated.throttleMinutes,
      });
    }
  );

  /**
   * Delete ML alert rule. DELETE /api/v1/ml/monitoring/alerts/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/ml/monitoring/alerts/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Delete ML monitoring alert rule. Super Admin §4.4.2.',
        tags: ['Models', 'Monitoring'],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 204: { type: 'null' }, 404: { type: 'object', properties: { error: { type: 'object' } } } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params;
      const containerName = config.cosmos_db?.containers?.alert_rules ?? 'ml_alert_rules';
      const container = getContainer(containerName);
      try {
        await container.item(id, tenantId).delete();
        return reply.code(204).send();
      } catch (err: unknown) {
        const code = (err as { code?: number })?.code;
        if (code === 404) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Alert rule not found' } });
        throw err;
      }
    }
  );

  /**
   * Get model by ID
   * GET /api/v1/ml/models/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/ml/models/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      await publishMlModelDeployed(tenantId, { modelId: model.id, version: model.version });
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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

  /** Layer 2: Extract features for one opportunity (cache, persist, version). GET /api/v1/ml/features/opportunity/:opportunityId */
  app.get<{
    Params: { opportunityId: string };
    Querystring: { purpose?: string; featureVersion?: string; persist?: string; useCache?: string };
  }>(
    '/api/v1/ml/features/opportunity/:opportunityId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: Extract features for opportunity (cache, persist, version).',
        tags: ['Features'],
        params: { type: 'object', properties: { opportunityId: { type: 'string' } } },
        querystring: {
          type: 'object',
          properties: {
            purpose: { type: 'string', enum: ['risk-scoring', 'win-probability', 'lstm', 'anomaly', 'forecasting'] },
            featureVersion: { type: 'string' },
            persist: { type: 'string', enum: ['true', 'false'] },
            useCache: { type: 'string', enum: ['true', 'false'] },
          },
        },
        response: { 200: { type: 'object', properties: { features: { type: 'object' }, fromCache: { type: 'boolean' }, snapshotId: { type: 'string' } } }, 404: {} },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const purpose = (request.query.purpose as FeaturePurpose) || 'risk-scoring';
      const opts = {
        featureVersion: request.query.featureVersion,
        persist: request.query.persist === 'true',
        useCache: request.query.useCache !== 'false',
      };
      try {
        const out = await featureStoreService.extract(tenantId, request.params.opportunityId, purpose, opts);
        return reply.send({ features: out.features, fromCache: out.fromCache, snapshotId: out.snapshotId });
      } catch (e: unknown) {
        if ((e as { name?: string }).name === 'NotFoundError') return reply.status(404).send({ error: 'Opportunity not found' });
        throw e;
      }
    }
  );

  /** Layer 2: Batch extract. POST /api/v1/ml/features/batch */
  app.post<{
    Body: { opportunityIds: string[]; purpose?: string; featureVersion?: string; persist?: boolean };
  }>(
    '/api/v1/ml/features/batch',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: Extract features for multiple opportunities.',
        tags: ['Features'],
        body: {
          type: 'object',
          required: ['opportunityIds'],
          properties: {
            opportunityIds: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 100 },
            purpose: { type: 'string', enum: ['risk-scoring', 'win-probability', 'lstm', 'anomaly', 'forecasting'] },
            featureVersion: { type: 'string' },
            persist: { type: 'boolean' },
          },
        },
        response: { 200: { type: 'object', description: 'Map of opportunityId to { features, snapshotId? }' } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { opportunityIds, purpose = 'risk-scoring', featureVersion, persist } = request.body;
      const purposeTyped = purpose as FeaturePurpose;
      const map = await featureStoreService.extractBatch(tenantId, opportunityIds, purposeTyped, { featureVersion, persist });
      const body: Record<string, { features: Record<string, number>; snapshotId?: string }> = {};
      map.forEach((v, k) => { body[k] = { features: v.features, snapshotId: v.snapshotId }; });
      return reply.send(body);
    }
  );

  /** Layer 2: Feature schema. GET /api/v1/ml/features/schema */
  app.get<{ Querystring: { purpose?: string } }>(
    '/api/v1/ml/features/schema',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: Feature schema (names and types).',
        tags: ['Features'],
        querystring: { type: 'object', properties: { purpose: { type: 'string', enum: ['risk-scoring', 'win-probability', 'lstm', 'anomaly', 'forecasting'] } } },
        response: { 200: { type: 'object', properties: { purpose: { type: 'string' }, version: { type: 'string' }, features: { type: 'array' }, updatedAt: { type: 'string' } } } },
      },
    },
    async (request, reply) => {
      const purpose = request.query.purpose as FeaturePurpose | undefined;
      const features = featureStoreService.getSchema(purpose);
      return reply.send({ purpose: purpose ?? undefined, version: 'v1', features, updatedAt: new Date().toISOString() });
    }
  );

  /** W7 Gap 1 – Layer 2: Risk catalog features (extractRiskCatalogFeatures). GET /api/v1/ml/features/risk-catalog */
  app.get<{ Querystring: { industry?: string; stage?: string } }>(
    '/api/v1/ml/features/risk-catalog',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'W7 Layer 2: Extract risk catalog features (categories, templates, industry/methodology risks).',
        tags: ['Features'],
        querystring: {
          type: 'object',
          properties: { industry: { type: 'string' }, stage: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tenantRiskCategories: { type: 'array', items: { type: 'string' } },
              categoryDefinitions: { type: 'object' },
              riskTemplates: { type: 'array' },
              industrySpecificRisks: { type: 'array', items: { type: 'string' } },
              methodologyRisks: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const features = await featureStoreService.extractRiskCatalogFeatures(
        tenantId,
        request.query.industry,
        request.query.stage
      );
      return reply.send(features);
    }
  );

  /** W8 Layer 2: Methodology features (extractMethodologyFeatures). GET /api/v1/ml/features/methodology */
  app.get<{ Querystring: { opportunityId: string } }>(
    '/api/v1/ml/features/methodology',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'W8 Layer 2: Extract methodology-aware features (stage compliance, duration, MEDDIC) for an opportunity.',
        tags: ['Features'],
        querystring: {
          type: 'object',
          required: ['opportunityId'],
          properties: { opportunityId: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              stageRequirementsMet: { type: 'number' },
              stageRequirementsMissing: { type: 'array', items: { type: 'string' } },
              stageExitCriteriaReady: { type: 'boolean' },
              daysInCurrentStage: { type: 'number' },
              expectedDaysInStage: { type: 'number' },
              stageDurationAnomaly: { type: 'boolean' },
              methodologyFieldsComplete: { type: 'number' },
              methodologyFieldsMissing: { type: 'array', items: { type: 'string' } },
              expectedActivitiesCompleted: { type: 'number' },
              unexpectedActivitiesCount: { type: 'number' },
              meddic: { type: 'object', nullable: true },
            },
          },
          404: { type: 'object', properties: { error: { type: 'object' } } },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { opportunityId } = request.query;
      const opportunity = await featureService.getOpportunityStructuredData(tenantId, opportunityId);
      if (!opportunity) {
        return reply.status(404).send({
          error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' },
        });
      }
      const features = await featureStoreService.extractMethodologyFeatures(tenantId, opportunity);
      return reply.send(features);
    }
  );

  /** W9 Layer 2: Dormant opportunity features (extractDormantOpportunityFeatures). GET /api/v1/ml/features/reactivation */
  app.get<{ Querystring: { opportunityId: string } }>(
    '/api/v1/ml/features/reactivation',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'W9 Layer 2: Extract dormant opportunity features (inactivity, activity trends, engagement, dormancy category).',
        tags: ['Features'],
        querystring: {
          type: 'object',
          required: ['opportunityId'],
          properties: { opportunityId: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              daysSinceLastActivity: { type: 'number' },
              daysSinceLastStageChange: { type: 'number' },
              activityCountLast7Days: { type: 'number' },
              activityCountLast30Days: { type: 'number' },
              activityCountLast90Days: { type: 'number' },
              dormancyCategory: { type: 'string', enum: ['recently_dormant', 'long_dormant', 'likely_lost'] },
              dormancyReason: { type: 'string', nullable: true },
            },
          },
          404: { type: 'object', properties: { error: { type: 'object' } } },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { opportunityId } = request.query;
      const features = await featureStoreService.extractDormantOpportunityFeatures(tenantId, opportunityId);
      if (!features) {
        return reply.status(404).send({
          error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' },
        });
      }
      return reply.send(features);
    }
  );

  /** W9 Layer 3: Reactivation prediction. GET /api/v1/ml/reactivation/predict */
  app.get<{ Querystring: { opportunityId: string } }>(
    '/api/v1/ml/reactivation/predict',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'W9 Layer 3: Predict reactivation probability and strategy (heuristic from dormant features).',
        tags: ['Predictions'],
        querystring: {
          type: 'object',
          required: ['opportunityId'],
          properties: { opportunityId: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              reactivationProbability: { type: 'number' },
              confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
              optimalReactivationWindow: { type: 'object' },
              recommendedApproach: { type: 'object' },
              keySuccessFactors: { type: 'array' },
              reactivationRisks: { type: 'array' },
            },
          },
          404: { type: 'object', properties: { error: { type: 'object' } } },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { opportunityId } = request.query;
      const prediction = await reactivationPredictionService.predictReactivation(tenantId, opportunityId);
      if (!prediction) {
        return reply.status(404).send({
          error: { code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' },
        });
      }
      return reply.send(prediction);
    }
  );

  /** Layer 2: Feature statistics. GET /api/v1/ml/features/statistics */
  app.get<{ Querystring: { purpose: string; version?: string; maxSamples?: number } }>(
    '/api/v1/ml/features/statistics',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: Per-feature statistics (mean, std, min, max, missingRate).',
        tags: ['Features'],
        querystring: {
          type: 'object',
          required: ['purpose'],
          properties: { purpose: { type: 'string', enum: ['risk-scoring', 'win-probability', 'lstm', 'anomaly', 'forecasting'] }, version: { type: 'string' }, maxSamples: { type: 'number' } },
        },
        response: { 200: { type: 'object', properties: { statistics: { type: 'array' } } } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const purpose = request.query.purpose as FeaturePurpose;
      const statistics = await featureQualityMonitor.computeStatistics(tenantId, purpose, request.query.version ?? 'v1', { maxSamples: request.query.maxSamples });
      return reply.send({ statistics });
    }
  );

  /** Layer 2: Export snapshots for training. POST /api/v1/ml/features/export */
  app.post<{
    Body: { purpose: string; startDate: string; endDate: string; featureVersion?: string; limit?: number };
  }>(
    '/api/v1/ml/features/export',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: Export feature snapshots for training.',
        tags: ['Features'],
        body: {
          type: 'object',
          required: ['purpose', 'startDate', 'endDate'],
          properties: {
            purpose: { type: 'string', enum: ['risk-scoring', 'win-probability', 'lstm', 'anomaly', 'forecasting'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            featureVersion: { type: 'string' },
            limit: { type: 'number' },
          },
        },
        response: { 200: { type: 'object', properties: { items: { type: 'array' }, continuationToken: { type: 'string' } } } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { purpose, startDate, endDate, featureVersion, limit } = request.body;
      const result = await featureStoreService.exportSnapshots(tenantId, { purpose: purpose as FeaturePurpose, startDate, endDate, featureVersion, limit });
      return reply.send(result);
    }
  );

  /** Layer 2: Get snapshot by id. GET /api/v1/ml/features/snapshots/:snapshotId */
  app.get<{ Params: { snapshotId: string } }>(
    '/api/v1/ml/features/snapshots/:snapshotId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: Get feature snapshot by id.',
        tags: ['Features'],
        params: { type: 'object', properties: { snapshotId: { type: 'string', format: 'uuid' } } },
        response: { 200: { type: 'object' }, 404: {} },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      try {
        const snapshot = await featureStoreService.getSnapshotById(request.params.snapshotId, tenantId);
        return reply.send(snapshot);
      } catch (e: unknown) {
        if ((e as { name?: string }).name === 'NotFoundError') return reply.status(404).send({ error: 'Snapshot not found' });
        throw e;
      }
    }
  );

  /** Layer 2: Resolve feature version. GET /api/v1/ml/features/versions/resolve */
  app.get<{ Querystring: { purpose: string } }>(
    '/api/v1/ml/features/versions/resolve',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: Resolve version for inference (latest active or pinned).',
        tags: ['Features'],
        querystring: { type: 'object', required: ['purpose'], properties: { purpose: { type: 'string', enum: ['risk-scoring', 'win-probability', 'lstm', 'anomaly', 'forecasting'] } } },
        response: { 200: { type: 'object', properties: { version: { type: 'string' } } } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const version = await featureVersionManager.resolveVersion(tenantId, request.query.purpose as FeaturePurpose);
      return reply.send({ version });
    }
  );

  /** Layer 2: Upsert feature version metadata (create or update). POST /api/v1/ml/features/versions */
  app.post<{
    Body: { purpose: string; version: string; featureNames?: string[]; statistics?: Array<{ name: string; mean?: number; std?: number; min?: number; max?: number; missingRate?: number; sampleCount?: number }> };
  }>(
    '/api/v1/ml/features/versions',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: Create or update feature version metadata (enables pin/deprecate).',
        tags: ['Features'],
        body: {
          type: 'object',
          required: ['purpose', 'version'],
          properties: {
            purpose: { type: 'string', enum: ['risk-scoring', 'win-probability', 'lstm', 'anomaly', 'forecasting'] },
            version: { type: 'string' },
            featureNames: { type: 'array', items: { type: 'string' } },
            statistics: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, mean: { type: 'number' }, std: { type: 'number' }, min: { type: 'number' }, max: { type: 'number' }, missingRate: { type: 'number' }, sampleCount: { type: 'number' } } } },
          },
        },
        response: { 200: { type: 'object' }, 201: { type: 'object' } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { purpose, version, featureNames, statistics } = request.body;
      const names = featureNames ?? featureStoreService.getSchema(purpose as FeaturePurpose).map((f) => f.name);
      const meta = await featureVersionManager.upsertMetadata(tenantId, purpose as FeaturePurpose, version, { featureNames: names, statistics });
      return reply.send(meta);
    }
  );

  /** Layer 2: List feature version metadata. GET /api/v1/ml/features/versions */
  app.get<{ Querystring: { purpose?: string } }>(
    '/api/v1/ml/features/versions',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: List feature version metadata.',
        tags: ['Features'],
        querystring: { type: 'object', properties: { purpose: { type: 'string', enum: ['risk-scoring', 'win-probability', 'lstm', 'anomaly', 'forecasting'] } } },
        response: { 200: { type: 'object', properties: { items: { type: 'array' } } } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const items = await featureVersionManager.listMetadata(tenantId, request.query.purpose as FeaturePurpose | undefined);
      return reply.send({ items });
    }
  );

  /** Super Admin §5.2.2: Feature version policy (read-only from config). GET /api/v1/ml/features/version-policy */
  app.get<Record<string, never>>(
    '/api/v1/ml/features/version-policy',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Feature version policy (versioning strategy, backward compatibility, deprecation). Super Admin §5.2.2. Read from config.',
        tags: ['Features'],
        response: {
          200: {
            type: 'object',
            properties: {
              versioningStrategy: { type: 'string', enum: ['semantic', 'timestamp', 'hash'] },
              backwardCompatibility: {
                type: 'object',
                properties: {
                  enforceCompatibility: { type: 'boolean' },
                  allowBreakingChanges: { type: 'boolean' },
                  requireMigrationGuide: { type: 'boolean' },
                },
              },
              deprecationPolicy: {
                type: 'object',
                properties: {
                  deprecationNoticeDays: { type: 'number' },
                  supportOldVersionsDays: { type: 'number' },
                  autoMigrate: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const policy = config.feature_version_policy ?? {};
      const versioningStrategy = policy.versioningStrategy ?? 'semantic';
      const backwardCompatibility = {
        enforceCompatibility: policy.backwardCompatibility?.enforceCompatibility ?? true,
        allowBreakingChanges: policy.backwardCompatibility?.allowBreakingChanges ?? false,
        requireMigrationGuide: policy.backwardCompatibility?.requireMigrationGuide ?? true,
      };
      const deprecationPolicy = {
        deprecationNoticeDays: policy.deprecationPolicy?.deprecationNoticeDays ?? 30,
        supportOldVersionsDays: policy.deprecationPolicy?.supportOldVersionsDays ?? 90,
        autoMigrate: policy.deprecationPolicy?.autoMigrate ?? false,
      };
      return reply.send({
        versioningStrategy,
        backwardCompatibility,
        deprecationPolicy,
      });
    }
  );

  /** Layer 2: Pin version. POST /api/v1/ml/features/versions/pin */
  app.post<{ Body: { purpose: string; version: string } }>(
    '/api/v1/ml/features/versions/pin',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: Pin feature version for training.',
        tags: ['Features'],
        body: { type: 'object', required: ['purpose', 'version'], properties: { purpose: { type: 'string' }, version: { type: 'string' } } },
        response: { 200: { type: 'object' } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const meta = await featureVersionManager.pinVersion(tenantId, request.body.purpose as FeaturePurpose, request.body.version);
      return reply.send(meta);
    }
  );

  /** Layer 2: Deprecate version. POST /api/v1/ml/features/versions/deprecate */
  app.post<{ Body: { purpose: string; version: string } }>(
    '/api/v1/ml/features/versions/deprecate',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: Deprecate feature version.',
        tags: ['Features'],
        body: { type: 'object', required: ['purpose', 'version'], properties: { purpose: { type: 'string' }, version: { type: 'string' } } },
        response: { 200: { type: 'object' } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const meta = await featureVersionManager.deprecateVersion(tenantId, request.body.purpose as FeaturePurpose, request.body.version);
      return reply.send(meta);
    }
  );

  /** Super Admin §5.3.2: Feature quality rules (read-only from config). GET /api/v1/ml/features/quality-rules */
  app.get<Record<string, never>>(
    '/api/v1/ml/features/quality-rules',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Default feature quality rules (missing rate, drift, outlier method). Super Admin §5.3.2. Read from config.',
        tags: ['Features'],
        response: {
          200: {
            type: 'object',
            properties: {
              missingRateThreshold: { type: 'number' },
              driftThreshold: { type: 'number' },
              outlierMethod: { type: 'string', enum: ['iqr', 'zscore', 'isolation_forest'] },
              outlierNStd: { type: 'number' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const rules = config.feature_quality_rules ?? {};
      return reply.send({
        missingRateThreshold: rules.missingRateThreshold ?? 0.1,
        driftThreshold: rules.driftThreshold ?? 0.2,
        outlierMethod: rules.outlierMethod ?? 'zscore',
        outlierNStd: rules.outlierNStd ?? 3,
      });
    }
  );

  /** Layer 2: Quality check. GET /api/v1/ml/features/quality */
  app.get<{ Querystring: { purpose: string; version?: string } }>(
    '/api/v1/ml/features/quality',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: Check feature quality (missing rate, drift). Uses config feature_quality_rules for thresholds.',
        tags: ['Features'],
        querystring: { type: 'object', required: ['purpose'], properties: { purpose: { type: 'string' }, version: { type: 'string' } } },
        response: { 200: { type: 'object', properties: { alerts: { type: 'array' } } } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const rules = config.feature_quality_rules ?? {};
      const options = {
        missingRateThreshold: rules.missingRateThreshold ?? 0.1,
        driftThreshold: rules.driftThreshold ?? 0.2,
      };
      const alerts = await featureQualityMonitor.checkQuality(tenantId, request.query.purpose as FeaturePurpose, request.query.version ?? 'v1', options);
      return reply.send({ alerts });
    }
  );

  /** Invalidate feature cache (e.g. on opportunity.updated). POST /api/v1/ml/features/cache/invalidate */
  app.post<{ Body: { opportunityId: string; reason?: string } }>(
    '/api/v1/ml/features/cache/invalidate',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Layer 2: Invalidate feature cache for an opportunity.',
        tags: ['Features'],
        body: { type: 'object', required: ['opportunityId'], properties: { opportunityId: { type: 'string' }, reason: { type: 'string' } } },
        response: { 204: { type: 'null' } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await featureStoreService.invalidateCache(tenantId, request.body.opportunityId, request.body.reason);
      return reply.code(204).send();
    }
  );

  // ===== FEATURE DEFINITION ROUTES (ml_features container) =====

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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      const body = request.body as Partial<{ name: string; description?: string; type: Feature['type']; source?: string; transformation?: string; statistics?: Feature['statistics'] }>;
      const feature = await featureService.update(request.params.id, tenantId, body);
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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

  /**
   * W6 Layer 8 – Run model evaluation.
   * POST /api/v1/ml/evaluation
   */
  app.post<{
    Body: { modelId: string; testDataPath?: string; actualsPath?: string };
  }>(
    '/api/v1/ml/evaluation',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Run model evaluation (Plan W6 Layer 8)',
        tags: ['Training', 'Evaluation'],
        body: {
          type: 'object',
          required: ['modelId'],
          properties: {
            modelId: { type: 'string' },
            testDataPath: { type: 'string' },
            actualsPath: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              modelId: { type: 'string' },
              metrics: {
                type: 'object',
                properties: {
                  accuracy: { type: 'number' },
                  precision: { type: 'number' },
                  recall: { type: 'number' },
                  f1Score: { type: 'number' },
                  evaluationTime: { type: 'string', format: 'date-time' },
                },
              },
              evaluationDate: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { modelId, testDataPath, actualsPath } = request.body;
      const metrics = await evaluationService.evaluateModel(tenantId, modelId, {
        testDataPath,
        actualsPath,
      });
      const evaluationDate = new Date().toISOString();
      reply.send({
        modelId,
        metrics: {
          ...metrics,
          evaluationTime: metrics.evaluationTime instanceof Date ? metrics.evaluationTime.toISOString() : metrics.evaluationTime,
        },
        evaluationDate,
      });
    }
  );

  /**
   * W6 Layer 8 – Get drift metrics for a model.
   * GET /api/v1/ml/evaluation/drift/:modelId
   */
  app.get<{
    Params: { modelId: string };
    Querystring: { from?: string; to?: string; limit?: number };
  }>(
    '/api/v1/ml/evaluation/drift/:modelId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Get drift metrics for a model (Plan W6 Layer 8)',
        tags: ['Training', 'Evaluation'],
        params: {
          type: 'object',
          required: ['modelId'],
          properties: { modelId: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
            limit: { type: 'integer' },
          },
        },
        response: { 200: { type: 'array', items: { type: 'object' } } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { modelId } = request.params;
      const metrics = await evaluationService.getDrift(tenantId, modelId, {
        from: request.query.from,
        to: request.query.to,
        limit: request.query.limit,
      });
      reply.send(metrics);
    }
  );

  /**
   * W6 Layer 8 – Get improvement suggestions for a model.
   * GET /api/v1/ml/learning/suggestions/:modelId
   */
  app.get<{
    Params: { modelId: string };
    Querystring: { acknowledged?: boolean; limit?: number };
  }>(
    '/api/v1/ml/learning/suggestions/:modelId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Get improvement suggestions for a model (Plan W6 Layer 8)',
        tags: ['Training', 'Learning'],
        params: {
          type: 'object',
          required: ['modelId'],
          properties: { modelId: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          properties: {
            acknowledged: { type: 'boolean' },
            limit: { type: 'integer' },
          },
        },
        response: { 200: { type: 'array', items: { type: 'object' } } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { modelId } = request.params;
      const suggestions = await continuousLearningService.getSuggestions(tenantId, modelId, {
        acknowledged: request.query.acknowledged,
        limit: request.query.limit,
      });
      reply.send(suggestions);
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
   * Invalidate prediction cache for an opportunity (W4 Layer 3; call on opportunity.updated).
   * POST /api/v1/ml/predictions/cache/invalidate
   */
  app.post<{ Body: { opportunityId: string } }>(
    '/api/v1/ml/predictions/cache/invalidate',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Invalidate prediction cache for an opportunity (win_probability, risk_scoring, anomaly). Call when opportunity is updated.',
        tags: ['Predictions'],
        body: { type: 'object', required: ['opportunityId'], properties: { opportunityId: { type: 'string' } } },
        response: { 204: { type: 'null' } },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await predictionService.invalidatePredictionCache(tenantId, request.body.opportunityId);
      return reply.code(204).send();
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
   * Win-probability trend (Gap 6, Plan §4.2). GET /api/v1/ml/win-probability/:opportunityId/trend
   */
  app.get<{ Params: { opportunityId: string }; Querystring: { from?: string; to?: string } }>(
    '/api/v1/ml/win-probability/:opportunityId/trend',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
      schema: {
        description: 'Historical win-probability points for an opportunity. Reads from ml_win_probability_predictions. Query: from, to (ISO date).',
        tags: ['Predictions'],
        params: { type: 'object', properties: { opportunityId: { type: 'string' } }, required: ['opportunityId'] },
        querystring: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } } },
        response: {
          200: {
            type: 'object',
            properties: {
              points: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string' },
                    probability: { type: 'number' },
                    confidence: { type: 'number' },
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
      const { opportunityId } = request.params;
      const { from, to } = request.query;
      const out = await predictionService.getProbabilityTrend(tenantId, opportunityId, from, to);
      reply.send(out);
    }
  );

  /**
   * Anomaly prediction (Plan §5.5). buildVector('anomaly') → Azure ML anomaly endpoint.
   * POST /api/v1/ml/anomaly/predict
   */
  app.post<{ Body: { opportunityId: string } }>(
    '/api/v1/ml/anomaly/predict',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      const t0 = Date.now();
      const end = mlPredictionDurationSeconds.startTimer({ model: 'risk_trajectory_lstm' });
      try {
        const out = await predictionService.predictLstmTrajectory(request.body.sequence);
        mlPredictionsTotal.inc({ model: 'risk_trajectory_lstm' });
        reply.send(out);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        await publishMlPredictionFailed(tenantId, {
          opportunityId: request.body.opportunityId,
          modelId: 'risk_trajectory_lstm',
          error: msg,
          durationMs: Date.now() - t0,
        });
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      const tenantId = (request as { user?: { tenantId: string } }).user?.tenantId ?? '';
      const industryId = request.query.industryId;
      const tenantConfig = await featureService.getTenantMLConfig(tenantId);
      const out = selectRiskScoringModel(tenantId, industryId, undefined, tenantConfig);
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()] as any,
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

/**
 * Route Registration
 * Integration Manager routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware, generateServiceToken } from '@coder/shared';
import { IntegrationProviderService } from '../services/IntegrationProviderService';
import { IntegrationService } from '../services/IntegrationService';
import { IntegrationCatalogService } from '../services/IntegrationCatalogService';
import { IntegrationConnectionService } from '../services/IntegrationConnectionService';
import { AdapterManagerService } from '../services/AdapterManagerService';
import { WebhookService } from '../services/WebhookService';
import { SyncTaskService } from '../services/SyncTaskService';
import { ContentGenerationService } from '../services/ContentGenerationService';
import { ContentTemplateService } from '../services/ContentTemplateService';
import { TemplateService } from '../services/TemplateService';
import {
  CreateIntegrationInput,
  UpdateIntegrationInput,
  CreateWebhookInput,
  UpdateWebhookInput,
  CreateSyncTaskInput,
  IntegrationStatus,
  SyncStatus,
  SyncJobType,
} from '../types/integration.types';
import {
  CreateIntegrationCatalogInput,
  UpdateIntegrationCatalogInput,
  CreateVisibilityRuleInput,
  UpdateVisibilityRuleInput,
} from '../types/integration-catalog.types';
import {
  CreateContentJobInput,
  GenerateContentRequest,
  CreateContentTemplateInput,
  UpdateContentTemplateInput,
} from '../types/content.types';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  RenderTemplateInput,
} from '../types/template.types';
import {
  DetectConflictInput,
  ResolveConflictInput,
  ConflictResolutionStrategy,
} from '../types/bidirectional-sync.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const integrationProviderService = new IntegrationProviderService();
  const integrationCatalogService = new IntegrationCatalogService(app);
  // Get secret management URL from config (no hardcoded fallback - must be in config)
  if (!config.services?.secret_management?.url) {
    throw new Error('Secret management service URL must be configured in config/services/secret_management/url');
  }
  const secretManagementUrl = config.services.secret_management.url;
  const integrationService = new IntegrationService(secretManagementUrl);
  const integrationConnectionService = new IntegrationConnectionService(
    app,
    integrationService,
    integrationProviderService
  );
  const adapterManagerService = new AdapterManagerService(
    integrationConnectionService,
    integrationService,
    app
  );
  const bidirectionalSyncService = new BidirectionalSyncService();
  const webhookService = new WebhookService(secretManagementUrl);
  const syncTaskService = new SyncTaskService();
  const contentGenerationService = new ContentGenerationService(
    config.services.ai_service?.url,
    config.services.shard_manager?.url
  );
  const contentTemplateService = new ContentTemplateService();
  const templateService = new TemplateService();

  // ===== INTEGRATION PROVIDER ROUTES (Catalog) =====

  /**
   * List integration providers (catalog)
   * GET /api/v1/integrations/providers
   */
  app.get<{
    Querystring: {
      category?: string;
      isActive?: boolean;
      limit?: number;
    };
  }>(
    '/api/v1/integrations/providers',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List integration providers (catalog)',
        tags: ['Integration Providers'],
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            isActive: { type: 'boolean' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of integration providers',
          },
        },
      },
    },
    async (request, reply) => {
      const providers = await integrationProviderService.list({
        category: request.query.category,
        isActive: request.query.isActive,
        limit: request.query.limit,
      });
      reply.send(providers);
    }
  );

  /**
   * Get integration provider by ID
   * GET /api/v1/integrations/providers/:id
   */
  app.get<{ Params: { id: string; category: string } }>(
    '/api/v1/integrations/providers/:category/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get integration provider by ID',
        tags: ['Integration Providers'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            category: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Integration provider details',
          },
        },
      },
    },
    async (request, reply) => {
      const provider = await integrationProviderService.getById(
        request.params.id,
        request.params.category
      );
      reply.send(provider);
    }
  );

  // ===== INTEGRATION ROUTES =====

  /**
   * Create integration
   * POST /api/v1/integrations
   */
  app.post<{ Body: CreateIntegrationInput }>(
    '/api/v1/integrations',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new integration instance',
        tags: ['Integrations'],
        body: {
          type: 'object',
          required: ['integrationId', 'name', 'credentialSecretName', 'authMethod'],
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            credentialSecretName: { type: 'string' },
            authMethod: { type: 'string', enum: ['oauth', 'apikey', 'serviceaccount', 'basic'] },
            instanceUrl: { type: 'string' },
            settings: { type: 'object' },
            syncConfig: { type: 'object' },
            userScoped: { type: 'boolean' },
            allowedShardTypes: { type: 'array', items: { type: 'string' } },
            searchEnabled: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Integration created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateIntegrationInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const integration = await integrationService.create(input);
      reply.code(201).send(integration);
    }
  );

  /**
   * Get integration by ID
   * GET /api/v1/integrations/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/integrations/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get integration by ID',
        tags: ['Integrations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Integration details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const integration = await integrationService.getById(request.params.id, tenantId);
      reply.send(integration);
    }
  );

  /**
   * Update integration
   * PUT /api/v1/integrations/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateIntegrationInput }>(
    '/api/v1/integrations/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update integration',
        tags: ['Integrations'],
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
            settings: { type: 'object' },
            syncConfig: { type: 'object' },
            userScoped: { type: 'boolean' },
            allowedShardTypes: { type: 'array', items: { type: 'string' } },
            searchEnabled: { type: 'boolean' },
            status: { type: 'string', enum: ['pending', 'connected', 'error', 'disabled'] },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Integration updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const integration = await integrationService.update(
        request.params.id,
        tenantId,
        request.body
      );
      reply.send(integration);
    }
  );

  /**
   * Delete integration
   * DELETE /api/v1/integrations/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/integrations/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete integration (deactivate)',
        tags: ['Integrations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Integration deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await integrationService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List integrations
   * GET /api/v1/integrations
   */
  app.get<{
    Querystring: {
      providerName?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/integrations',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List integrations',
        tags: ['Integrations'],
        querystring: {
          type: 'object',
          properties: {
            providerName: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'connected', 'error', 'disabled'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of integrations',
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
      const result = await integrationService.list(tenantId, {
        providerName: request.query.providerName,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Test integration connection
   * POST /api/v1/integrations/:id/test
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/integrations/:id/test',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Test integration connection',
        tags: ['Integrations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Connection test result',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await integrationService.testConnection(request.params.id, tenantId);
      reply.send(result);
    }
  );

  // ===== WEBHOOK ROUTES =====

  /**
   * Create webhook
   * POST /api/v1/webhooks
   */
  app.post<{ Body: CreateWebhookInput }>(
    '/api/v1/webhooks',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create webhook',
        tags: ['Webhooks'],
        body: {
          type: 'object',
          required: ['integrationId', 'webhookUrl', 'events'],
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
            webhookUrl: { type: 'string', format: 'uri' },
            events: { type: 'array', items: { type: 'string' } },
            webhookSecret: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Webhook created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateWebhookInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const webhook = await webhookService.create(input);
      reply.code(201).send(webhook);
    }
  );

  /**
   * Get webhook by ID
   * GET /api/v1/webhooks/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/webhooks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get webhook by ID',
        tags: ['Webhooks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Webhook details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const webhook = await webhookService.getById(request.params.id, tenantId);
      reply.send(webhook);
    }
  );

  /**
   * Update webhook
   * PUT /api/v1/webhooks/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateWebhookInput }>(
    '/api/v1/webhooks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update webhook',
        tags: ['Webhooks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            webhookUrl: { type: 'string', format: 'uri' },
            events: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Webhook updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const webhook = await webhookService.update(request.params.id, tenantId, request.body);
      reply.send(webhook);
    }
  );

  /**
   * Delete webhook
   * DELETE /api/v1/webhooks/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/webhooks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete webhook',
        tags: ['Webhooks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Webhook deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await webhookService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List webhooks
   * GET /api/v1/webhooks
   */
  app.get<{
    Querystring: {
      integrationId?: string;
      isActive?: boolean;
      limit?: number;
    };
  }>(
    '/api/v1/webhooks',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List webhooks',
        tags: ['Webhooks'],
        querystring: {
          type: 'object',
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
            isActive: { type: 'boolean' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of webhooks',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const webhooks = await webhookService.list(tenantId, {
        integrationId: request.query.integrationId,
        isActive: request.query.isActive,
        limit: request.query.limit,
      });
      reply.send(webhooks);
    }
  );

  // ===== SYNC TASK ROUTES =====

  /**
   * Create sync task
   * POST /api/v1/sync-tasks
   */
  app.post<{ Body: CreateSyncTaskInput }>(
    '/api/v1/sync-tasks',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create sync task (manual trigger)',
        tags: ['Sync Tasks'],
        body: {
          type: 'object',
          required: ['integrationId', 'jobType', 'trigger'],
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
            jobType: { type: 'string', enum: ['full', 'incremental', 'webhook', 'manual'] },
            trigger: { type: 'string', enum: ['scheduled', 'webhook', 'manual', 'retry'] },
            entityMappings: { type: 'array', items: { type: 'object' } },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Sync task created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateSyncTaskInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const task = await syncTaskService.create(input);
      reply.code(201).send(task);
    }
  );

  /**
   * Get sync task by ID
   * GET /api/v1/sync-tasks/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/sync-tasks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get sync task by ID',
        tags: ['Sync Tasks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Sync task details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const task = await syncTaskService.getById(request.params.id, tenantId);
      reply.send(task);
    }
  );

  /**
   * List sync tasks
   * GET /api/v1/sync-tasks
   */
  app.get<{
    Querystring: {
      integrationId?: string;
      status?: string;
      jobType?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/sync-tasks',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List sync tasks',
        tags: ['Sync Tasks'],
        querystring: {
          type: 'object',
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['running', 'success', 'partial', 'failed', 'cancelled'] },
            jobType: { type: 'string', enum: ['full', 'incremental', 'webhook', 'manual'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of sync tasks',
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
      const result = await syncTaskService.list(tenantId, {
        integrationId: request.query.integrationId,
        status: request.query.status as any,
        jobType: request.query.jobType as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Cancel sync task
   * POST /api/v1/sync-tasks/:id/cancel
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/sync-tasks/:id/cancel',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Cancel running sync task',
        tags: ['Sync Tasks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Sync task cancelled successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const task = await syncTaskService.cancel(request.params.id, tenantId);
      reply.send(task);
    }
  );

  // ===== INTEGRATION SYNC ROUTES (from integration-sync) =====

  /**
   * Get sync task status
   * GET /api/v1/sync/tasks/:taskId
   */
  app.get<{ Params: { taskId: string } }>(
    '/api/v1/sync/tasks/:taskId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get sync task status',
        tags: ['Sync'],
      },
    },
    async (request, reply) => {
      try {
        const { taskId } = request.params;
        const tenantId = request.user!.tenantId;

        // Use existing syncTaskService
        const task = await syncTaskService.getById(taskId, tenantId);

        if (!task) {
          return reply.status(404).send({
            error: {
              code: 'TASK_NOT_FOUND',
              message: 'Sync task not found',
            },
          });
        }

        return reply.send(task);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'TASK_RETRIEVAL_FAILED',
            message: error.message || 'Failed to retrieve sync task',
          },
        });
      }
    }
  );

  /**
   * Create and trigger sync
   * POST /api/v1/sync/trigger
   */
  app.post<{ Body: { integrationId: string; direction: string; entityType?: string; filters?: Record<string, any> } }>(
    '/api/v1/sync/trigger',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create and trigger synchronization',
        tags: ['Sync'],
        body: {
          type: 'object',
          required: ['integrationId', 'direction'],
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
            direction: { type: 'string', enum: ['pull', 'push', 'bidirectional'] },
            entityType: { type: 'string' },
            filters: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { integrationId, direction, entityType, filters } = request.body;
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;

        // Create sync task using existing service
        const input: CreateSyncTaskInput = {
          integrationId,
          jobType: direction === 'pull' ? 'incremental' : direction === 'push' ? 'manual' : 'full',
          trigger: 'manual',
          tenantId,
          userId,
          entityMappings: entityType ? [{ entityType, filters }] : undefined,
        };

        const task = await syncTaskService.create(input);

        return reply.status(202).send({
          taskId: task.id,
          status: task.status,
          message: 'Sync task created and started',
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'SYNC_TRIGGER_FAILED',
            message: error.message || 'Failed to trigger synchronization',
          },
        });
      }
    }
  );

  // ===== CONTENT GENERATION ROUTES (from content-generation) =====

  /**
   * Generate content (synchronous)
   * POST /api/v1/content/generate
   */
  app.post<{ Body: any }>(
    '/api/v1/content/generate',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Generate content using AI (synchronous)',
        tags: ['Content Generation'],
        body: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { type: 'string', minLength: 1, maxLength: 10000 },
            templateId: { type: 'string', format: 'uuid' },
            context: { type: 'object' },
            options: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const requestBody = {
        ...request.body,
        tenantId,
        userId,
      };

      const job = await contentGenerationService.generate(requestBody);
      reply.send(job);
    }
  );

  /**
   * Create content generation job (asynchronous)
   * POST /api/v1/content/jobs
   */
  app.post<{ Body: any }>(
    '/api/v1/content/jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create content generation job (asynchronous)',
        tags: ['Content Generation'],
        body: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { type: 'string', minLength: 1, maxLength: 10000 },
            templateId: { type: 'string', format: 'uuid' },
            context: { type: 'object' },
            options: { type: 'object' },
            requestId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input = {
        ...request.body,
        tenantId,
        userId,
      };

      const job = await contentGenerationService.create(input);
      reply.code(201).send(job);
    }
  );

  /**
   * Get content generation job by ID
   * GET /api/v1/content/jobs/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/content/jobs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get content generation job by ID',
        tags: ['Content Generation'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await contentGenerationService.getById(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * Cancel content generation job
   * POST /api/v1/content/jobs/:id/cancel
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/content/jobs/:id/cancel',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Cancel content generation job',
        tags: ['Content Generation'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await contentGenerationService.cancel(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * List content generation jobs
   * GET /api/v1/content/jobs
   */
  app.get<{
    Querystring: {
      status?: string;
      userId?: string;
      templateId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/content/jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List content generation jobs',
        tags: ['Content Generation'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await contentGenerationService.list(tenantId, {
        status: request.query.status as any,
        userId: request.query.userId,
        templateId: request.query.templateId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== CONTENT TEMPLATE ROUTES (from content-generation) =====

  /**
   * Create content template
   * POST /api/v1/content/templates
   */
  app.post<{ Body: any }>(
    '/api/v1/content/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create content template',
        tags: ['Content Templates'],
        body: {
          type: 'object',
          required: ['name', 'category', 'documentType', 'templateContent'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            documentType: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            templateContent: { type: 'string' },
            defaultTheme: { type: 'object' },
            requiredFields: { type: 'array' },
            aiConfig: { type: 'object' },
            isSystemTemplate: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input = {
        ...request.body,
        tenantId,
        userId,
      };

      const template = await contentTemplateService.create(input);
      reply.code(201).send(template);
    }
  );

  /**
   * Get content template by ID
   * GET /api/v1/content/templates/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/content/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get content template by ID',
        tags: ['Content Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const template = await contentTemplateService.getById(request.params.id, tenantId);
      reply.send(template);
    }
  );

  /**
   * Update content template
   * PUT /api/v1/content/templates/:id
   */
  app.put<{ Params: { id: string }; Body: any }>(
    '/api/v1/content/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update content template',
        tags: ['Content Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const template = await contentTemplateService.update(request.params.id, tenantId, request.body);
      reply.send(template);
    }
  );

  /**
   * Delete content template
   * DELETE /api/v1/content/templates/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/content/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete content template',
        tags: ['Content Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await contentTemplateService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List content templates
   * GET /api/v1/content/templates
   */
  app.get<{
    Querystring: {
      category?: string;
      documentType?: string;
      isActive?: boolean;
      limit?: number;
    };
  }>(
    '/api/v1/content/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List content templates',
        tags: ['Content Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const templates = await contentTemplateService.list(tenantId, {
        category: request.query.category,
        documentType: request.query.documentType,
        isActive: request.query.isActive,
        limit: request.query.limit,
      });
      reply.send(templates);
    }
  );

  // ===== TEMPLATE ROUTES (from template-service) =====

  /**
   * Create template
   * POST /api/v1/templates
   */
  app.post<{ Body: any }>(
    '/api/v1/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new template',
        tags: ['Templates'],
        body: {
          type: 'object',
          required: ['name', 'type', 'content'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['context', 'email', 'document', 'code', 'report'] },
            category: { type: 'string' },
            content: { type: 'string', minLength: 1 },
            variables: { type: 'array' },
            organizationId: { type: 'string', format: 'uuid' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
            subject: { type: 'string' },
            htmlContent: { type: 'string' },
            textContent: { type: 'string' },
            format: { type: 'string' },
            contextType: { type: 'string' },
            sections: { type: 'array' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
      };

      const template = await templateService.create(input);
      reply.code(201).send(template);
    }
  );

  /**
   * Get template by ID
   * GET /api/v1/templates/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get template by ID',
        tags: ['Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const template = await templateService.getById(request.params.id, tenantId);
      reply.send(template);
    }
  );

  /**
   * Update template
   * PUT /api/v1/templates/:id
   */
  app.put<{ Params: { id: string }; Body: any }>(
    '/api/v1/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update template',
        tags: ['Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const template = await templateService.update(request.params.id, tenantId, userId, request.body);
      reply.send(template);
    }
  );

  /**
   * Delete template
   * DELETE /api/v1/templates/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete template',
        tags: ['Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await templateService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List templates
   * GET /api/v1/templates
   */
  app.get<{
    Querystring: {
      type?: string;
      category?: string;
      status?: string;
      organizationId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List templates',
        tags: ['Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await templateService.list(tenantId, {
        type: request.query.type as any,
        category: request.query.category,
        status: request.query.status as any,
        organizationId: request.query.organizationId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Render template
   * POST /api/v1/templates/:id/render
   */
  app.post<{ Params: { id: string }; Body: any }>(
    '/api/v1/templates/:id/render',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Render template with variables',
        tags: ['Templates'],
        body: {
          type: 'object',
          required: ['variables'],
          properties: {
            variables: { type: 'object', additionalProperties: true },
            organizationId: { type: 'string', format: 'uuid' },
            version: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const input = {
        tenantId,
        templateId: request.params.id,
        ...request.body,
      };

      const rendered = await templateService.render(input);
      reply.send({ rendered });
    }
  );

  /**
   * Get template versions
   * GET /api/v1/templates/:id/versions
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/templates/:id/versions',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get all versions of a template',
        tags: ['Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const versions = await templateService.getVersions(tenantId, request.params.id);
      reply.send(versions);
    }
  );

  // ===== INTEGRATION CATALOG ROUTES (Super Admin) =====

  // Create integration in catalog
  app.post<{ Body: CreateIntegrationCatalogInput }>(
    '/api/v1/super-admin/integration-catalog',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create new integration in catalog (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const catalogEntry = await integrationCatalogService.createIntegration(request.body);
        return reply.status(201).send(catalogEntry);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_CREATION_FAILED',
            message: error.message || 'Failed to create integration catalog entry',
          },
        });
      }
    }
  );

  // List integrations in catalog
  app.get<{ Querystring: { category?: string; limit?: number; offset?: number } }>(
    '/api/v1/super-admin/integration-catalog',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List all integrations in catalog (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const result = await integrationCatalogService.listIntegrations({
          filter: request.query.category ? { category: request.query.category } : undefined,
          limit: request.query.limit,
          offset: request.query.offset,
        });
        return reply.send(result);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_LIST_FAILED',
            message: error.message || 'Failed to list integration catalog',
          },
        });
      }
    }
  );

  // Get integration by ID
  app.get<{ Params: { integrationId: string } }>(
    '/api/v1/super-admin/integration-catalog/:integrationId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get integration details (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const catalogEntry = await integrationCatalogService.getIntegration(request.params.integrationId);
        if (!catalogEntry) {
          return reply.status(404).send({ error: 'Integration not found' });
        }
        return reply.send(catalogEntry);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get integration catalog entry',
          },
        });
      }
    }
  );

  // Update integration in catalog
  app.put<{ Params: { integrationId: string }; Body: UpdateIntegrationCatalogInput }>(
    '/api/v1/super-admin/integration-catalog/:integrationId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update integration in catalog (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const catalogEntry = await integrationCatalogService.updateIntegration(
          request.params.integrationId,
          request.body
        );
        if (!catalogEntry) {
          return reply.status(404).send({ error: 'Integration not found' });
        }
        return reply.send(catalogEntry);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_UPDATE_FAILED',
            message: error.message || 'Failed to update integration catalog entry',
          },
        });
      }
    }
  );

  // Delete integration from catalog
  app.delete<{ Params: { integrationId: string } }>(
    '/api/v1/super-admin/integration-catalog/:integrationId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete integration from catalog (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const deleted = await integrationCatalogService.deleteIntegration(request.params.integrationId);
        if (!deleted) {
          return reply.status(404).send({ error: 'Integration not found' });
        }
        return reply.status(204).send();
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_DELETE_FAILED',
            message: error.message || 'Failed to delete integration catalog entry',
          },
        });
      }
    }
  );

  // Deprecate integration
  app.post<{ Params: { integrationId: string } }>(
    '/api/v1/super-admin/integration-catalog/:integrationId/deprecate',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Deprecate integration (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const userId = request.user!.id;
        const catalogEntry = await integrationCatalogService.deprecateIntegration(
          request.params.integrationId,
          userId
        );
        if (!catalogEntry) {
          return reply.status(404).send({ error: 'Integration not found' });
        }
        return reply.send(catalogEntry);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_DEPRECATE_FAILED',
            message: error.message || 'Failed to deprecate integration',
          },
        });
      }
    }
  );

  // Get integrations by category
  app.get<{ Params: { category: string } }>(
    '/api/v1/super-admin/integration-catalog/category/:category',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get integrations by category (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const entries = await integrationCatalogService.getIntegrationsByCategory(request.params.category);
        return reply.send(entries);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get integrations by category',
          },
        });
      }
    }
  );

  // Visibility rule management
  app.post<{ Body: CreateVisibilityRuleInput }>(
    '/api/v1/super-admin/integration-catalog/visibility-rules',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create visibility rule (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const rule = await integrationCatalogService.createVisibilityRule(request.body);
        return reply.status(201).send(rule);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'VISIBILITY_RULE_CREATION_FAILED',
            message: error.message || 'Failed to create visibility rule',
          },
        });
      }
    }
  );

  // Approve integration for tenant
  app.post<{ Body: { tenantId: string; integrationId: string } }>(
    '/api/v1/super-admin/integration-catalog/approve',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Approve integration for tenant (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const userId = request.user!.id;
        const rule = await integrationCatalogService.approveIntegration(
          request.body.tenantId,
          request.body.integrationId,
          userId
        );
        return reply.send(rule);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'INTEGRATION_APPROVAL_FAILED',
            message: error.message || 'Failed to approve integration',
          },
        });
      }
    }
  );

  // Deny integration for tenant
  app.post<{ Body: { tenantId: string; integrationId: string; denialReason: string } }>(
    '/api/v1/super-admin/integration-catalog/deny',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Deny integration for tenant (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const userId = request.user!.id;
        const rule = await integrationCatalogService.denyIntegration(
          request.body.tenantId,
          request.body.integrationId,
          request.body.denialReason,
          userId
        );
        return reply.send(rule);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'INTEGRATION_DENIAL_FAILED',
            message: error.message || 'Failed to deny integration',
          },
        });
      }
    }
  );

  // ===== INTEGRATION CONNECTION ROUTES =====

  // Start OAuth flow
  app.post<{ Body: { integrationId: string; returnUrl: string } }>(
    '/api/v1/integrations/:integrationId/oauth/start',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Start OAuth flow for integration',
        tags: ['Integrations', 'OAuth'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId } = request.params;
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;
        const { returnUrl } = request.body;

        const result = await integrationConnectionService.startOAuthFlow(
          integrationId,
          tenantId,
          userId,
          returnUrl
        );
        return reply.send(result);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'OAUTH_START_FAILED',
            message: error.message || 'Failed to start OAuth flow',
          },
        });
      }
    }
  );

  // Handle OAuth callback
  app.get<{ Querystring: { code: string; state: string } }>(
    '/api/v1/integrations/oauth/callback',
    {
      schema: {
        description: 'Handle OAuth callback',
        tags: ['Integrations', 'OAuth'],
      },
    },
    async (request, reply) => {
      try {
        const { code, state } = request.query;
        const result = await integrationConnectionService.handleOAuthCallback(code, state);
        
        if (result.success) {
          return reply.redirect(result.returnUrl);
        } else {
          return reply.redirect(`${result.returnUrl}?error=${encodeURIComponent(result.error || 'OAuth failed')}`);
        }
      } catch (error: any) {
        return reply.status(500).send({
          error: {
            code: 'OAUTH_CALLBACK_FAILED',
            message: error.message || 'Failed to handle OAuth callback',
          },
        });
      }
    }
  );

  // Connect with API key
  app.post<{ Params: { integrationId: string }; Body: { apiKey: string; displayName?: string } }>(
    '/api/v1/integrations/:integrationId/connections/api-key',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Connect integration with API key',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId } = request.params;
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;
        const { apiKey, displayName } = request.body;

        const connection = await integrationConnectionService.connectWithApiKey(
          integrationId,
          tenantId,
          userId,
          apiKey,
          displayName
        );
        return reply.status(201).send(connection);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONNECTION_CREATION_FAILED',
            message: error.message || 'Failed to create connection',
          },
        });
      }
    }
  );

  // Connect with basic auth
  app.post<{ Params: { integrationId: string }; Body: { username: string; password: string; displayName?: string } }>(
    '/api/v1/integrations/:integrationId/connections/basic-auth',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Connect integration with basic auth',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId } = request.params;
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;
        const { username, password, displayName } = request.body;

        const connection = await integrationConnectionService.connectWithBasicAuth(
          integrationId,
          tenantId,
          userId,
          username,
          password,
          displayName
        );
        return reply.status(201).send(connection);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONNECTION_CREATION_FAILED',
            message: error.message || 'Failed to create connection',
          },
        });
      }
    }
  );

  // Get connection
  app.get<{ Params: { integrationId: string; connectionId: string } }>(
    '/api/v1/integrations/:integrationId/connections/:connectionId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get connection by ID',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId, connectionId } = request.params;
        const tenantId = request.user!.tenantId;

        const connection = await integrationConnectionService.getConnection(connectionId, integrationId, tenantId);
        if (!connection) {
          return reply.status(404).send({ error: 'Connection not found' });
        }
        return reply.send(connection);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONNECTION_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get connection',
          },
        });
      }
    }
  );

  // Test connection
  app.post<{ Params: { integrationId: string }; Querystring: { connectionId?: string } }>(
    '/api/v1/integrations/:integrationId/connections/test',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Test connection',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId } = request.params;
        const tenantId = request.user!.tenantId;
        const { connectionId } = request.query;

        const result = await integrationConnectionService.testConnection(
          integrationId,
          tenantId,
          connectionId
        );
        return reply.send(result);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONNECTION_TEST_FAILED',
            message: error.message || 'Failed to test connection',
          },
        });
      }
    }
  );

  // Refresh tokens
  app.post<{ Params: { integrationId: string; connectionId: string } }>(
    '/api/v1/integrations/:integrationId/connections/:connectionId/refresh',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Refresh OAuth tokens',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId, connectionId } = request.params;
        const tenantId = request.user!.tenantId;

        const success = await integrationConnectionService.refreshTokens(connectionId, integrationId, tenantId);
        return reply.send({ success });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'TOKEN_REFRESH_FAILED',
            message: error.message || 'Failed to refresh tokens',
          },
        });
      }
    }
  );

  // Delete connection
  app.delete<{ Params: { integrationId: string; connectionId: string } }>(
    '/api/v1/integrations/:integrationId/connections/:connectionId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete connection',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId, connectionId } = request.params;
        const tenantId = request.user!.tenantId;

        await integrationConnectionService.deleteConnection(connectionId, integrationId, tenantId);
        return reply.status(204).send();
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONNECTION_DELETE_FAILED',
            message: error.message || 'Failed to delete connection',
          },
        });
      }
    }
  );

  // ===== ADAPTER MANAGEMENT ROUTES =====

  // Get adapter instance
  app.post<{ Body: { providerName: string; integrationId: string; userId?: string } }>(
    '/api/v1/integrations/adapters/get',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get adapter instance for integration',
        tags: ['Integrations', 'Adapters'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { providerName, integrationId, userId } = request.body;
        const tenantId = request.user!.tenantId;

        // Note: This returns adapter metadata, not the actual adapter instance
        // The adapter instance should be used internally by the service
        const adapter = await adapterManagerService.getAdapter(
          providerName,
          integrationId,
          tenantId,
          userId
        );

        return reply.send({
          providerId: adapter.providerId,
          providerName: adapter.providerName,
          isConnected: adapter.isConnected(),
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'ADAPTER_GET_FAILED',
            message: error.message || 'Failed to get adapter',
          },
        });
      }
    }
  );

  // Test adapter connection
  app.post<{ Body: { providerName: string; integrationId: string; userId?: string } }>(
    '/api/v1/integrations/adapters/test',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Test adapter connection',
        tags: ['Integrations', 'Adapters'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { providerName, integrationId, userId } = request.body;
        const tenantId = request.user!.tenantId;

        const adapter = await adapterManagerService.getAdapter(
          providerName,
          integrationId,
          tenantId,
          userId
        );

        const result = await adapterManagerService.testAdapterConnection(adapter);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'ADAPTER_TEST_FAILED',
            message: error.message || 'Failed to test adapter connection',
          },
        });
      }
    }
  );

  // Get adapter registry statistics
  app.get(
    '/api/v1/integrations/adapters/registry/stats',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get adapter registry statistics',
        tags: ['Integrations', 'Adapters'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const stats = adapterManagerService.getRegistryStats();
        return reply.send(stats);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'ADAPTER_STATS_FAILED',
            message: error.message || 'Failed to get adapter statistics',
          },
        });
      }
    }
  );

  // Clear adapter cache
  app.post(
    '/api/v1/integrations/adapters/cache/clear',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Clear adapter cache',
        tags: ['Integrations', 'Adapters'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        adapterManagerService.clearCache();
        return reply.status(204).send();
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'ADAPTER_CACHE_CLEAR_FAILED',
            message: error.message || 'Failed to clear adapter cache',
          },
        });
      }
    }
  );

  // Remove adapter from cache
  app.delete<{ Querystring: { providerName: string; integrationId: string; userId?: string } }>(
    '/api/v1/integrations/adapters/cache',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Remove adapter from cache',
        tags: ['Integrations', 'Adapters'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { providerName, integrationId, userId } = request.query;
        adapterManagerService.removeFromCache(providerName, integrationId, userId);
        return reply.status(204).send();
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'ADAPTER_CACHE_REMOVE_FAILED',
            message: error.message || 'Failed to remove adapter from cache',
          },
        });
      }
    }
  );

  // ===== BIDIRECTIONAL SYNC & CONFLICT RESOLUTION ROUTES =====

  // Detect conflicts
  app.post<{ Body: DetectConflictInput }>(
    '/api/v1/integrations/sync/conflicts/detect',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Detect conflicts between local and remote versions',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const conflict = await bidirectionalSyncService.detectConflicts(request.body);
        if (!conflict) {
          return reply.send({ conflict: null, hasConflict: false });
        }
        return reply.send({ conflict, hasConflict: true });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONFLICT_DETECTION_FAILED',
            message: error.message || 'Failed to detect conflicts',
          },
        });
      }
    }
  );

  // Resolve conflict
  app.post<{ Body: ResolveConflictInput }>(
    '/api/v1/integrations/sync/conflicts/resolve',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Resolve a sync conflict',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const resolution = await bidirectionalSyncService.resolveConflict(request.body);
        return reply.send(resolution);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONFLICT_RESOLUTION_FAILED',
            message: error.message || 'Failed to resolve conflict',
          },
        });
      }
    }
  );

  // Get conflict by ID
  app.get<{ Params: { conflictId: string } }>(
    '/api/v1/integrations/sync/conflicts/:conflictId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get conflict by ID',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { conflictId } = request.params;
        const tenantId = request.user!.tenantId;
        const conflict = await bidirectionalSyncService.getConflict(conflictId, tenantId);
        if (!conflict) {
          return reply.status(404).send({ error: 'Conflict not found' });
        }
        return reply.send(conflict);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONFLICT_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get conflict',
          },
        });
      }
    }
  );

  // Get pending conflicts
  app.get(
    '/api/v1/integrations/sync/conflicts/pending',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get all pending conflicts for tenant',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user!.tenantId;
        const conflicts = await bidirectionalSyncService.getPendingConflicts(tenantId);
        return reply.send({ conflicts });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONFLICTS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get pending conflicts',
          },
        });
      }
    }
  );

  // Ignore conflict
  app.post<{ Params: { conflictId: string } }>(
    '/api/v1/integrations/sync/conflicts/:conflictId/ignore',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Ignore a conflict',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { conflictId } = request.params;
        const tenantId = request.user!.tenantId;
        await bidirectionalSyncService.ignoreConflict(conflictId, tenantId);
        return reply.status(204).send();
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONFLICT_IGNORE_FAILED',
            message: error.message || 'Failed to ignore conflict',
          },
        });
      }
    }
  );

  // Get conflict statistics
  app.get(
    '/api/v1/integrations/sync/conflicts/stats',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get conflict statistics for tenant',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user!.tenantId;
        const stats = await bidirectionalSyncService.getConflictStats(tenantId);
        return reply.send(stats);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONFLICT_STATS_FAILED',
            message: error.message || 'Failed to get conflict statistics',
          },
        });
      }
    }
  );
}

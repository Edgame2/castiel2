/**
 * Route Registration
 * Integration Manager routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { IntegrationProviderService } from '../services/IntegrationProviderService';
import { IntegrationService } from '../services/IntegrationService';
import { WebhookService } from '../services/WebhookService';
import { SyncTaskService } from '../services/SyncTaskService';
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

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const integrationProviderService = new IntegrationProviderService();
  const secretManagementUrl = config.services.secret_management?.url || config.services.secret_management?.url || 'http://localhost:3003';
  const integrationService = new IntegrationService(secretManagementUrl);
  const webhookService = new WebhookService(secretManagementUrl);
  const syncTaskService = new SyncTaskService();

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
}

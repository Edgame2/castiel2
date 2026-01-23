/**
 * Sync Task Routes
 * Registers all sync task-related API routes
 */

import type { FastifyInstance } from 'fastify';
import { SyncTaskController } from '../controllers/sync-task.controller.js';
import { requireAuth, requireTenantOrGlobalAdmin } from '../middleware/authorization.js';

export async function registerSyncTaskRoutes(server: FastifyInstance): Promise<void> {
  const syncTaskService = (server as any).syncTaskService;
  const monitoring = (server as any).monitoring;

  if (!syncTaskService || !monitoring) {
    server.log.warn('⚠️  Sync task routes not registered - service or monitoring missing');
    return;
  }

  if (!(server as any).authenticate) {
    server.log.warn('⚠️  Sync task routes not registered - authentication decorator missing');
    return;
  }

  const controller = new SyncTaskController(syncTaskService, monitoring);

  // ============================================================================
  // Sync Task Routes (Authenticated users, tenant admin for create/update/delete)
  // ============================================================================

  // POST /api/v1/integrations/:integrationId/sync-tasks
  server.post(
    '/api/v1/integrations/:integrationId/sync-tasks',
    {
      schema: {
        description: 'Create a new sync task',
        tags: ['Integrations', 'Sync Tasks'],
        params: {
          type: 'object',
          required: ['integrationId'],
          properties: {
            integrationId: { type: 'string', description: 'Integration ID' },
          },
        },
        body: {
          type: 'object',
          required: ['name', 'conversionSchemaId', 'direction', 'schedule'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            conversionSchemaId: { type: 'string' },
            direction: { type: 'string', enum: ['inbound', 'outbound', 'bidirectional'] },
            schedule: {
              type: 'object',
              required: ['type'],
              properties: {
                type: { type: 'string', enum: ['manual', 'interval', 'cron'] },
                intervalSeconds: { type: 'number' },
                cronExpression: { type: 'string' },
              },
            },
            config: { type: 'object' },
            conflictResolution: {
              type: 'object',
              properties: {
                strategy: { type: 'string', enum: ['source_wins', 'target_wins', 'manual'] },
              },
            },
            retryConfig: {
              type: 'object',
              properties: {
                maxRetries: { type: 'number' },
                retryDelaySeconds: { type: 'number' },
                exponentialBackoff: { type: 'boolean' },
              },
            },
            notifications: {
              type: 'object',
              properties: {
                onSuccess: { type: 'boolean' },
                onFailure: { type: 'boolean' },
                onPartial: { type: 'boolean' },
                recipients: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        response: {
          201: {
            description: 'Sync task created',
            type: 'object',
          },
          400: {
            description: 'Bad Request',
            type: 'object',
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
          },
        },
      },
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
      ],
    },
    (request, reply) => controller.create(request as any, reply)
  );

  // GET /api/v1/integrations/:integrationId/sync-tasks
  server.get(
    '/api/v1/integrations/:integrationId/sync-tasks',
    {
      schema: {
        description: 'List sync tasks for an integration',
        tags: ['Integrations', 'Sync Tasks'],
        params: {
          type: 'object',
          required: ['integrationId'],
          properties: {
            integrationId: { type: 'string', description: 'Integration ID' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['active', 'paused', 'disabled'] },
            limit: { type: 'string' },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'List of sync tasks',
            type: 'object',
          },
        },
      },
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
      ],
    },
    (request, reply) => controller.list(request as any, reply)
  );

  // GET /api/v1/integrations/:integrationId/sync-tasks/:taskId
  server.get(
    '/api/v1/integrations/:integrationId/sync-tasks/:taskId',
    {
      schema: {
        description: 'Get a specific sync task',
        tags: ['Integrations', 'Sync Tasks'],
        params: {
          type: 'object',
          required: ['integrationId', 'taskId'],
          properties: {
            integrationId: { type: 'string', description: 'Integration ID' },
            taskId: { type: 'string', description: 'Sync task ID' },
          },
        },
        response: {
          200: {
            description: 'Sync task details',
            type: 'object',
          },
          404: {
            description: 'Not Found',
            type: 'object',
          },
        },
      },
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
      ],
    },
    (request, reply) => controller.get(request as any, reply)
  );

  // PATCH /api/v1/integrations/:integrationId/sync-tasks/:taskId
  server.patch(
    '/api/v1/integrations/:integrationId/sync-tasks/:taskId',
    {
      schema: {
        description: 'Update a sync task',
        tags: ['Integrations', 'Sync Tasks'],
        params: {
          type: 'object',
          required: ['integrationId', 'taskId'],
          properties: {
            integrationId: { type: 'string', description: 'Integration ID' },
            taskId: { type: 'string', description: 'Sync task ID' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            conversionSchemaId: { type: 'string' },
            direction: { type: 'string', enum: ['inbound', 'outbound', 'bidirectional'] },
            schedule: { type: 'object' },
            config: { type: 'object' },
            conflictResolution: { type: 'object' },
            status: { type: 'string', enum: ['active', 'paused', 'disabled'] },
            retryConfig: { type: 'object' },
            notifications: { type: 'object' },
          },
        },
        response: {
          200: {
            description: 'Sync task updated',
            type: 'object',
          },
          404: {
            description: 'Not Found',
            type: 'object',
          },
        },
      },
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
      ],
    },
    (request, reply) => controller.update(request as any, reply)
  );

  // DELETE /api/v1/integrations/:integrationId/sync-tasks/:taskId
  server.delete(
    '/api/v1/integrations/:integrationId/sync-tasks/:taskId',
    {
      schema: {
        description: 'Delete a sync task',
        tags: ['Integrations', 'Sync Tasks'],
        params: {
          type: 'object',
          required: ['integrationId', 'taskId'],
          properties: {
            integrationId: { type: 'string', description: 'Integration ID' },
            taskId: { type: 'string', description: 'Sync task ID' },
          },
        },
        response: {
          204: {
            description: 'Sync task deleted',
          },
          404: {
            description: 'Not Found',
            type: 'object',
          },
        },
      },
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireTenantOrGlobalAdmin(),
      ],
    },
    (request, reply) => controller.delete(request as any, reply)
  );

  // POST /api/v1/integrations/:integrationId/sync-tasks/:taskId/trigger
  server.post(
    '/api/v1/integrations/:integrationId/sync-tasks/:taskId/trigger',
    {
      schema: {
        description: 'Manually trigger a sync task execution',
        tags: ['Integrations', 'Sync Tasks'],
        params: {
          type: 'object',
          required: ['integrationId', 'taskId'],
          properties: {
            integrationId: { type: 'string', description: 'Integration ID' },
            taskId: { type: 'string', description: 'Sync task ID' },
          },
        },
        response: {
          200: {
            description: 'Sync execution started',
            type: 'object',
          },
          404: {
            description: 'Not Found',
            type: 'object',
          },
        },
      },
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
      ],
    },
    (request, reply) => controller.trigger(request as any, reply)
  );
}

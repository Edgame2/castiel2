/**
 * Route registration for integration-sync module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { IntegrationSyncService } from '../services/IntegrationSyncService';
import { SyncDirection, ConflictResolutionStrategy } from '../types/integration-sync.types';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const integrationSyncService = new IntegrationSyncService(fastify);

    // Get sync task status
    fastify.get<{ Params: { taskId: string } }>(
      '/api/v1/sync/tasks/:taskId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get sync task status',
          tags: ['Sync'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { taskId } = request.params;
          const tenantId = request.user!.tenantId;

          const task = await integrationSyncService.getSyncTask(taskId, tenantId);

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
          log.error('Failed to get sync task', error, { service: 'integration-sync' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'TASK_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve sync task',
            },
          });
        }
      }
    );

    // Create and trigger sync
    fastify.post<{ Body: { integrationId: string; direction: SyncDirection; entityType?: string; filters?: Record<string, any> } }>(
      '/api/v1/sync/trigger',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create and trigger synchronization',
          tags: ['Sync'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { integrationId, direction, entityType, filters } = request.body;
          const tenantId = request.user!.tenantId;

          // Create sync task
          const task = await integrationSyncService.createSyncTask(
            tenantId,
            integrationId,
            direction,
            entityType,
            filters
          );

          // Execute sync (async)
          integrationSyncService.executeSyncTask(task.taskId, tenantId).catch((error: unknown) => {
            log.error('Sync execution failed', error instanceof Error ? error : new Error(String(error)), { taskId: task.taskId, tenantId, service: 'integration-sync' });
          });

          return reply.status(202).send({
            taskId: task.taskId,
            status: task.status,
            message: 'Sync task created and started',
          });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to trigger sync', error instanceof Error ? error : new Error(msg), { service: 'integration-sync' });
          return reply.status(statusCode).send({
            error: { code: 'SYNC_TRIGGER_FAILED', message: msg || 'Failed to trigger synchronization' },
          });
        }
      }
    );

    // Resolve sync conflict
    fastify.post<{ Params: { conflictId: string }; Body: { resolution: ConflictResolutionStrategy } }>(
      '/api/v1/sync/conflicts/:conflictId/resolve',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Resolve sync conflict',
          tags: ['Sync'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { conflictId } = request.params;
          const { resolution } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          const conflict = await integrationSyncService.resolveConflict(
            conflictId,
            tenantId,
            resolution,
            userId
          );

          return reply.send(conflict);
        } catch (error: any) {
          log.error('Failed to resolve conflict', error, { service: 'integration-sync' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'CONFLICT_RESOLUTION_FAILED',
              message: error.message || 'Failed to resolve conflict',
            },
          });
        }
      }
    );

    // ===== WEBHOOK ROUTES =====

    // Create webhook
    fastify.post<{ Body: { integrationId: string; url: string; events: string[]; secret?: string } }>(
      '/api/v1/webhooks',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create webhook',
          tags: ['Webhooks'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { integrationId, url, events, secret } = request.body;
          const tenantId = request.user!.tenantId;

          const webhook = await integrationSyncService.createWebhook(
            tenantId,
            integrationId,
            url,
            events,
            secret
          );

          return reply.status(201).send(webhook);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to create webhook', error instanceof Error ? error : new Error(msg), { service: 'integration-sync' });
          return reply.status(statusCode).send({
            error: { code: 'WEBHOOK_CREATION_FAILED', message: msg || 'Failed to create webhook' },
          });
        }
      }
    );

    // Get webhook
    fastify.get<{ Params: { webhookId: string } }>(
      '/api/v1/webhooks/:webhookId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get webhook by ID',
          tags: ['Webhooks'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { webhookId } = request.params;
          const tenantId = request.user!.tenantId;

          const webhook = await integrationSyncService.getWebhook(webhookId, tenantId);

          if (!webhook) {
            return reply.status(404).send({
              error: {
                code: 'WEBHOOK_NOT_FOUND',
                message: 'Webhook not found',
              },
            });
          }

          return reply.send(webhook);
        } catch (error: any) {
          log.error('Failed to get webhook', error, { service: 'integration-sync' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'WEBHOOK_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve webhook',
            },
          });
        }
      }
    );

    // List webhooks for integration
    fastify.get<{ Params: { integrationId: string } }>(
      '/api/v1/integrations/:integrationId/webhooks',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List webhooks for integration',
          tags: ['Webhooks'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { integrationId } = request.params;
          const tenantId = request.user!.tenantId;

          const webhooks = await integrationSyncService.listWebhooks(integrationId, tenantId);

          return reply.send(webhooks);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to list webhooks', error instanceof Error ? error : new Error(msg), { service: 'integration-sync' });
          return reply.status(statusCode).send({
            error: { code: 'WEBHOOK_LIST_FAILED', message: msg || 'Failed to list webhooks' },
          });
        }
      }
    );

    // Update webhook
    fastify.put<{ Params: { webhookId: string }; Body: { url?: string; events?: string[]; active?: boolean; secret?: string } }>(
      '/api/v1/webhooks/:webhookId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Update webhook',
          tags: ['Webhooks'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { webhookId } = request.params;
          const tenantId = request.user!.tenantId;

          const webhook = await integrationSyncService.updateWebhook(webhookId, tenantId, request.body);

          return reply.send(webhook);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to update webhook', error instanceof Error ? error : new Error(msg), { service: 'integration-sync' });
          return reply.status(statusCode).send({
            error: { code: 'WEBHOOK_UPDATE_FAILED', message: msg || 'Failed to update webhook' },
          });
        }
      }
    );

    // Delete webhook
    fastify.delete<{ Params: { webhookId: string } }>(
      '/api/v1/webhooks/:webhookId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Delete webhook',
          tags: ['Webhooks'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { webhookId } = request.params;
          const tenantId = request.user!.tenantId;

          await integrationSyncService.deleteWebhook(webhookId, tenantId);

          return reply.status(204).send();
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to delete webhook', error instanceof Error ? error : new Error(msg), { service: 'integration-sync' });
          return reply.status(statusCode).send({
            error: { code: 'WEBHOOK_DELETION_FAILED', message: msg || 'Failed to delete webhook' },
          });
        }
      }
    );

    log.info('Integration sync routes registered', { service: 'integration-sync' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'integration-sync' });
    throw error;
  }
}

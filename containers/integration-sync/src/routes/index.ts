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
          integrationSyncService.executeSyncTask(task.taskId, tenantId).catch((error: any) => {
            log.error('Sync execution failed', error, {
              taskId: task.taskId,
              tenantId,
              service: 'integration-sync',
            });
          });

          return reply.status(202).send({
            taskId: task.taskId,
            status: task.status,
            message: 'Sync task created and started',
          });
        } catch (error: any) {
          log.error('Failed to trigger sync', error, { service: 'integration-sync' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'SYNC_TRIGGER_FAILED',
              message: error.message || 'Failed to trigger synchronization',
            },
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

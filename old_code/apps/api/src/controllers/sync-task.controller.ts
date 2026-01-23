/**
 * Sync Task Controller
 * Handles HTTP requests for sync task management
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { SyncTaskService, type CreateSyncTaskInput, type UpdateSyncTaskInput } from '@castiel/api-core';
import { IMonitoringProvider } from '@castiel/monitoring';

export class SyncTaskController {
  constructor(
    private syncTaskService: SyncTaskService,
    private monitoring: IMonitoringProvider
  ) {}

  /**
   * POST /api/v1/integrations/:integrationId/sync-tasks
   * Create a new sync task
   */
  create = async (
    req: FastifyRequest<{ Params: { integrationId: string }; Body: Omit<CreateSyncTaskInput, 'tenantId' | 'tenantIntegrationId' | 'createdBy'> }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();
    const { integrationId } = req.params;

    try {
      const auth = req.auth || req.user;
      const userId = (auth as any)?.id || (auth as any)?.userId;
      const tenantId = (auth as any)?.tenantId;

      if (!tenantId || !userId) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user context',
        });
        return;
      }

      if (!integrationId) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'Integration ID is required',
        });
        return;
      }

      const input: CreateSyncTaskInput = {
        ...req.body,
        tenantIntegrationId: integrationId,
        tenantId,
        createdBy: userId,
      };

      const task = await this.syncTaskService.createTask(input);

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('api.sync-tasks.create.duration', duration);
      this.monitoring.trackEvent('api.sync-tasks.create.success', {
        taskId: task.id,
        integrationId,
        tenantId,
      });

      reply.status(201).send(task);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('api.sync-tasks.create.duration', duration);
      this.monitoring.trackException(error as Error, {
        operation: 'sync-tasks.create',
        integrationId,
        tenantId: (req.auth as any)?.tenantId,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create sync task',
      });
    }
  };

  /**
   * GET /api/v1/integrations/:integrationId/sync-tasks
   * List sync tasks for an integration
   */
  list = async (
    req: FastifyRequest<{ Params: { integrationId: string }; Querystring: { status?: string; limit?: string; continuationToken?: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();
    const { integrationId } = req.params;

    try {
      const auth = req.auth || req.user;
      const tenantId = (auth as any)?.tenantId;

      if (!tenantId) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant context',
        });
        return;
      }

      if (!integrationId) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'Integration ID is required',
        });
        return;
      }

      const { status, limit = '50', continuationToken } = req.query;
      const limitNum = parseInt(limit, 10);
      const validLimit = isNaN(limitNum) || limitNum < 1 ? 50 : Math.min(limitNum, 100);

      const result = await this.syncTaskService.listTasks({
        filter: {
          tenantIntegrationId: integrationId,
          tenantId,
          status: status as any,
        },
        limit: validLimit,
        offset: continuationToken ? parseInt(continuationToken, 10) : undefined,
      });

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('api.sync-tasks.list.duration', duration);

      reply.status(200).send(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('api.sync-tasks.list.duration', duration);
      this.monitoring.trackException(error as Error, {
        operation: 'sync-tasks.list',
        integrationId,
        tenantId: (req.auth as any)?.tenantId,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to list sync tasks',
      });
    }
  };

  /**
   * GET /api/v1/integrations/:integrationId/sync-tasks/:taskId
   * Get a specific sync task
   */
  get = async (
    req: FastifyRequest<{ Params: { integrationId: string; taskId: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();
    const { integrationId, taskId } = req.params;

    try {
      const auth = req.auth || req.user;
      const tenantId = (auth as any)?.tenantId;

      if (!tenantId) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant context',
        });
        return;
      }

      const task = await this.syncTaskService.getTask(taskId, tenantId);
      
      // Verify task belongs to the integration
      if (task && task.tenantIntegrationId !== integrationId) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Sync task not found',
        });
        return;
      }

      if (!task) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Sync task not found',
        });
        return;
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('api.sync-tasks.get.duration', duration);

      reply.status(200).send(task);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('api.sync-tasks.get.duration', duration);
      this.monitoring.trackException(error as Error, {
        operation: 'sync-tasks.get',
        taskId,
        integrationId,
        tenantId: (req.auth as any)?.tenantId,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to get sync task',
      });
    }
  };

  /**
   * PATCH /api/v1/integrations/:integrationId/sync-tasks/:taskId
   * Update a sync task
   */
  update = async (
    req: FastifyRequest<{ Params: { integrationId: string; taskId: string }; Body: UpdateSyncTaskInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();
    const { integrationId, taskId } = req.params;

    try {
      const auth = req.auth || req.user;
      const tenantId = (auth as any)?.tenantId;

      if (!tenantId) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant context',
        });
        return;
      }

      // Verify task belongs to the integration before updating
      const existingTask = await this.syncTaskService.getTask(taskId, tenantId);
      if (!existingTask || existingTask.tenantIntegrationId !== integrationId) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Sync task not found',
        });
        return;
      }

      const task = await this.syncTaskService.updateTask(taskId, tenantId, req.body);

      if (!task) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Sync task not found',
        });
        return;
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('api.sync-tasks.update.duration', duration);
      this.monitoring.trackEvent('api.sync-tasks.update.success', {
        taskId,
        integrationId,
        tenantId,
      });

      reply.status(200).send(task);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('api.sync-tasks.update.duration', duration);
      this.monitoring.trackException(error as Error, {
        operation: 'sync-tasks.update',
        taskId,
        integrationId,
        tenantId: (req.auth as any)?.tenantId,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update sync task',
      });
    }
  };

  /**
   * DELETE /api/v1/integrations/:integrationId/sync-tasks/:taskId
   * Delete a sync task
   */
  delete = async (
    req: FastifyRequest<{ Params: { integrationId: string; taskId: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();
    const { integrationId, taskId } = req.params;

    try {
      const auth = req.auth || req.user;
      const tenantId = (auth as any)?.tenantId;

      if (!tenantId) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant context',
        });
        return;
      }

      // Verify task belongs to the integration before deleting
      const existingTask = await this.syncTaskService.getTask(taskId, tenantId);
      if (!existingTask || existingTask.tenantIntegrationId !== integrationId) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Sync task not found',
        });
        return;
      }

      const deleted = await this.syncTaskService.deleteTask(taskId, tenantId);

      if (!deleted) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Sync task not found',
        });
        return;
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('api.sync-tasks.delete.duration', duration);
      this.monitoring.trackEvent('api.sync-tasks.delete.success', {
        taskId,
        integrationId,
        tenantId,
      });

      reply.status(204).send();
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('api.sync-tasks.delete.duration', duration);
      this.monitoring.trackException(error as Error, {
        operation: 'sync-tasks.delete',
        taskId,
        integrationId,
        tenantId: (req.auth as any)?.tenantId,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete sync task',
      });
    }
  };

  /**
   * POST /api/v1/integrations/:integrationId/sync-tasks/:taskId/trigger
   * Manually trigger a sync task execution
   */
  trigger = async (
    req: FastifyRequest<{ Params: { integrationId: string; taskId: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();
    const { integrationId, taskId } = req.params;

    try {
      const auth = req.auth || req.user;
      const userId = (auth as any)?.id || (auth as any)?.userId;
      const tenantId = (auth as any)?.tenantId;

      if (!tenantId || !userId) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user context',
        });
        return;
      }

      const execution = await this.syncTaskService.triggerSync(taskId, tenantId, userId);

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('api.sync-tasks.trigger.duration', duration);
      this.monitoring.trackEvent('api.sync-tasks.trigger.success', {
        taskId,
        executionId: execution.id,
        integrationId,
        tenantId,
      });

      reply.status(200).send(execution);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('api.sync-tasks.trigger.duration', duration);
      this.monitoring.trackException(error as Error, {
        operation: 'sync-tasks.trigger',
        taskId,
        integrationId,
        tenantId: (req.auth as any)?.tenantId,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to trigger sync task',
      });
    }
  };
}

/**
 * Sync Task Service
 * Handles sync task management and history
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer, BadRequestError, NotFoundError } from '@coder/shared';
import {
  SyncTask,
  CreateSyncTaskInput,
  SyncJobType,
  SyncStatus,
} from '../types/integration.types';

export class SyncTaskService {
  private containerName = 'integration_sync_tasks';

  /**
   * Create a new sync task
   */
  async create(input: CreateSyncTaskInput): Promise<SyncTask> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.integrationId) {
      throw new BadRequestError('integrationId is required');
    }
    if (!input.jobType) {
      throw new BadRequestError('jobType is required');
    }
    if (!input.trigger) {
      throw new BadRequestError('trigger is required');
    }

    // Verify integration exists and start actual sync job (async) when wired
    const task: SyncTask = {
      id: uuidv4(),
      tenantId: input.tenantId,
      integrationId: input.integrationId,
      providerName: '', // Will be populated from integration
      jobId: uuidv4(),
      jobType: input.jobType,
      trigger: input.trigger,
      triggeredBy: input.userId,
      startedAt: new Date(),
      status: SyncStatus.RUNNING,
      stats: {
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(task, {
        partitionKey: input.tenantId,
      } as Parameters<typeof container.items.create>[1]);

      if (!resource) {
        throw new Error('Failed to create sync task');
      }

      return resource as SyncTask;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Sync task with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get sync task by ID
   */
  async getById(taskId: string, tenantId: string): Promise<SyncTask> {
    if (!taskId || !tenantId) {
      throw new BadRequestError('taskId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(taskId, tenantId).read<SyncTask>();

      if (!resource) {
        throw new NotFoundError('Sync task', taskId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Sync task', taskId);
      }
      throw error;
    }
  }

  /**
   * Update sync task status
   */
  async updateStatus(
    taskId: string,
    tenantId: string,
    status: SyncStatus,
    stats?: SyncTask['stats'],
    errors?: SyncTask['errors'],
    entityStats?: SyncTask['entityStats']
  ): Promise<SyncTask> {
    const existing = await this.getById(taskId, tenantId);

    const updated: SyncTask = {
      ...existing,
      status,
      stats: stats || existing.stats,
      errors: errors || existing.errors,
      entityStats: entityStats || existing.entityStats,
      completedAt: status !== SyncStatus.RUNNING ? new Date() : undefined,
      durationMs:
        status !== SyncStatus.RUNNING && existing.startedAt
          ? Date.now() - existing.startedAt.getTime()
          : undefined,
      updatedAt: new Date(),
    };

    const container = getContainer(this.containerName);
    const { resource } = await container.item(taskId, tenantId).replace(updated);

    if (!resource) {
      throw new Error('Failed to update sync task');
    }

    return resource as SyncTask;
  }

  /**
   * List sync tasks
   */
  async list(
    tenantId: string,
    filters?: {
      integrationId?: string;
      status?: SyncStatus;
      jobType?: SyncJobType;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: SyncTask[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.integrationId) {
      query += ' AND c.integrationId = @integrationId';
      parameters.push({ name: '@integrationId', value: filters.integrationId });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    if (filters?.jobType) {
      query += ' AND c.jobType = @jobType';
      parameters.push({ name: '@jobType', value: filters.jobType });
    }

    query += ' ORDER BY c.startedAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<SyncTask>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list sync tasks: ${error.message}`);
    }
  }

  /**
   * Cancel sync task
   */
  async cancel(taskId: string, tenantId: string): Promise<SyncTask> {
    const existing = await this.getById(taskId, tenantId);

    if (existing.status !== SyncStatus.RUNNING) {
      throw new BadRequestError('Only running sync tasks can be cancelled');
    }

    return await this.updateStatus(taskId, tenantId, SyncStatus.CANCELLED);
  }
}


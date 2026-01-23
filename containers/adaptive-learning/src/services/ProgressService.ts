/**
 * Progress Service
 * Handles user progress tracking
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  UserProgress,
  UpdateProgressInput,
  ProgressStatus,
} from '../types/learning.types';

export class ProgressService {
  private containerName = 'adaptive_progress';

  /**
   * Get or create progress
   */
  async getOrCreate(
    tenantId: string,
    userId: string,
    input: {
      learningPathId?: string;
      moduleId?: string;
      skillId?: string;
    }
  ): Promise<UserProgress> {
    if (!tenantId || !userId) {
      throw new BadRequestError('tenantId and userId are required');
    }

    // Try to find existing progress
    const existing = await this.find(tenantId, userId, input);
    if (existing) {
      return existing;
    }

    // Create new progress
    const progress: UserProgress = {
      id: uuidv4(),
      tenantId,
      userId,
      learningPathId: input.learningPathId,
      moduleId: input.moduleId,
      skillId: input.skillId,
      status: ProgressStatus.NOT_STARTED,
      progress: 0,
      startedAt: new Date(),
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(progress, {
        partitionKey: tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create progress');
      }

      return resource as UserProgress;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Find progress
   */
  async find(
    tenantId: string,
    userId: string,
    input: {
      learningPathId?: string;
      moduleId?: string;
      skillId?: string;
    }
  ): Promise<UserProgress | null> {
    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId';
    const parameters: any[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@userId', value: userId },
    ];

    if (input.learningPathId) {
      query += ' AND c.learningPathId = @learningPathId';
      parameters.push({ name: '@learningPathId', value: input.learningPathId });
    }

    if (input.moduleId) {
      query += ' AND c.moduleId = @moduleId';
      parameters.push({ name: '@moduleId', value: input.moduleId });
    }

    if (input.skillId) {
      query += ' AND c.skillId = @skillId';
      parameters.push({ name: '@skillId', value: input.skillId });
    }

    try {
      const { resources } = await container.items
        .query<UserProgress>({
          query,
          parameters,
        })
        .fetchNext();

      return resources.length > 0 ? resources[0] : null;
    } catch (error: any) {
      throw new Error(`Failed to find progress: ${error.message}`);
    }
  }

  /**
   * Update progress
   */
  async update(
    progressId: string,
    tenantId: string,
    input: UpdateProgressInput
  ): Promise<UserProgress> {
    try {
      const container = getContainer(this.containerName);
      const { resource: existing } = await container.item(progressId, tenantId).read<UserProgress>();

      if (!existing) {
        throw new NotFoundError(`Progress ${progressId} not found`);
      }

      const updated: UserProgress = {
        ...existing,
        ...input,
        lastAccessedAt: new Date(),
        updatedAt: new Date(),
      };

      // Update status based on progress
      if (input.progress !== undefined) {
        if (input.progress >= 100) {
          updated.status = ProgressStatus.COMPLETED;
          updated.completedAt = new Date();
        } else if (input.progress > 0 && existing.status === ProgressStatus.NOT_STARTED) {
          updated.status = ProgressStatus.IN_PROGRESS;
        }
      }

      if (input.status) {
        updated.status = input.status;
        if (input.status === ProgressStatus.COMPLETED && !updated.completedAt) {
          updated.completedAt = new Date();
        }
      }

      const { resource } = await container.item(progressId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update progress');
      }

      return resource as UserProgress;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Progress ${progressId} not found`);
      }
      throw error;
    }
  }

  /**
   * List user progress
   */
  async list(
    tenantId: string,
    userId: string,
    filters?: {
      learningPathId?: string;
      status?: ProgressStatus;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: UserProgress[]; continuationToken?: string }> {
    if (!tenantId || !userId) {
      throw new BadRequestError('tenantId and userId are required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId';
    const parameters: any[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@userId', value: userId },
    ];

    if (filters?.learningPathId) {
      query += ' AND c.learningPathId = @learningPathId';
      parameters.push({ name: '@learningPathId', value: filters.learningPathId });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    query += ' ORDER BY c.lastAccessedAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<UserProgress>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list progress: ${error.message}`);
    }
  }
}


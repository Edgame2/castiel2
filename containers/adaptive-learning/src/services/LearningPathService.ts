/**
 * Learning Path Service
 * Handles learning path management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  LearningPath,
  CreateLearningPathInput,
  UpdateLearningPathInput,
  LearningPathStatus,
  LearningModule,
  LearningResource,
} from '../types/learning.types';

export class LearningPathService {
  private containerName = 'adaptive_learning_paths';

  /**
   * Create learning path
   */
  async create(input: CreateLearningPathInput): Promise<LearningPath> {
    if (!input.tenantId || !input.name) {
      throw new BadRequestError('tenantId and name are required');
    }

    // Generate IDs for modules
    const modules: LearningModule[] = (input.modules || []).map((m, index) => ({
      id: uuidv4(),
      name: m.name,
      description: m.description,
      content: m.content,
      order: m.order || index + 1,
      estimatedDuration: m.estimatedDuration,
      skills: m.skills || [],
      resources: m.resources?.map((r) => ({ ...r, id: uuidv4() } as LearningResource)),
      assessments: [],
    }));

    const learningPath: LearningPath = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      category: input.category,
      status: LearningPathStatus.DRAFT,
      skills: input.skills || [],
      modules,
      estimatedDuration: input.estimatedDuration,
      difficulty: input.difficulty,
      prerequisites: input.prerequisites || [],
      tags: input.tags || [],
      metadata: input.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(learningPath, {
        partitionKey: input.tenantId,
      } as Parameters<typeof container.items.create>[1]);

      if (!resource) {
        throw new Error('Failed to create learning path');
      }

      return resource as LearningPath;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Learning path with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get learning path by ID
   */
  async getById(pathId: string, tenantId: string): Promise<LearningPath> {
    if (!pathId || !tenantId) {
      throw new BadRequestError('pathId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(pathId, tenantId).read<LearningPath>();

      if (!resource) {
        throw new NotFoundError('Learning path', pathId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Learning path', pathId);
      }
      throw error;
    }
  }

  /**
   * Update learning path
   */
  async update(
    pathId: string,
    tenantId: string,
    input: UpdateLearningPathInput
  ): Promise<LearningPath> {
    const existing = await this.getById(pathId, tenantId);

    const updated: LearningPath = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(pathId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update learning path');
      }

      return resource as LearningPath;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Learning path', pathId);
      }
      throw error;
    }
  }

  /**
   * Delete learning path
   */
  async delete(pathId: string, tenantId: string): Promise<void> {
    await this.getById(pathId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(pathId, tenantId).delete();
  }

  /**
   * List learning paths
   */
  async list(
    tenantId: string,
    filters?: {
      status?: LearningPathStatus;
      category?: string;
      difficulty?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: LearningPath[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    if (filters?.category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: filters.category });
    }

    if (filters?.difficulty) {
      query += ' AND c.difficulty = @difficulty';
      parameters.push({ name: '@difficulty', value: filters.difficulty });
    }

    query += ' ORDER BY c.name ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<LearningPath>({ query, parameters }, { partitionKey: tenantId } as Record<string, unknown>)
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list learning paths: ${error.message}`);
    }
  }
}


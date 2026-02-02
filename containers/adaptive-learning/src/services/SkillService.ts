/**
 * Skill Service
 * Handles skill management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  Skill,
  CreateSkillInput,
  SkillLevel,
} from '../types/learning.types';

export class SkillService {
  private containerName = 'adaptive_skills';

  /**
   * Create skill
   */
  async create(input: CreateSkillInput): Promise<Skill> {
    if (!input.tenantId || !input.name) {
      throw new BadRequestError('tenantId and name are required');
    }

    const skill: Skill = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      category: input.category,
      level: input.level,
      parentSkillId: input.parentSkillId,
      tags: input.tags || [],
      metadata: input.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(skill, {
        partitionKey: input.tenantId,
      } as Parameters<typeof container.items.create>[1]);

      if (!resource) {
        throw new Error('Failed to create skill');
      }

      return resource as Skill;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Skill with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get skill by ID
   */
  async getById(skillId: string, tenantId: string): Promise<Skill> {
    if (!skillId || !tenantId) {
      throw new BadRequestError('skillId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(skillId, tenantId).read<Skill>();

      if (!resource) {
        throw new NotFoundError('Skill', skillId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Skill', skillId);
      }
      throw error;
    }
  }

  /**
   * Update skill
   */
  async update(
    skillId: string,
    tenantId: string,
    input: Partial<Omit<Skill, 'id' | 'tenantId' | 'createdAt' | 'createdBy' | '_rid' | '_self' | '_etag' | '_ts'>>
  ): Promise<Skill> {
    const existing = await this.getById(skillId, tenantId);

    const updated: Skill = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(skillId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update skill');
      }

      return resource as Skill;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Skill', skillId);
      }
      throw error;
    }
  }

  /**
   * Delete skill
   */
  async delete(skillId: string, tenantId: string): Promise<void> {
    await this.getById(skillId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(skillId, tenantId).delete();
  }

  /**
   * List skills
   */
  async list(
    tenantId: string,
    filters?: {
      category?: string;
      level?: SkillLevel;
      parentSkillId?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Skill[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: filters.category });
    }

    if (filters?.level) {
      query += ' AND c.level = @level';
      parameters.push({ name: '@level', value: filters.level });
    }

    if (filters?.parentSkillId !== undefined) {
      if (filters.parentSkillId) {
        query += ' AND c.parentSkillId = @parentSkillId';
        parameters.push({ name: '@parentSkillId', value: filters.parentSkillId });
      } else {
        query += ' AND (c.parentSkillId = null OR c.parentSkillId = undefined)';
      }
    }

    query += ' ORDER BY c.name ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Skill>({ query, parameters }, { partitionKey: tenantId } as Record<string, unknown>)
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list skills: ${error.message}`);
    }
  }
}


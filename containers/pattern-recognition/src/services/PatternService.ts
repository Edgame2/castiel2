/**
 * Pattern Service
 * Handles pattern CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  Pattern,
  CreatePatternInput,
  UpdatePatternInput,
  PatternType,
  PatternCategory,
  PatternMatchSeverity,
} from '../types/pattern.types';

export class PatternService {
  private containerName = 'pattern_patterns';

  /**
   * Create pattern
   */
  async create(input: CreatePatternInput): Promise<Pattern> {
    if (!input.tenantId || !input.name || !input.type || !input.patternDefinition) {
      throw new BadRequestError('tenantId, name, type, and patternDefinition are required');
    }

    const pattern: Pattern = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      category: input.category,
      language: input.language,
      patternDefinition: input.patternDefinition,
      metadata: {
        ...input.metadata,
        version: input.metadata?.version || '1.0.0',
      },
      enforcement: {
        enabled: input.enforcement?.enabled !== false,
        severity: input.enforcement?.severity || PatternMatchSeverity.MEDIUM,
        autoFix: input.enforcement?.autoFix || false,
        fixTemplate: input.enforcement?.fixTemplate,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(pattern, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create pattern');
      }

      return resource as Pattern;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Pattern with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get pattern by ID
   */
  async getById(patternId: string, tenantId: string): Promise<Pattern> {
    if (!patternId || !tenantId) {
      throw new BadRequestError('patternId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(patternId, tenantId).read<Pattern>();

      if (!resource) {
        throw new NotFoundError(`Pattern ${patternId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Pattern ${patternId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update pattern
   */
  async update(
    patternId: string,
    tenantId: string,
    input: UpdatePatternInput
  ): Promise<Pattern> {
    const existing = await this.getById(patternId, tenantId);

    const updated: Pattern = {
      ...existing,
      ...input,
      patternDefinition: input.patternDefinition
        ? { ...existing.patternDefinition, ...input.patternDefinition }
        : existing.patternDefinition,
      metadata: {
        ...existing.metadata,
        ...input.metadata,
      },
      enforcement: input.enforcement
        ? { ...existing.enforcement, ...input.enforcement }
        : existing.enforcement,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(patternId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update pattern');
      }

      return resource as Pattern;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Pattern ${patternId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete pattern
   */
  async delete(patternId: string, tenantId: string): Promise<void> {
    await this.getById(patternId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(patternId, tenantId).delete();
  }

  /**
   * List patterns
   */
  async list(
    tenantId: string,
    filters?: {
      type?: PatternType;
      category?: PatternCategory;
      language?: string;
      enabled?: boolean;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Pattern[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: filters.type });
    }

    if (filters?.category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: filters.category });
    }

    if (filters?.language) {
      query += ' AND c.language = @language';
      parameters.push({ name: '@language', value: filters.language });
    }

    if (filters?.enabled !== undefined) {
      query += ' AND c.enforcement.enabled = @enabled';
      parameters.push({ name: '@enabled', value: filters.enabled });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Pattern>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list patterns: ${error.message}`);
    }
  }

  /**
   * Get enabled patterns for scanning
   */
  async getEnabledPatterns(
    tenantId: string,
    patternTypes?: PatternType[],
    language?: string
  ): Promise<Pattern[]> {
    const filters: any = { enabled: true };
    if (patternTypes && patternTypes.length > 0) {
      const { items } = await this.list(tenantId, { ...filters, language });
      return items.filter((pattern) => patternTypes.includes(pattern.type));
    }

    const { items } = await this.list(tenantId, { ...filters, language });
    return items;
  }
}


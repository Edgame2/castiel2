/**
 * ShardType Service
 * Handles shard type (schema) management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  ShardType,
  CreateShardTypeInput,
  UpdateShardTypeInput,
} from '../types/shard.types';

export class ShardTypeService {
  private containerName = 'shard_types';

  /**
   * Create a new shard type
   */
  async create(input: CreateShardTypeInput): Promise<ShardType> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.name) {
      throw new BadRequestError('name is required');
    }
    if (!input.schema) {
      throw new BadRequestError('schema is required');
    }

    // TODO: Validate JSON Schema format

    const shardType: ShardType = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      schema: input.schema,
      displayConfig: input.displayConfig,
      isSystem: input.isSystem || false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.createdBy,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(shardType, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create shard type');
      }

      return resource as ShardType;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Shard type with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Get shard type by ID
   */
  async getById(shardTypeId: string, tenantId: string): Promise<ShardType> {
    if (!shardTypeId || !tenantId) {
      throw new BadRequestError('shardTypeId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(shardTypeId, tenantId).read<ShardType>();

      if (!resource) {
        throw new NotFoundError(`Shard type ${shardTypeId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Shard type ${shardTypeId} not found`);
      }
      throw error;
    }
  }

  /**
   * Get shard type by name
   */
  async getByName(name: string, tenantId: string): Promise<ShardType | null> {
    if (!name || !tenantId) {
      throw new BadRequestError('name and tenantId are required');
    }

    const container = getContainer(this.containerName);
    const { resources } = await container.items
      .query<ShardType>({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.name = @name',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@name', value: name },
        ],
      })
      .fetchAll();

    return resources.length > 0 ? resources[0] : null;
  }

  /**
   * Update shard type
   */
  async update(
    shardTypeId: string,
    tenantId: string,
    input: UpdateShardTypeInput
  ): Promise<ShardType> {
    const existing = await this.getById(shardTypeId, tenantId);

    if (!existing.isActive && input.isActive === false) {
      // Already inactive
      return existing;
    }

    const updated: ShardType = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(shardTypeId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update shard type');
      }

      return resource as ShardType;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Shard type ${shardTypeId} not found`);
      }
      throw error;
    }
  }

  /**
   * List shard types
   */
  async list(
    tenantId: string,
    filters?: {
      isActive?: boolean;
      isSystem?: boolean;
      limit?: number;
    }
  ): Promise<ShardType[]> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.isActive !== undefined) {
      query += ' AND c.isActive = @isActive';
      parameters.push({ name: '@isActive', value: filters.isActive });
    }

    if (filters?.isSystem !== undefined) {
      query += ' AND c.isSystem = @isSystem';
      parameters.push({ name: '@isSystem', value: filters.isSystem });
    }

    query += ' ORDER BY c.name ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources } = await container.items
        .query<ShardType>({
          query,
          parameters,
        })
        .fetchNext();

      return resources.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to list shard types: ${error.message}`);
    }
  }

  /**
   * Delete shard type (deactivate)
   */
  async delete(shardTypeId: string, tenantId: string): Promise<void> {
    const existing = await this.getById(shardTypeId, tenantId);

    if (existing.isSystem) {
      throw new BadRequestError('Cannot delete system shard type');
    }

    // Deactivate instead of deleting
    await this.update(shardTypeId, tenantId, {
      isActive: false,
    });
  }
}


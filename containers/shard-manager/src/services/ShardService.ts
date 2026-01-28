/**
 * Shard Service
 * Handles shard CRUD operations with tenant isolation
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '@coder/shared/utils/errors';
import {
  Shard,
  CreateShardInput,
  UpdateShardInput,
  ShardStatus,
  PermissionLevel,
  ShardSource,
} from '../types/shard.types';
import { publishShardEvent } from '../events/publishers/ShardEventPublisher';

export class ShardService {
  private containerName = 'shard_shards';

  /**
   * Create a new shard
   */
  async create(input: CreateShardInput): Promise<Shard> {
    // Validate tenantId
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    // Validate shardTypeId
    if (!input.shardTypeId) {
      throw new BadRequestError('shardTypeId is required');
    }

    // TODO: Validate shardTypeId exists and is active
    // TODO: Validate structuredData against ShardType schema

    const shard: Shard = {
      id: uuidv4(),
      tenantId: input.tenantId,
      userId: input.userId,
      shardTypeId: input.shardTypeId,
      shardTypeName: input.shardTypeName,
      parentShardId: input.parentShardId,
      structuredData: input.structuredData,
      unstructuredData: input.unstructuredData,
      metadata: input.metadata,
      internal_relationships: input.internal_relationships || [],
      external_relationships: input.external_relationships || [],
      acl: input.acl || [
        {
          userId: input.userId,
          permissions: [
            PermissionLevel.READ,
            PermissionLevel.WRITE,
            PermissionLevel.DELETE,
            PermissionLevel.ADMIN,
          ],
          grantedBy: input.userId,
          grantedAt: new Date(),
        },
      ],
      enrichment: input.enrichment
        ? {
            config: input.enrichment,
          }
        : undefined,
      vectors: [],
      revisionId: uuidv4(),
      revisionNumber: 1,
      status: input.status || ShardStatus.ACTIVE,
      schemaVersion: 1,
      source: input.source || ShardSource.API,
      sourceDetails: input.sourceDetails,
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(shard, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create shard');
      }

      // Publish shard.created event
      await publishShardEvent('shard.created', input.tenantId, {
        shardId: resource.id,
        shardTypeId: resource.shardTypeId,
        shardTypeName: resource.shardTypeName,
        opportunityId: resource.structuredData?.opportunityId || resource.structuredData?.id,
      }, {
        userId: input.userId,
      });

      return resource as Shard;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Shard with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get shard by ID
   */
  async getById(shardId: string, tenantId: string): Promise<Shard> {
    if (!shardId || !tenantId) {
      throw new BadRequestError('shardId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(shardId, tenantId).read<Shard>();

      if (!resource) {
        throw new NotFoundError(`Shard ${shardId} not found`);
      }

      // Check if deleted
      if (resource.deletedAt) {
        throw new NotFoundError(`Shard ${shardId} has been deleted`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Shard ${shardId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update shard
   */
  async update(shardId: string, tenantId: string, input: UpdateShardInput): Promise<Shard> {
    // Get existing shard
    const existing = await this.getById(shardId, tenantId);

    // Check if archived or deleted
    if (existing.status === ShardStatus.ARCHIVED) {
      throw new ForbiddenError('Cannot update archived shard');
    }
    if (existing.deletedAt) {
      throw new ForbiddenError('Cannot update deleted shard');
    }

    // Create new revision
    const updated: Shard = {
      ...existing,
      ...input,
      revisionId: uuidv4(),
      revisionNumber: existing.revisionNumber + 1,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    };

    // Preserve system fields
    if (input.structuredData) {
      updated.structuredData = input.structuredData;
    }
    if (input.unstructuredData !== undefined) {
      updated.unstructuredData = input.unstructuredData;
    }
    if (input.metadata) {
      updated.metadata = { ...existing.metadata, ...input.metadata };
    }
    if (input.internal_relationships) {
      updated.internal_relationships = input.internal_relationships;
    }
    if (input.external_relationships) {
      updated.external_relationships = input.external_relationships;
    }
    if (input.acl) {
      updated.acl = input.acl;
    }
    if (input.status) {
      updated.status = input.status;
      if (input.status === ShardStatus.ARCHIVED) {
        updated.archivedAt = new Date();
      }
    }
    if (input.parentShardId !== undefined) {
      updated.parentShardId = input.parentShardId;
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(shardId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update shard');
      }

      // Publish shard.updated event
      await publishShardEvent('shard.updated', tenantId, {
        shardId: resource.id,
        shardTypeId: resource.shardTypeId,
        shardTypeName: resource.shardTypeName,
        opportunityId: resource.structuredData?.opportunityId || resource.structuredData?.id,
      }, {
        userId: input.userId,
      });

      return resource as Shard;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Shard ${shardId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete shard (soft delete)
   */
  async delete(shardId: string, tenantId: string): Promise<void> {
    const existing = await this.getById(shardId, tenantId);

    if (existing.deletedAt) {
      return; // Already deleted
    }

    await this.update(shardId, tenantId, {
      status: ShardStatus.DELETED,
      metadata: {
        ...existing.metadata,
      },
    });

    // Set deletedAt timestamp
    const container = getContainer(this.containerName);
    const deleted: Shard = {
      ...existing,
      status: ShardStatus.DELETED,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };

    await container.item(shardId, tenantId).replace(deleted);

    // Publish shard.deleted event
    await publishShardEvent('shard.deleted', tenantId, {
      shardId: existing.id,
      shardTypeId: existing.shardTypeId,
      shardTypeName: existing.shardTypeName,
      opportunityId: existing.structuredData?.opportunityId || existing.structuredData?.id,
    });
  }

  /**
   * List shards with filtering
   */
  async list(
    tenantId: string,
    filters?: {
      shardTypeId?: string;
      shardTypeName?: string;
      status?: ShardStatus;
      parentShardId?: string;
      userId?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Shard[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';

    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    // Build query with filters
    if (filters?.shardTypeId) {
      query += ' AND c.shardTypeId = @shardTypeId';
      parameters.push({ name: '@shardTypeId', value: filters.shardTypeId });
    }

    if (filters?.shardTypeName) {
      query += ' AND c.shardTypeName = @shardTypeName';
      parameters.push({ name: '@shardTypeName', value: filters.shardTypeName });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    } else {
      // Exclude deleted by default
      query += ' AND (c.deletedAt = null OR NOT IS_DEFINED(c.deletedAt))';
    }

    if (filters?.parentShardId !== undefined) {
      if (filters.parentShardId === null) {
        query += ' AND (c.parentShardId = null OR NOT IS_DEFINED(c.parentShardId))';
      } else {
        query += ' AND c.parentShardId = @parentShardId';
        parameters.push({ name: '@parentShardId', value: filters.parentShardId });
      }
    }

    if (filters?.userId) {
      query += ' AND c.userId = @userId';
      parameters.push({ name: '@userId', value: filters.userId });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Shard>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list shards: ${error.message}`);
    }
  }
}


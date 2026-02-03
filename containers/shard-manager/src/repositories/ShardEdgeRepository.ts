/**
 * Shard Edge Repository
 * Handles Cosmos DB operations for shard relationships
 */

import { getContainer } from '@coder/shared/database';
import { log } from '@coder/shared/utils/logger';
import {
  ShardEdge,
  CreateEdgeInput,
  UpdateEdgeInput,
  EdgeQueryFilter,
  EdgeQueryOptions,
  EdgeQueryResult,
  RelationshipSummary,
  RelationshipType,
  getInverseRelationship,
  isBidirectional,
} from '../types/shard-edge.types';
import { v4 as uuidv4 } from 'uuid';

export class ShardEdgeRepository {
  private containerName = 'shard_relationships';

  /**
   * Get container instance
   */
  private async getContainer() {
    return getContainer(this.containerName);
  }

  /**
   * Initialize container (called during service initialization)
   */
  async ensureContainer(): Promise<void> {
    try {
      await this.getContainer();
      log.info('Shard edge container ensured', { service: 'shard-manager' });
    } catch (error: any) {
      log.error('Failed to ensure shard edge container', error, { service: 'shard-manager' });
      throw error;
    }
  }

  /**
   * Create an edge
   */
  async create(input: CreateEdgeInput): Promise<ShardEdge> {
    try {
      const container = await this.getContainer();

      const edge: ShardEdge = {
        id: uuidv4(),
        tenantId: input.tenantId,
        sourceShardId: input.sourceShardId,
        sourceShardTypeId: input.sourceShardTypeId || '',
        sourceShardTypeName: input.sourceShardTypeName || '',
        targetShardId: input.targetShardId,
        targetShardTypeId: input.targetShardTypeId || '',
        targetShardTypeName: input.targetShardTypeName || '',
        relationshipType: input.relationshipType,
        label: input.label,
        weight: input.weight ?? 1,
        bidirectional: input.bidirectional ?? isBidirectional(input.relationshipType as RelationshipType),
        metadata: input.metadata,
        order: input.order,
        createdAt: new Date(),
        createdBy: input.createdBy,
      };

      const { resource } = await container.items.create<ShardEdge>(edge);

      // Create inverse edge if bidirectional
      if (edge.bidirectional) {
        const inverseType = getInverseRelationship(input.relationshipType as RelationshipType);
        if (inverseType && inverseType !== input.relationshipType) {
          const inverseEdge: ShardEdge = {
            id: uuidv4(),
            tenantId: input.tenantId,
            sourceShardId: input.targetShardId,
            sourceShardTypeId: input.targetShardTypeId || '',
            sourceShardTypeName: input.targetShardTypeName || '',
            targetShardId: input.sourceShardId,
            targetShardTypeId: input.sourceShardTypeId || '',
            targetShardTypeName: input.sourceShardTypeName || '',
            relationshipType: inverseType,
            label: input.label,
            weight: input.weight ?? 1,
            bidirectional: true,
            inverseEdgeId: edge.id,
            metadata: input.metadata,
            order: input.order,
            createdAt: new Date(),
            createdBy: input.createdBy,
          };

          const { resource: inverseResource } = await container.items.create<ShardEdge>(inverseEdge);
          
          // Update original edge with inverse reference
          if (inverseResource) {
            edge.inverseEdgeId = inverseResource.id;
            await container.item(edge.id, input.tenantId).replace<ShardEdge>({
              ...edge,
              inverseEdgeId: inverseResource.id,
            });
          }
        }
      }

      return resource as ShardEdge;
    } catch (error: any) {
      log.error('Failed to create shard edge', error, {
        service: 'shard-manager',
        tenantId: input.tenantId,
      });
      throw error;
    }
  }

  /**
   * Find edge by ID
   */
  async findById(id: string, tenantId: string): Promise<ShardEdge | undefined> {
    try {
      const container = await this.getContainer();
      const { resource } = await container.item(id, tenantId).read<ShardEdge>();
      return resource;
    } catch (error: any) {
      if (error.code === 404) {
        return undefined;
      }
      log.error('Failed to find shard edge by ID', error, {
        service: 'shard-manager',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Find edge between two shards
   */
  async findBetween(
    tenantId: string,
    sourceShardId: string,
    targetShardId: string,
    relationshipType?: string
  ): Promise<ShardEdge | undefined> {
    try {
      const container = await this.getContainer();
      
      let query = `
        SELECT * FROM e 
        WHERE e.tenantId = @tenantId 
          AND e.sourceShardId = @sourceShardId
          AND e.targetShardId = @targetShardId
      `;
      const parameters: { name: string; value: any }[] = [
        { name: '@tenantId', value: tenantId },
        { name: '@sourceShardId', value: sourceShardId },
        { name: '@targetShardId', value: targetShardId },
      ];

      if (relationshipType) {
        query += ' AND e.relationshipType = @relationshipType';
        parameters.push({ name: '@relationshipType', value: relationshipType });
      }

      const { resources } = await container.items
        .query<ShardEdge>({ query, parameters })
        .fetchAll();

      return resources[0];
    } catch (error: any) {
      log.error('Failed to find edge between shards', error, {
        service: 'shard-manager',
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Get outgoing edges from a shard
   */
  async getOutgoing(
    tenantId: string,
    sourceShardId: string,
    options?: {
      relationshipType?: string;
      targetShardTypeId?: string;
      limit?: number;
      orderBy?: 'createdAt' | 'weight' | 'order';
    }
  ): Promise<ShardEdge[]> {
    try {
      const container = await this.getContainer();
      
      const queryParts: string[] = [
        'e.tenantId = @tenantId',
        'e.sourceShardId = @sourceShardId',
      ];
      const parameters: { name: string; value: any }[] = [
        { name: '@tenantId', value: tenantId },
        { name: '@sourceShardId', value: sourceShardId },
      ];

      if (options?.relationshipType) {
        queryParts.push('e.relationshipType = @relationshipType');
        parameters.push({ name: '@relationshipType', value: options.relationshipType });
      }

      if (options?.targetShardTypeId) {
        queryParts.push('e.targetShardTypeId = @targetShardTypeId');
        parameters.push({ name: '@targetShardTypeId', value: options.targetShardTypeId });
      }

      const orderBy = options?.orderBy || 'createdAt';
      const query = `
        SELECT * FROM e 
        WHERE ${queryParts.join(' AND ')}
        ORDER BY e.${orderBy} DESC
      `;

      const { resources } = await container.items
        .query<ShardEdge>({ query, parameters }, { maxItemCount: options?.limit || 100 })
        .fetchAll();

      return resources;
    } catch (error: any) {
      log.error('Failed to get outgoing edges', error, {
        service: 'shard-manager',
        tenantId,
        sourceShardId,
      });
      throw error;
    }
  }

  /**
   * Get incoming edges to a shard
   */
  async getIncoming(
    tenantId: string,
    targetShardId: string,
    options?: {
      relationshipType?: string;
      sourceShardTypeId?: string;
      limit?: number;
      orderBy?: 'createdAt' | 'weight' | 'order';
    }
  ): Promise<ShardEdge[]> {
    try {
      const container = await this.getContainer();
      
      const queryParts: string[] = [
        'e.tenantId = @tenantId',
        'e.targetShardId = @targetShardId',
      ];
      const parameters: { name: string; value: any }[] = [
        { name: '@tenantId', value: tenantId },
        { name: '@targetShardId', value: targetShardId },
      ];

      if (options?.relationshipType) {
        queryParts.push('e.relationshipType = @relationshipType');
        parameters.push({ name: '@relationshipType', value: options.relationshipType });
      }

      if (options?.sourceShardTypeId) {
        queryParts.push('e.sourceShardTypeId = @sourceShardTypeId');
        parameters.push({ name: '@sourceShardTypeId', value: options.sourceShardTypeId });
      }

      const orderBy = options?.orderBy || 'createdAt';
      const query = `
        SELECT * FROM e 
        WHERE ${queryParts.join(' AND ')}
        ORDER BY e.${orderBy} DESC
      `;

      const { resources } = await container.items
        .query<ShardEdge>({ query, parameters }, { maxItemCount: options?.limit || 100 })
        .fetchAll();

      return resources;
    } catch (error: any) {
      log.error('Failed to get incoming edges', error, {
        service: 'shard-manager',
        tenantId,
        targetShardId,
      });
      throw error;
    }
  }

  /**
   * Query edges with filters
   */
  async query(options: EdgeQueryOptions): Promise<EdgeQueryResult> {
    const { filter, limit = 50, continuationToken, orderBy = 'createdAt', orderDirection = 'desc' } = options;

    try {
      const container = await this.getContainer();
      
      const queryParts: string[] = ['e.tenantId = @tenantId'];
      const parameters: { name: string; value: any }[] = [{ name: '@tenantId', value: filter.tenantId }];

      if (filter.sourceShardId) {
        queryParts.push('e.sourceShardId = @sourceShardId');
        parameters.push({ name: '@sourceShardId', value: filter.sourceShardId });
      }

      if (filter.targetShardId) {
        queryParts.push('e.targetShardId = @targetShardId');
        parameters.push({ name: '@targetShardId', value: filter.targetShardId });
      }

      if (filter.sourceShardTypeId) {
        queryParts.push('e.sourceShardTypeId = @sourceShardTypeId');
        parameters.push({ name: '@sourceShardTypeId', value: filter.sourceShardTypeId });
      }

      if (filter.targetShardTypeId) {
        queryParts.push('e.targetShardTypeId = @targetShardTypeId');
        parameters.push({ name: '@targetShardTypeId', value: filter.targetShardTypeId });
      }

      if (filter.relationshipType) {
        queryParts.push('e.relationshipType = @relationshipType');
        parameters.push({ name: '@relationshipType', value: filter.relationshipType });
      }

      if (filter.minWeight !== undefined) {
        queryParts.push('e.weight >= @minWeight');
        parameters.push({ name: '@minWeight', value: filter.minWeight });
      }

      if (filter.maxWeight !== undefined) {
        queryParts.push('e.weight <= @maxWeight');
        parameters.push({ name: '@maxWeight', value: filter.maxWeight });
      }

      const query = `
        SELECT * FROM e 
        WHERE ${queryParts.join(' AND ')}
        ORDER BY e.${orderBy} ${orderDirection.toUpperCase()}
      `;

      const { resources, continuationToken: newContinuationToken } = await container.items
        .query<ShardEdge>({ query, parameters }, { maxItemCount: limit, continuationToken })
        .fetchNext();

      return {
        edges: resources,
        continuationToken: newContinuationToken,
        count: resources.length,
      };
    } catch (error: any) {
      log.error('Failed to query edges', error, {
        service: 'shard-manager',
        tenantId: filter.tenantId,
      });
      throw error;
    }
  }

  /**
   * Update an edge
   */
  async update(id: string, tenantId: string, input: UpdateEdgeInput): Promise<ShardEdge | null> {
    try {
      const container = await this.getContainer();
      const existing = await this.findById(id, tenantId);
      if (!existing) {
        return null;
      }

      const updated: ShardEdge = {
        ...existing,
        label: input.label ?? existing.label,
        weight: input.weight ?? existing.weight,
        metadata: input.metadata ?? existing.metadata,
        order: input.order ?? existing.order,
        updatedAt: new Date(),
        updatedBy: input.updatedBy,
      };

      const { resource } = await container.item(id, tenantId).replace<ShardEdge>(updated);
      return resource as ShardEdge;
    } catch (error: any) {
      log.error('Failed to update shard edge', error, {
        service: 'shard-manager',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Delete an edge
   */
  async delete(id: string, tenantId: string, deleteInverse: boolean = true): Promise<boolean> {
    try {
      const container = await this.getContainer();
      const existing = await this.findById(id, tenantId);
      if (!existing) {
        return false;
      }

      // Delete inverse edge if exists
      if (deleteInverse && existing.inverseEdgeId) {
        try {
          await container.item(existing.inverseEdgeId, tenantId).delete();
        } catch {
          // Ignore if inverse doesn't exist
        }
      }

      await container.item(id, tenantId).delete();
      return true;
    } catch (error: any) {
      log.error('Failed to delete shard edge', error, {
        service: 'shard-manager',
        id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Delete all edges for a shard (when shard is deleted)
   */
  async deleteAllForShard(tenantId: string, shardId: string): Promise<number> {
    try {
      const container = await this.getContainer();
      
      const query = `
        SELECT e.id FROM e 
        WHERE e.tenantId = @tenantId 
          AND (e.sourceShardId = @shardId OR e.targetShardId = @shardId)
      `;
      const parameters = [
        { name: '@tenantId', value: tenantId },
        { name: '@shardId', value: shardId },
      ];

      const { resources } = await container.items
        .query<{ id: string }>({ query, parameters })
        .fetchAll();

      let deletedCount = 0;
      for (const edge of resources) {
        try {
          await container.item(edge.id, tenantId).delete();
          deletedCount++;
        } catch {
          // Continue on error
        }
      }

      return deletedCount;
    } catch (error: any) {
      log.error('Failed to delete all edges for shard', error, {
        service: 'shard-manager',
        tenantId,
        shardId,
      });
      throw error;
    }
  }

  /**
   * Get relationship summary for a shard
   */
  async getRelationshipSummary(tenantId: string, shardId: string): Promise<RelationshipSummary> {
    try {
      const container = await this.getContainer();
      
      const outgoingQuery = `
        SELECT e.relationshipType, COUNT(1) as count 
        FROM e 
        WHERE e.tenantId = @tenantId AND e.sourceShardId = @shardId
        GROUP BY e.relationshipType
      `;

      const incomingQuery = `
        SELECT e.relationshipType, COUNT(1) as count 
        FROM e 
        WHERE e.tenantId = @tenantId AND e.targetShardId = @shardId
        GROUP BY e.relationshipType
      `;

      const parameters = [
        { name: '@tenantId', value: tenantId },
        { name: '@shardId', value: shardId },
      ];

      const [outgoingResult, incomingResult] = await Promise.all([
        container.items.query<{ relationshipType: string; count: number }>({ query: outgoingQuery, parameters }).fetchAll(),
        container.items.query<{ relationshipType: string; count: number }>({ query: incomingQuery, parameters }).fetchAll(),
      ]);

      const outgoingByType: Record<string, number> = {};
      let outgoingTotal = 0;
      for (const r of outgoingResult.resources) {
        outgoingByType[r.relationshipType] = r.count;
        outgoingTotal += r.count;
      }

      const incomingByType: Record<string, number> = {};
      let incomingTotal = 0;
      for (const r of incomingResult.resources) {
        incomingByType[r.relationshipType] = r.count;
        incomingTotal += r.count;
      }

      return {
        shardId,
        tenantId,
        outgoing: { total: outgoingTotal, byType: outgoingByType },
        incoming: { total: incomingTotal, byType: incomingByType },
      };
    } catch (error: any) {
      log.error('Failed to get relationship summary', error, {
        service: 'shard-manager',
        tenantId,
        shardId,
      });
      throw error;
    }
  }

  /**
   * Check if edge exists
   */
  async exists(
    tenantId: string,
    sourceShardId: string,
    targetShardId: string,
    relationshipType?: string
  ): Promise<boolean> {
    const edge = await this.findBetween(tenantId, sourceShardId, targetShardId, relationshipType);
    return !!edge;
  }
}

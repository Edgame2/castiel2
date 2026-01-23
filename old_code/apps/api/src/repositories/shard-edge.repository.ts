import { CosmosClient, Container, ContainerDefinition } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
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
} from '../types/shard-edge.types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cosmos DB container configuration for Shard Edges
 */
const SHARD_EDGE_CONTAINER_CONFIG: ContainerDefinition = {
  id: config.cosmosDb.containers.shardEdges,
  partitionKey: {
    paths: ['/tenantId'],
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [{ path: '/*' }],
    excludedPaths: [
      { path: '/metadata/*' },
    ],
    compositeIndexes: [
      // Find all edges FROM a shard
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/sourceShardId', order: 'ascending' },
        { path: '/createdAt', order: 'descending' },
      ],
      // Find all edges TO a shard
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/targetShardId', order: 'ascending' },
        { path: '/createdAt', order: 'descending' },
      ],
      // Find edges by type from source
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/sourceShardId', order: 'ascending' },
        { path: '/relationshipType', order: 'ascending' },
      ],
      // Find edges by type to target
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/targetShardId', order: 'ascending' },
        { path: '/relationshipType', order: 'ascending' },
      ],
      // Find edges between shard types
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/sourceShardTypeId', order: 'ascending' },
        { path: '/targetShardTypeId', order: 'ascending' },
      ],
      // Order edges by weight
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/sourceShardId', order: 'ascending' },
        { path: '/weight', order: 'descending' },
      ],
    ],
  },
};

/**
 * Shard Edge Repository
 * Handles Cosmos DB operations for shard relationships
 */
export class ShardEdgeRepository {
  private client: CosmosClient;
  private container: Container;
  private monitoring: IMonitoringProvider;

  constructor(monitoring: IMonitoringProvider) {
    this.monitoring = monitoring;
    this.client = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    });
    this.container = this.client
      .database(config.cosmosDb.databaseId)
      .container(config.cosmosDb.containers.shardEdges);
  }

  /**
   * Initialize container
   */
  async ensureContainer(): Promise<void> {
    try {
      const { database } = await this.client.databases.createIfNotExists({
        id: config.cosmosDb.databaseId,
      });

      await database.containers.createIfNotExists(SHARD_EDGE_CONTAINER_CONFIG);

      this.monitoring.trackEvent('cosmosdb.container.ensured', {
        container: config.cosmosDb.containers.shardEdges,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-edge.repository.ensureContainer',
      });
      throw error;
    }
  }

  /**
   * Create an edge
   */
  async create(input: CreateEdgeInput): Promise<ShardEdge> {
    const startTime = Date.now();

    try {
      const edge: ShardEdge = {
        id: uuidv4(),
        tenantId: input.tenantId,
        sourceShardId: input.sourceShardId,
        sourceShardTypeId: input.sourceShardTypeId,
        sourceShardTypeName: input.sourceShardTypeName,
        targetShardId: input.targetShardId,
        targetShardTypeId: input.targetShardTypeId,
        targetShardTypeName: input.targetShardTypeName,
        relationshipType: input.relationshipType,
        label: input.label,
        weight: input.weight ?? 1,
        bidirectional: input.bidirectional ?? isBidirectional(input.relationshipType as RelationshipType),
        metadata: input.metadata,
        order: input.order,
        createdAt: new Date(),
        createdBy: input.createdBy,
      };

      const { resource } = await this.container.items.create<ShardEdge>(edge);

      // Create inverse edge if bidirectional
      if (edge.bidirectional) {
        const inverseType = getInverseRelationship(input.relationshipType as RelationshipType);
        if (inverseType && inverseType !== input.relationshipType) {
          const inverseEdge: ShardEdge = {
            id: uuidv4(),
            tenantId: input.tenantId,
            sourceShardId: input.targetShardId,
            sourceShardTypeId: input.targetShardTypeId,
            sourceShardTypeName: input.targetShardTypeName,
            targetShardId: input.sourceShardId,
            targetShardTypeId: input.sourceShardTypeId,
            targetShardTypeName: input.sourceShardTypeName,
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

          const { resource: inverseResource } = await this.container.items.create<ShardEdge>(inverseEdge);
          
          // Update original edge with inverse reference
          edge.inverseEdgeId = inverseResource?.id;
          await this.container.item(edge.id, input.tenantId).replace<ShardEdge>({
            ...edge,
            inverseEdgeId: inverseResource?.id,
          });
        }
      }

      this.monitoring.trackDependency(
        'cosmosdb.shardEdge.create',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resource as ShardEdge;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-edge.repository.create',
        tenantId: input.tenantId,
      });
      throw error;
    }
  }

  /**
   * Find edge by ID
   */
  async findById(id: string, tenantId: string): Promise<ShardEdge | undefined> {
    const startTime = Date.now();

    try {
      const { resource } = await this.container.item(id, tenantId).read<ShardEdge>();

      this.monitoring.trackDependency(
        'cosmosdb.shardEdge.read',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resource;
    } catch (error: any) {
      if (error.code === 404) {return undefined;}
      this.monitoring.trackException(error as Error, {
        operation: 'shard-edge.repository.findById',
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
    const startTime = Date.now();

    try {
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

      const { resources } = await this.container.items
        .query<ShardEdge>({ query, parameters })
        .fetchAll();

      this.monitoring.trackDependency(
        'cosmosdb.shardEdge.findBetween',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resources[0];
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-edge.repository.findBetween',
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
    const startTime = Date.now();

    try {
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

      const { resources } = await this.container.items
        .query<ShardEdge>({ query, parameters }, { maxItemCount: options?.limit || 100 })
        .fetchAll();

      this.monitoring.trackDependency(
        'cosmosdb.shardEdge.getOutgoing',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resources;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-edge.repository.getOutgoing',
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
    const startTime = Date.now();

    try {
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

      const { resources } = await this.container.items
        .query<ShardEdge>({ query, parameters }, { maxItemCount: options?.limit || 100 })
        .fetchAll();

      this.monitoring.trackDependency(
        'cosmosdb.shardEdge.getIncoming',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resources;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-edge.repository.getIncoming',
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
    const startTime = Date.now();
    const { filter, limit = 50, continuationToken, orderBy = 'createdAt', orderDirection = 'desc' } = options;

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

    try {
      const { resources, continuationToken: newContinuationToken } = await this.container.items
        .query<ShardEdge>({ query, parameters }, { maxItemCount: limit, continuationToken })
        .fetchNext();

      this.monitoring.trackDependency(
        'cosmosdb.shardEdge.query',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return {
        edges: resources,
        continuationToken: newContinuationToken,
        count: resources.length,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-edge.repository.query',
        tenantId: filter.tenantId,
      });
      throw error;
    }
  }

  /**
   * Update an edge
   */
  async update(id: string, tenantId: string, input: UpdateEdgeInput): Promise<ShardEdge | null> {
    const startTime = Date.now();

    try {
      const existing = await this.findById(id, tenantId);
      if (!existing) {return null;}

      const updated: ShardEdge = {
        ...existing,
        label: input.label ?? existing.label,
        weight: input.weight ?? existing.weight,
        metadata: input.metadata ?? existing.metadata,
        order: input.order ?? existing.order,
        updatedAt: new Date(),
        updatedBy: input.updatedBy,
      };

      const { resource } = await this.container.item(id, tenantId).replace<ShardEdge>(updated);

      this.monitoring.trackDependency(
        'cosmosdb.shardEdge.update',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resource as ShardEdge;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-edge.repository.update',
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
    const startTime = Date.now();

    try {
      const existing = await this.findById(id, tenantId);
      if (!existing) {return false;}

      // Delete inverse edge if exists
      if (deleteInverse && existing.inverseEdgeId) {
        try {
          await this.container.item(existing.inverseEdgeId, tenantId).delete();
        } catch {
          // Ignore if inverse doesn't exist
        }
      }

      await this.container.item(id, tenantId).delete();

      this.monitoring.trackDependency(
        'cosmosdb.shardEdge.delete',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return true;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-edge.repository.delete',
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
    const startTime = Date.now();
    let deletedCount = 0;

    try {
      // Find all edges where shard is source or target
      const query = `
        SELECT e.id FROM e 
        WHERE e.tenantId = @tenantId 
          AND (e.sourceShardId = @shardId OR e.targetShardId = @shardId)
      `;
      const parameters = [
        { name: '@tenantId', value: tenantId },
        { name: '@shardId', value: shardId },
      ];

      const { resources } = await this.container.items
        .query<{ id: string }>({ query, parameters })
        .fetchAll();

      // Delete each edge
      for (const edge of resources) {
        try {
          await this.container.item(edge.id, tenantId).delete();
          deletedCount++;
        } catch {
          // Continue on error
        }
      }

      this.monitoring.trackDependency(
        'cosmosdb.shardEdge.deleteAllForShard',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return deletedCount;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-edge.repository.deleteAllForShard',
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
    const startTime = Date.now();

    try {
      // Outgoing summary
      const outgoingQuery = `
        SELECT e.relationshipType, COUNT(1) as count 
        FROM e 
        WHERE e.tenantId = @tenantId AND e.sourceShardId = @shardId
        GROUP BY e.relationshipType
      `;

      // Incoming summary
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
        this.container.items.query<{ relationshipType: string; count: number }>({ query: outgoingQuery, parameters }).fetchAll(),
        this.container.items.query<{ relationshipType: string; count: number }>({ query: incomingQuery, parameters }).fetchAll(),
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

      this.monitoring.trackDependency(
        'cosmosdb.shardEdge.getRelationshipSummary',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return {
        shardId,
        tenantId,
        outgoing: { total: outgoingTotal, byType: outgoingByType },
        incoming: { total: incomingTotal, byType: incomingByType },
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-edge.repository.getRelationshipSummary',
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

  /**
   * Count edges for a shard
   */
  async countForShard(
    tenantId: string,
    shardId: string,
    direction: 'outgoing' | 'incoming' | 'both' = 'both'
  ): Promise<number> {
    const startTime = Date.now();

    try {
      let query: string;
      const parameters = [
        { name: '@tenantId', value: tenantId },
        { name: '@shardId', value: shardId },
      ];

      if (direction === 'outgoing') {
        query = 'SELECT VALUE COUNT(1) FROM e WHERE e.tenantId = @tenantId AND e.sourceShardId = @shardId';
      } else if (direction === 'incoming') {
        query = 'SELECT VALUE COUNT(1) FROM e WHERE e.tenantId = @tenantId AND e.targetShardId = @shardId';
      } else {
        query = 'SELECT VALUE COUNT(1) FROM e WHERE e.tenantId = @tenantId AND (e.sourceShardId = @shardId OR e.targetShardId = @shardId)';
      }

      const { resources } = await this.container.items
        .query<number>({ query, parameters })
        .fetchAll();

      this.monitoring.trackDependency(
        'cosmosdb.shardEdge.countForShard',
        'CosmosDB',
        config.cosmosDb.endpoint,
        Date.now() - startTime,
        true
      );

      return resources[0] || 0;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-edge.repository.countForShard',
        tenantId,
        shardId,
      });
      throw error;
    }
  }
}












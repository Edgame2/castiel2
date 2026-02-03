/**
 * Shard Relationship Service
 * Handles relationship management and graph traversal
 */

import { ShardEdgeRepository } from '../repositories/ShardEdgeRepository';
import { ShardService } from './ShardService';
import {
  ShardEdge,
  CreateEdgeInput,
  UpdateEdgeInput,
  EdgeQueryOptions,
  EdgeQueryResult,
  RelationshipSummary,
  GraphData,
  GraphNode,
  GraphTraversalOptions,
  BulkEdgeInput,
  BulkEdgeResult,
  RelationshipType,
} from '../types/shard-edge.types';
import { Shard } from '../types/shard.types';
import { log } from '@coder/shared/utils/logger';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';

export class ShardRelationshipService {
  private edgeRepository: ShardEdgeRepository;
  private shardService: ShardService;

  constructor(shardService: ShardService) {
    this.shardService = shardService;
    this.edgeRepository = new ShardEdgeRepository();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.edgeRepository.ensureContainer();
    log.info('Shard relationship service initialized', { service: 'shard-manager' });
  }

  /**
   * Create a relationship between two shards
   */
  async createRelationship(input: CreateEdgeInput): Promise<ShardEdge> {
    // Validate shards exist
    const [sourceShard, targetShard] = await Promise.all([
      this.shardService.findById(input.sourceShardId, input.tenantId),
      this.shardService.findById(input.targetShardId, input.tenantId),
    ]);

    if (!sourceShard) {
      throw new NotFoundError('Source shard', input.sourceShardId);
    }
    if (!targetShard) {
      throw new NotFoundError('Target shard', input.targetShardId);
    }

    // Check for existing relationship
    const existing = await this.edgeRepository.findBetween(
      input.tenantId,
      input.sourceShardId,
      input.targetShardId,
      input.relationshipType
    );

    if (existing) {
      throw new BadRequestError(
        `Relationship already exists between ${input.sourceShardId} and ${input.targetShardId}`
      );
    }

    // Populate shard type info
    const enrichedInput: CreateEdgeInput = {
      ...input,
      sourceShardTypeId: sourceShard.shardTypeId,
      sourceShardTypeName: sourceShard.shardTypeName || sourceShard.shardTypeId,
      targetShardTypeId: targetShard.shardTypeId,
      targetShardTypeName: targetShard.shardTypeName || targetShard.shardTypeId,
    };

    const edge = await this.edgeRepository.create(enrichedInput);

    log.info('Relationship created', {
      service: 'shard-manager',
      edgeId: edge.id,
      tenantId: input.tenantId,
      relationshipType: input.relationshipType,
    });

    return edge;
  }

  /**
   * Update a relationship
   */
  async updateRelationship(
    edgeId: string,
    tenantId: string,
    input: UpdateEdgeInput
  ): Promise<ShardEdge | null> {
    const edge = await this.edgeRepository.update(edgeId, tenantId, input);
    
    if (edge) {
      log.info('Relationship updated', {
        service: 'shard-manager',
        edgeId,
        tenantId,
      });
    }

    return edge;
  }

  /**
   * Delete a relationship
   */
  async deleteRelationship(
    edgeId: string,
    tenantId: string,
    deleteInverse: boolean = true
  ): Promise<boolean> {
    const deleted = await this.edgeRepository.delete(edgeId, tenantId, deleteInverse);
    
    if (deleted) {
      log.info('Relationship deleted', {
        service: 'shard-manager',
        edgeId,
        tenantId,
      });
    }

    return deleted;
  }

  /**
   * Delete relationship by source, target, and type
   */
  async deleteRelationshipBetween(
    tenantId: string,
    sourceShardId: string,
    targetShardId: string,
    relationshipType?: string
  ): Promise<boolean> {
    const edge = await this.edgeRepository.findBetween(
      tenantId,
      sourceShardId,
      targetShardId,
      relationshipType
    );

    if (!edge) {
      return false;
    }

    return this.deleteRelationship(edge.id, tenantId);
  }

  /**
   * Get all relationships for a shard
   */
  async getRelationships(
    tenantId: string,
    shardId: string,
    direction: 'outgoing' | 'incoming' | 'both' = 'both',
    options?: {
      relationshipType?: string;
      limit?: number;
    }
  ): Promise<ShardEdge[]> {
    const results: ShardEdge[] = [];

    if (direction === 'outgoing' || direction === 'both') {
      const outgoing = await this.edgeRepository.getOutgoing(tenantId, shardId, {
        relationshipType: options?.relationshipType,
        limit: options?.limit,
      });
      results.push(...outgoing);
    }

    if (direction === 'incoming' || direction === 'both') {
      const incoming = await this.edgeRepository.getIncoming(tenantId, shardId, {
        relationshipType: options?.relationshipType,
        limit: options?.limit,
      });
      results.push(...incoming);
    }

    return results;
  }

  /**
   * Get related shards (with shard data)
   */
  async getRelatedShards(
    tenantId: string,
    shardId: string,
    direction: 'outgoing' | 'incoming' | 'both' = 'both',
    options?: {
      relationshipType?: string;
      targetShardTypeId?: string;
      limit?: number;
    }
  ): Promise<Array<{ edge: ShardEdge; shard: Shard }>> {
    const edges = await this.getRelationships(tenantId, shardId, direction, {
      relationshipType: options?.relationshipType,
      limit: options?.limit,
    });

    // Filter by target type if specified
    const filteredEdges = options?.targetShardTypeId
      ? edges.filter(e => 
          (direction === 'outgoing' || direction === 'both') && e.targetShardTypeId === options.targetShardTypeId ||
          (direction === 'incoming' || direction === 'both') && e.sourceShardTypeId === options.targetShardTypeId
        )
      : edges;

    // Get related shard IDs
    const relatedShardIds = new Set<string>();
    for (const edge of filteredEdges) {
      if (edge.sourceShardId !== shardId) {
        relatedShardIds.add(edge.sourceShardId);
      }
      if (edge.targetShardId !== shardId) {
        relatedShardIds.add(edge.targetShardId);
      }
    }

    // Fetch shards
    const shardMap = new Map<string, Shard>();
    await Promise.all(
      Array.from(relatedShardIds).map(async (id) => {
        try {
          const shard = await this.shardService.findById(id, tenantId);
          if (shard) {
            shardMap.set(id, shard);
          }
        } catch {
          // Ignore errors
        }
      })
    );

    // Combine edges with shards
    return filteredEdges
      .map(edge => {
        const relatedId = edge.sourceShardId === shardId ? edge.targetShardId : edge.sourceShardId;
        const shard = shardMap.get(relatedId);
        return shard ? { edge, shard } : null;
      })
      .filter((item): item is { edge: ShardEdge; shard: Shard } => item !== null);
  }

  /**
   * Get relationship summary for a shard
   */
  async getRelationshipSummary(tenantId: string, shardId: string): Promise<RelationshipSummary> {
    return this.edgeRepository.getRelationshipSummary(tenantId, shardId);
  }

  /**
   * Traverse relationship graph from a root shard
   */
  async traverseGraph(options: GraphTraversalOptions): Promise<GraphData> {
    const {
      tenantId,
      rootShardId,
      maxDepth = 2,
      direction = 'both',
      relationshipTypes,
      excludeShardTypes,
      includeShardTypes,
      maxNodes = 100,
    } = options;

    const visited = new Set<string>();
    const nodes: GraphNode[] = [];
    const edges: ShardEdge[] = [];

    const traverse = async (shardId: string, depth: number): Promise<void> => {
      if (depth > maxDepth || visited.has(shardId) || nodes.length >= maxNodes) {
        return;
      }

      visited.add(shardId);

      // Get shard data
      const shard = await this.shardService.findById(shardId, tenantId);
      if (!shard) {
        return;
      }

      // Check type filters
      if (excludeShardTypes?.includes(shard.shardTypeId)) {
        return;
      }
      if (includeShardTypes && !includeShardTypes.includes(shard.shardTypeId)) {
        return;
      }

      // Add node
      nodes.push({
        id: shard.id,
        shardTypeId: shard.shardTypeId,
        shardTypeName: shard.shardTypeName || shard.shardTypeId,
        label: (shard.structuredData as any)?.name || (shard.structuredData as any)?.title || shard.id,
        data: {
          status: shard.status,
          createdAt: shard.createdAt,
          structuredData: shard.structuredData,
        },
      });

      // Get relationships
      const relationshipEdges = await this.getRelationships(tenantId, shardId, direction, {
        relationshipType: relationshipTypes?.[0], // TODO: support multiple types
      });

      // Filter by relationship types if specified
      const filteredEdges = relationshipTypes
        ? relationshipEdges.filter(e => relationshipTypes.includes(e.relationshipType as RelationshipType))
        : relationshipEdges;

      // Add edges and traverse
      for (const edge of filteredEdges) {
        // Avoid duplicate edges
        if (!edges.find(e => e.id === edge.id)) {
          edges.push(edge);
        }

        // Traverse to connected shard
        const nextShardId = edge.sourceShardId === shardId ? edge.targetShardId : edge.sourceShardId;
        await traverse(nextShardId, depth + 1);
      }
    };

    await traverse(rootShardId, 0);

    log.info('Graph traversed', {
      service: 'shard-manager',
      tenantId,
      rootShardId,
      maxDepth,
      nodesCount: nodes.length,
      edgesCount: edges.length,
    });

    return {
      nodes,
      edges,
      rootNodeId: rootShardId,
      depth: maxDepth,
    };
  }

  /**
   * Find path between two shards
   */
  async findPath(
    tenantId: string,
    sourceShardId: string,
    targetShardId: string,
    maxDepth: number = 5
  ): Promise<{ found: boolean; path: ShardEdge[]; depth: number }> {
    const visited = new Set<string>();
    const queue: Array<{ shardId: string; path: ShardEdge[] }> = [
      { shardId: sourceShardId, path: [] },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.path.length > maxDepth) {
        continue;
      }
      if (visited.has(current.shardId)) {
        continue;
      }

      visited.add(current.shardId);

      // Check if we reached target
      if (current.shardId === targetShardId) {
        return { found: true, path: current.path, depth: current.path.length };
      }

      // Get connected shards
      const edges = await this.edgeRepository.getOutgoing(tenantId, current.shardId);

      for (const edge of edges) {
        if (!visited.has(edge.targetShardId)) {
          queue.push({
            shardId: edge.targetShardId,
            path: [...current.path, edge],
          });
        }
      }
    }

    return { found: false, path: [], depth: 0 };
  }

  /**
   * Bulk create relationships
   */
  async bulkCreateRelationships(
    tenantId: string,
    input: BulkEdgeInput
  ): Promise<BulkEdgeResult> {
    const result: BulkEdgeResult = {
      success: true,
      summary: { total: input.edges.length, created: 0, failed: 0 },
      results: [],
    };

    for (let i = 0; i < input.edges.length; i++) {
      const edgeInput = input.edges[i];

      try {
        // Ensure tenant ID is set
        const fullInput: CreateEdgeInput = {
          ...edgeInput,
          tenantId,
        };

        const edge = await this.createRelationship(fullInput);

        result.results.push({
          index: i,
          status: 'created',
          edgeId: edge.id,
        });
        result.summary.created++;
      } catch (error: any) {
        result.results.push({
          index: i,
          status: 'failed',
          error: error.message,
        });
        result.summary.failed++;

        if (input.options?.onError === 'abort') {
          result.success = false;
          break;
        }
      }
    }

    result.success = result.summary.failed === 0;

    log.info('Bulk relationships created', {
      service: 'shard-manager',
      tenantId,
      total: result.summary.total,
      created: result.summary.created,
      failed: result.summary.failed,
    });

    return result;
  }

  /**
   * Query edges
   */
  async queryEdges(options: EdgeQueryOptions): Promise<EdgeQueryResult> {
    return this.edgeRepository.query(options);
  }

  /**
   * Get edge by ID
   */
  async getEdge(edgeId: string, tenantId: string): Promise<ShardEdge | undefined> {
    return this.edgeRepository.findById(edgeId, tenantId);
  }

  /**
   * Check if relationship exists
   */
  async relationshipExists(
    tenantId: string,
    sourceShardId: string,
    targetShardId: string,
    relationshipType?: string
  ): Promise<boolean> {
    return this.edgeRepository.exists(tenantId, sourceShardId, targetShardId, relationshipType);
  }

  /**
   * Delete all relationships when shard is deleted
   */
  async onShardDeleted(tenantId: string, shardId: string): Promise<number> {
    const deletedCount = await this.edgeRepository.deleteAllForShard(tenantId, shardId);
    
    log.info('Relationships deleted for shard', {
      service: 'shard-manager',
      tenantId,
      shardId,
      deletedEdges: deletedCount,
    });

    return deletedCount;
  }

  /**
   * Get repository for direct access
   */
  getRepository(): ShardEdgeRepository {
    return this.edgeRepository;
  }
}

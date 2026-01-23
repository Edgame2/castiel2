import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import {
  ShardRelationshipService,
  ShardRepository,
} from '@castiel/api-core';
import {
  CreateEdgeInput,
  UpdateEdgeInput,
  RelationshipType,
  GraphTraversalOptions,
  BulkEdgeInput,
} from '../types/shard-edge.types.js';

interface AuthContext {
  tenantId: string;
  userId: string;
  roles?: string[];
}

// AuthContext declaration moved to types/fastify.d.ts

/**
 * Shard Relationship Controller
 * Handles relationship management and graph traversal endpoints
 */
export class ShardRelationshipController {
  private relationshipService: ShardRelationshipService;
  private monitoring: IMonitoringProvider;

  constructor(
    monitoring: IMonitoringProvider,
    shardRepository: ShardRepository
  ) {
    this.monitoring = monitoring;
    this.relationshipService = new ShardRelationshipService(monitoring, shardRepository);
  }

  /**
   * Initialize the controller
   */
  async initialize(): Promise<void> {
    await this.relationshipService.initialize();
  }

  /**
   * POST /api/v1/relationships
   * Create a new relationship
   */
  createRelationship = async (
    req: FastifyRequest<{
      Body: {
        sourceShardId: string;
        targetShardId: string;
        relationshipType: string;
        label?: string;
        weight?: number;
        bidirectional?: boolean;
        metadata?: Record<string, any>;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth as AuthContext | undefined;
      if (!auth || !auth.tenantId || !(auth).userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const { tenantId, userId } = auth;
      if (!tenantId || !userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { sourceShardId, targetShardId, relationshipType, label, weight, bidirectional, metadata } = req.body;

      const input: CreateEdgeInput = {
        tenantId,
        sourceShardId,
        sourceShardTypeId: '', // Will be populated by service
        sourceShardTypeName: '',
        targetShardId,
        targetShardTypeId: '',
        targetShardTypeName: '',
        relationshipType,
        label,
        weight,
        bidirectional,
        metadata,
        createdBy: userId,
      };

      const edge = await this.relationshipService.createRelationship(input);

      this.monitoring.trackMetric('api.relationships.create.duration', Date.now() - startTime);
      return reply.status(201).send(edge);
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'relationships.create' });
      
      if (error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      if (error.message.includes('already exists')) {
        return reply.status(409).send({ error: error.message });
      }
      
      return reply.status(500).send({ error: 'Failed to create relationship', details: error.message });
    }
  };

  /**
   * GET /api/v1/relationships/:id
   * Get relationship by ID
   */
  getRelationship = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId } = req.auth || {};
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const edge = await this.relationshipService.getEdge(id, tenantId);

      if (!edge) {
        return reply.status(404).send({ error: 'Relationship not found' });
      }

      return reply.status(200).send(edge);
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'relationships.get' });
      return reply.status(500).send({ error: 'Failed to get relationship', details: error.message });
    }
  };

  /**
   * PUT /api/v1/relationships/:id
   * Update a relationship
   */
  updateRelationship = async (
    req: FastifyRequest<{
      Params: { id: string };
      Body: {
        label?: string;
        weight?: number;
        metadata?: Record<string, any>;
        order?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const auth = req.auth as AuthContext | undefined;
      if (!auth || !auth.tenantId || !(auth).userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const { tenantId, userId } = auth;
      if (!tenantId || !userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { label, weight, metadata, order } = req.body;

      const input: UpdateEdgeInput = {
        label,
        weight,
        metadata,
        order,
        updatedBy: userId,
      };

      const edge = await this.relationshipService.updateRelationship(id, tenantId, input);

      if (!edge) {
        return reply.status(404).send({ error: 'Relationship not found' });
      }

      return reply.status(200).send(edge);
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'relationships.update' });
      return reply.status(500).send({ error: 'Failed to update relationship', details: error.message });
    }
  };

  /**
   * DELETE /api/v1/relationships/:id
   * Delete a relationship
   */
  deleteRelationship = async (
    req: FastifyRequest<{ Params: { id: string }; Querystring: { deleteInverse?: boolean } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId } = req.auth || {};
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const deleteInverse = req.query.deleteInverse !== false;

      const deleted = await this.relationshipService.deleteRelationship(id, tenantId, deleteInverse);

      if (!deleted) {
        return reply.status(404).send({ error: 'Relationship not found' });
      }

      return reply.status(204).send();
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'relationships.delete' });
      return reply.status(500).send({ error: 'Failed to delete relationship', details: error.message });
    }
  };

  /**
   * GET /api/v1/shards/:shardId/relationships
   * Get all relationships for a shard
   */
  getShardRelationships = async (
    req: FastifyRequest<{
      Params: { shardId: string };
      Querystring: {
        direction?: 'outgoing' | 'incoming' | 'both';
        relationshipType?: string;
        limit?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId } = req.auth || {};
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { shardId } = req.params;
      const { direction = 'both', relationshipType, limit } = req.query;

      const edges = await this.relationshipService.getRelationships(
        tenantId,
        shardId,
        direction,
        { relationshipType, limit }
      );

      return reply.status(200).send({ relationships: edges, count: edges.length });
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'relationships.getForShard' });
      return reply.status(500).send({ error: 'Failed to get relationships', details: error.message });
    }
  };

  /**
   * GET /api/v1/shards/:shardId/related
   * Get related shards (with shard data)
   */
  getRelatedShards = async (
    req: FastifyRequest<{
      Params: { shardId: string };
      Querystring: {
        direction?: 'outgoing' | 'incoming' | 'both';
        relationshipType?: string;
        targetShardTypeId?: string;
        limit?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId } = req.auth || {};
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { shardId } = req.params;
      const { direction = 'both', relationshipType, targetShardTypeId, limit } = req.query;

      const related = await this.relationshipService.getRelatedShards(
        tenantId,
        shardId,
        direction,
        { relationshipType, targetShardTypeId, limit }
      );

      return reply.status(200).send({
        shards: related.map(r => ({
          ...r.shard,
          relationship: {
            edgeId: r.edge.id,
            type: r.edge.relationshipType,
            label: r.edge.label,
            direction: r.edge.sourceShardId === shardId ? 'outgoing' : 'incoming',
          },
        })),
        count: related.length,
      });
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'relationships.getRelatedShards' });
      return reply.status(500).send({ error: 'Failed to get related shards', details: error.message });
    }
  };

  /**
   * GET /api/v1/shards/:shardId/relationships/summary
   * Get relationship summary for a shard
   */
  getRelationshipSummary = async (
    req: FastifyRequest<{ Params: { shardId: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId } = req.auth || {};
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { shardId } = req.params;
      const summary = await this.relationshipService.getRelationshipSummary(tenantId, shardId);

      return reply.status(200).send(summary);
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'relationships.getSummary' });
      return reply.status(500).send({ error: 'Failed to get relationship summary', details: error.message });
    }
  };

  /**
   * POST /api/v1/shards/:shardId/graph
   * Traverse relationship graph
   */
  traverseGraph = async (
    req: FastifyRequest<{
      Params: { shardId: string };
      Body: {
        maxDepth?: number;
        direction?: 'outgoing' | 'incoming' | 'both';
        relationshipTypes?: string[];
        excludeShardTypes?: string[];
        includeShardTypes?: string[];
        maxNodes?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId } = req.auth || {};
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { shardId } = req.params;
      const {
        maxDepth = 2,
        direction = 'both',
        relationshipTypes,
        excludeShardTypes,
        includeShardTypes,
        maxNodes = 100,
      } = req.body;

      const options: GraphTraversalOptions = {
        tenantId,
        rootShardId: shardId,
        maxDepth,
        direction,
        relationshipTypes: relationshipTypes as RelationshipType[],
        excludeShardTypes,
        includeShardTypes,
        maxNodes,
      };

      const graph = await this.relationshipService.traverseGraph(options);

      this.monitoring.trackMetric('api.relationships.graph.duration', Date.now() - startTime);
      return reply.status(200).send(graph);
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'relationships.traverseGraph' });
      return reply.status(500).send({ error: 'Failed to traverse graph', details: error.message });
    }
  };

  /**
   * POST /api/v1/relationships/path
   * Find path between two shards
   */
  findPath = async (
    req: FastifyRequest<{
      Body: {
        sourceShardId: string;
        targetShardId: string;
        maxDepth?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId } = req.auth || {};
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { sourceShardId, targetShardId, maxDepth = 5 } = req.body;

      const result = await this.relationshipService.findPath(
        tenantId,
        sourceShardId,
        targetShardId,
        maxDepth
      );

      this.monitoring.trackMetric('api.relationships.findPath.duration', Date.now() - startTime);
      return reply.status(200).send(result);
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'relationships.findPath' });
      return reply.status(500).send({ error: 'Failed to find path', details: error.message });
    }
  };

  /**
   * POST /api/v1/relationships/bulk
   * Bulk create relationships
   */
  bulkCreateRelationships = async (
    req: FastifyRequest<{
      Body: {
        edges: Array<{
          sourceShardId: string;
          targetShardId: string;
          relationshipType: string;
          label?: string;
          weight?: number;
          metadata?: Record<string, any>;
        }>;
        options?: {
          skipInverseCreation?: boolean;
          onError?: 'continue' | 'abort';
        };
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const auth = req.auth as AuthContext | undefined;
      if (!auth || !auth.tenantId || !(auth).userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const { tenantId, userId } = auth;
      if (!tenantId || !userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { edges, options } = req.body;

      if (edges.length > 100) {
        return reply.status(400).send({ error: 'Maximum 100 edges per request' });
      }

      const input: BulkEdgeInput = {
        edges: edges.map(e => ({
          ...e,
          tenantId,
          sourceShardTypeId: '',
          sourceShardTypeName: '',
          targetShardTypeId: '',
          targetShardTypeName: '',
          createdBy: userId,
        })),
        options,
      };

      const result = await this.relationshipService.bulkCreateRelationships(tenantId, input);

      this.monitoring.trackMetric('api.relationships.bulkCreate.duration', Date.now() - startTime);
      
      const statusCode = result.success ? 201 : result.summary.created > 0 ? 207 : 400;
      return reply.status(statusCode).send(result);
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'relationships.bulkCreate' });
      return reply.status(500).send({ error: 'Bulk create failed', details: error.message });
    }
  };

  /**
   * GET /api/v1/relationships
   * Query relationships
   */
  queryRelationships = async (
    req: FastifyRequest<{
      Querystring: {
        sourceShardId?: string;
        targetShardId?: string;
        sourceShardTypeId?: string;
        targetShardTypeId?: string;
        relationshipType?: string;
        limit?: number;
        continuationToken?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId } = req.auth || {};
      if (!tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const {
        sourceShardId,
        targetShardId,
        sourceShardTypeId,
        targetShardTypeId,
        relationshipType,
        limit,
        continuationToken,
      } = req.query;

      const result = await this.relationshipService.queryEdges({
        filter: {
          tenantId,
          sourceShardId,
          targetShardId,
          sourceShardTypeId,
          targetShardTypeId,
          relationshipType,
        },
        limit,
        continuationToken,
      });

      return reply.status(200).send(result);
    } catch (error: any) {
      this.monitoring.trackException(error, { operation: 'relationships.query' });
      return reply.status(500).send({ error: 'Failed to query relationships', details: error.message });
    }
  };

  /**
   * Get the relationship service for external use
   */
  getService(): ShardRelationshipService {
    return this.relationshipService;
  }
}












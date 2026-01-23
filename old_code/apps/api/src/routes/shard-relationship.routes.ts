import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRelationshipController } from '../controllers/shard-relationship.controller.js';
import { ShardRepository } from '@castiel/api-core';
import { RelationshipType } from '../types/shard-edge.types.js';

interface ShardRelationshipRoutesOptions extends FastifyPluginOptions {
  monitoring: IMonitoringProvider;
  shardRepository: ShardRepository;
}

/**
 * Register shard relationship routes
 */
export async function shardRelationshipRoutes(
  server: FastifyInstance,
  options: ShardRelationshipRoutesOptions
): Promise<void> {
  const { monitoring, shardRepository } = options;
  const controller = new ShardRelationshipController(monitoring, shardRepository);

  await controller.initialize();

  // ===============================================
  // RELATIONSHIPS CRUD
  // ===============================================

  // Create relationship
  server.route({
    method: 'POST',
    url: '/',
    schema: {
      tags: ['Relationships'],
      summary: 'Create a new relationship',
      body: {
        type: 'object',
        required: ['sourceShardId', 'targetShardId', 'relationshipType'],
        properties: {
          sourceShardId: { type: 'string', format: 'uuid' },
          targetShardId: { type: 'string', format: 'uuid' },
          relationshipType: { type: 'string', enum: Object.values(RelationshipType) },
          label: { type: 'string' },
          weight: { type: 'number', minimum: 0 },
          bidirectional: { type: 'boolean' },
          metadata: { type: 'object' },
        },
      },
      response: {
        201: { type: 'object' },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.createRelationship,
  });

  // Get relationship by ID
  server.route({
    method: 'GET',
    url: '/:id',
    schema: {
      tags: ['Relationships'],
      summary: 'Get relationship by ID',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      response: {
        200: { type: 'object' },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.getRelationship,
  });

  // Update relationship
  server.route({
    method: 'PUT',
    url: '/:id',
    schema: {
      tags: ['Relationships'],
      summary: 'Update a relationship',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          weight: { type: 'number', minimum: 0 },
          metadata: { type: 'object' },
          order: { type: 'integer' },
        },
      },
      response: {
        200: { type: 'object' },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.updateRelationship,
  });

  // Delete relationship
  server.route({
    method: 'DELETE',
    url: '/:id',
    schema: {
      tags: ['Relationships'],
      summary: 'Delete a relationship',
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      querystring: {
        type: 'object',
        properties: {
          deleteInverse: { type: 'boolean', default: true },
        },
      },
      response: {
        204: { type: 'null' },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.deleteRelationship,
  });

  // Query relationships
  server.route({
    method: 'GET',
    url: '/',
    schema: {
      tags: ['Relationships'],
      summary: 'Query relationships',
      querystring: {
        type: 'object',
        properties: {
          sourceShardId: { type: 'string' },
          targetShardId: { type: 'string' },
          sourceShardTypeId: { type: 'string' },
          targetShardTypeId: { type: 'string' },
          relationshipType: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          continuationToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            edges: { type: 'array', items: { type: 'object' } },
            continuationToken: { type: 'string' },
            count: { type: 'integer' },
          },
        },
      },
    },
    handler: controller.queryRelationships,
  });

  // Bulk create relationships
  server.route({
    method: 'POST',
    url: '/bulk',
    schema: {
      tags: ['Relationships'],
      summary: 'Bulk create relationships',
      body: {
        type: 'object',
        required: ['edges'],
        properties: {
          edges: {
            type: 'array',
            maxItems: 100,
            items: {
              type: 'object',
              required: ['sourceShardId', 'targetShardId', 'relationshipType'],
              properties: {
                sourceShardId: { type: 'string' },
                targetShardId: { type: 'string' },
                relationshipType: { type: 'string' },
                label: { type: 'string' },
                weight: { type: 'number' },
                metadata: { type: 'object' },
              },
            },
          },
          options: {
            type: 'object',
            properties: {
              skipInverseCreation: { type: 'boolean' },
              onError: { type: 'string', enum: ['continue', 'abort'] },
            },
          },
        },
      },
      response: {
        201: { type: 'object' },
        207: { type: 'object' },
        400: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: controller.bulkCreateRelationships,
  });

  // Find path between shards
  server.route({
    method: 'POST',
    url: '/path',
    schema: {
      tags: ['Relationships'],
      summary: 'Find path between two shards',
      body: {
        type: 'object',
        required: ['sourceShardId', 'targetShardId'],
        properties: {
          sourceShardId: { type: 'string', format: 'uuid' },
          targetShardId: { type: 'string', format: 'uuid' },
          maxDepth: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            found: { type: 'boolean' },
            path: { type: 'array', items: { type: 'object' } },
            depth: { type: 'integer' },
          },
        },
      },
    },
    handler: controller.findPath,
  });
}

/**
 * Register shard-specific relationship routes
 * These are mounted under /api/v1/shards/:shardId/...
 */
export async function shardRelationshipSubRoutes(
  server: FastifyInstance,
  options: ShardRelationshipRoutesOptions
): Promise<void> {
  const { monitoring, shardRepository } = options;
  const controller = new ShardRelationshipController(monitoring, shardRepository);

  await controller.initialize();

  // Get relationships for a shard
  server.route({
    method: 'GET',
    url: '/:shardId/relationships',
    schema: {
      tags: ['Shard Relationships'],
      summary: 'Get all relationships for a shard',
      params: {
        type: 'object',
        properties: { shardId: { type: 'string', format: 'uuid' } },
        required: ['shardId'],
      },
      querystring: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['outgoing', 'incoming', 'both'], default: 'both' },
          relationshipType: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            relationships: { type: 'array', items: { type: 'object' } },
            count: { type: 'integer' },
          },
        },
      },
    },
    handler: controller.getShardRelationships,
  });

  // Get related shards
  server.route({
    method: 'GET',
    url: '/:shardId/related',
    schema: {
      tags: ['Shard Relationships'],
      summary: 'Get related shards with shard data',
      params: {
        type: 'object',
        properties: { shardId: { type: 'string', format: 'uuid' } },
        required: ['shardId'],
      },
      querystring: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['outgoing', 'incoming', 'both'], default: 'both' },
          relationshipType: { type: 'string' },
          targetShardTypeId: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            shards: { type: 'array', items: { type: 'object' } },
            count: { type: 'integer' },
          },
        },
      },
    },
    handler: controller.getRelatedShards,
  });

  // Get relationship summary
  server.route({
    method: 'GET',
    url: '/:shardId/relationships/summary',
    schema: {
      tags: ['Shard Relationships'],
      summary: 'Get relationship summary for a shard',
      params: {
        type: 'object',
        properties: { shardId: { type: 'string', format: 'uuid' } },
        required: ['shardId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            shardId: { type: 'string' },
            tenantId: { type: 'string' },
            outgoing: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                byType: { type: 'object' },
              },
            },
            incoming: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                byType: { type: 'object' },
              },
            },
          },
        },
      },
    },
    handler: controller.getRelationshipSummary,
  });

  // Traverse graph from shard
  server.route({
    method: 'POST',
    url: '/:shardId/graph',
    schema: {
      tags: ['Shard Relationships'],
      summary: 'Traverse relationship graph from shard',
      params: {
        type: 'object',
        properties: { shardId: { type: 'string', format: 'uuid' } },
        required: ['shardId'],
      },
      body: {
        type: 'object',
        properties: {
          maxDepth: { type: 'integer', minimum: 1, maximum: 5, default: 2 },
          direction: { type: 'string', enum: ['outgoing', 'incoming', 'both'], default: 'both' },
          relationshipTypes: { type: 'array', items: { type: 'string' } },
          excludeShardTypes: { type: 'array', items: { type: 'string' } },
          includeShardTypes: { type: 'array', items: { type: 'string' } },
          maxNodes: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            nodes: { type: 'array', items: { type: 'object' } },
            edges: { type: 'array', items: { type: 'object' } },
            rootNodeId: { type: 'string' },
            depth: { type: 'integer' },
          },
        },
      },
    },
    handler: controller.traverseGraph,
  });
}












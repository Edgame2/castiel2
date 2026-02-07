/**
 * Route Registration
 * Registers all shard manager routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ShardService } from '../services/ShardService';
import { ShardTypeService } from '../services/ShardTypeService';
import { ShardRelationshipService } from '../services/ShardRelationshipService';
import { ShardLinkingService } from '../services/ShardLinkingService';
import { ACLService } from '../services/ACLService';
import {
  CreateShardInput,
  UpdateShardInput,
  CreateShardTypeInput,
  UpdateShardTypeInput,
} from '../types/shard.types';
import {
  CreateEdgeInput,
  UpdateEdgeInput,
  GraphTraversalOptions,
  BulkEdgeInput,
  EdgeQueryOptions,
} from '../types/shard-edge.types';
import { CreateLinkInput, UpdateLinkInput, BulkLinkInput } from '../types/shard-linking.types';
import { PermissionCheckContext, ACLBatchCheckRequest, GrantPermissionInput, RevokePermissionInput, UpdateACLInput } from '../types/acl.types';
import { bootstrapShardTypes } from '../startup/bootstrapShardTypes';

export async function registerRoutes(fastify: FastifyInstance, config: any): Promise<void> {
  const shardService = new ShardService();
  const shardTypeService = new ShardTypeService();
  const relationshipService = new ShardRelationshipService(shardService);
  const linkingService = new ShardLinkingService(shardService);
  const aclService = new ACLService(shardService);
  
  // Initialize services
  await relationshipService.initialize();
  await linkingService.initialize();

  // Bootstrap system shard types (Phase 1.1: c_competitor, c_opportunity_competitor, c_product, product_fit, c_recommendation)
  const bootstrap = config?.bootstrap;
  if (bootstrap?.enabled && bootstrap?.tenant_id && bootstrap?.created_by) {
    try {
      await bootstrapShardTypes(shardTypeService, {
        tenant_id: bootstrap.tenant_id,
        created_by: bootstrap.created_by,
      });
    } catch (err) {
      fastify.log.warn({ err, service: 'shard-manager' }, 'Bootstrap shard types failed');
    }
  }

  // ===== SHARD ROUTES =====

  /**
   * Create a new shard
   * POST /api/v1/shards
   */
  fastify.post<{ Body: CreateShardInput }>(
    '/api/v1/shards',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new shard',
        tags: ['Shards'],
        body: {
          type: 'object',
          required: ['shardTypeId', 'structuredData'],
          properties: {
            shardTypeId: { type: 'string', format: 'uuid' },
            shardTypeName: { type: 'string' },
            parentShardId: { type: 'string', format: 'uuid' },
            structuredData: { type: 'object' },
            unstructuredData: { type: 'object' },
            metadata: { type: 'object' },
            internal_relationships: { type: 'array' },
            external_relationships: { type: 'array' },
            acl: { type: 'array' },
            status: { type: 'string', enum: ['active', 'archived', 'deleted', 'draft'] },
            source: { type: 'string', enum: ['ui', 'api', 'import', 'integration', 'system'] },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Shard created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateShardInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const shard = await shardService.create(input);
      reply.code(201).send(shard);
    }
  );

  /**
   * Get shard by ID
   * GET /api/v1/shards/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/shards/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get shard by ID',
        tags: ['Shards'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Shard details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const shard = await shardService.getById(request.params.id, tenantId);
      reply.send(shard);
    }
  );

  /**
   * Update shard
   * PUT /api/v1/shards/:id
   */
  fastify.put<{ Params: { id: string }; Body: UpdateShardInput }>(
    '/api/v1/shards/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update shard',
        tags: ['Shards'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            structuredData: { type: 'object' },
            unstructuredData: { type: 'object' },
            metadata: { type: 'object' },
            internal_relationships: { type: 'array' },
            external_relationships: { type: 'array' },
            acl: { type: 'array' },
            status: { type: 'string', enum: ['active', 'archived', 'deleted', 'draft'] },
            parentShardId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Shard updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const shard = await shardService.update(request.params.id, tenantId, request.body);
      reply.send(shard);
    }
  );

  /**
   * Delete shard
   * DELETE /api/v1/shards/:id
   */
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/shards/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete shard (soft delete)',
        tags: ['Shards'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Shard deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await shardService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List shards
   * GET /api/v1/shards
   */
  fastify.get<{
    Querystring: {
      shardTypeId?: string;
      shardTypeName?: string;
      status?: string;
      parentShardId?: string;
      userId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/shards',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List shards with filtering',
        tags: ['Shards'],
        querystring: {
          type: 'object',
          properties: {
            shardTypeId: { type: 'string', format: 'uuid' },
            shardTypeName: { type: 'string', description: 'e.g. c_opportunity' },
            status: { type: 'string', enum: ['active', 'archived', 'deleted', 'draft'] },
            parentShardId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 5000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of shards',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await shardService.list(tenantId, {
        shardTypeId: request.query.shardTypeId,
        shardTypeName: request.query.shardTypeName,
        status: request.query.status as any,
        parentShardId: request.query.parentShardId,
        userId: request.query.userId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== SHARD TYPE ROUTES =====

  /**
   * Create a new shard type
   * POST /api/v1/shard-types
   */
  fastify.post<{ Body: CreateShardTypeInput }>(
    '/api/v1/shard-types',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new shard type (schema)',
        tags: ['Shard Types'],
        body: {
          type: 'object',
          required: ['name', 'schema'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            schema: { type: 'object' },
            displayConfig: { type: 'object' },
            isSystem: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Shard type created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateShardTypeInput = {
        ...request.body,
        tenantId,
        createdBy: userId,
      };

      const shardType = await shardTypeService.create(input);
      reply.code(201).send(shardType);
    }
  );

  /**
   * Get shard type by ID
   * GET /api/v1/shard-types/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/shard-types/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get shard type by ID',
        tags: ['Shard Types'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Shard type details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const shardType = await shardTypeService.getById(request.params.id, tenantId);
      reply.send(shardType);
    }
  );

  /**
   * Update shard type
   * PUT /api/v1/shard-types/:id
   */
  fastify.put<{ Params: { id: string }; Body: UpdateShardTypeInput }>(
    '/api/v1/shard-types/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update shard type',
        tags: ['Shard Types'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            schema: { type: 'object' },
            displayConfig: { type: 'object' },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Shard type updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const shardType = await shardTypeService.update(
        request.params.id,
        tenantId,
        request.body
      );
      reply.send(shardType);
    }
  );

  /**
   * Delete shard type
   * DELETE /api/v1/shard-types/:id
   */
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/shard-types/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete shard type (deactivate)',
        tags: ['Shard Types'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Shard type deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await shardTypeService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List shard types
   * GET /api/v1/shard-types
   */
  fastify.get<{
    Querystring: {
      isActive?: boolean;
      isSystem?: boolean;
      limit?: number;
    };
  }>(
    '/api/v1/shard-types',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List shard types',
        tags: ['Shard Types'],
        querystring: {
          type: 'object',
          properties: {
            isActive: { type: 'boolean' },
            isSystem: { type: 'boolean' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of shard types',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const shardTypes = await shardTypeService.list(tenantId, {
        isActive: request.query.isActive,
        isSystem: request.query.isSystem,
        limit: request.query.limit,
      });
      reply.send(shardTypes);
    }
  );

  // ===== RELATIONSHIP ROUTES =====

  /**
   * Create a relationship
   * POST /api/v1/relationships
   */
  fastify.post<{ Body: CreateEdgeInput }>(
    '/api/v1/relationships',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a relationship between two shards',
        tags: ['Relationships'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateEdgeInput = {
        ...(request.body as object),
        tenantId,
        createdBy: userId,
      } as CreateEdgeInput;

      const edge = await relationshipService.createRelationship(input);
      reply.code(201).send(edge);
    }
  );

  /**
   * Get relationships for a shard
   * GET /api/v1/shards/:id/relationships
   */
  fastify.get<{
    Params: { id: string };
    Querystring: {
      direction?: 'outgoing' | 'incoming' | 'both';
      relationshipType?: string;
      limit?: number;
    };
  }>(
    '/api/v1/shards/:id/relationships',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get relationships for a shard',
        tags: ['Relationships'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params;

      const edges = await relationshipService.getRelationships(
        tenantId,
        id,
        request.query.direction || 'both',
        {
          relationshipType: request.query.relationshipType,
          limit: request.query.limit,
        }
      );

      reply.send(edges);
    }
  );

  /**
   * Get related shards
   * GET /api/v1/shards/:id/related
   */
  fastify.get<{
    Params: { id: string };
    Querystring: {
      direction?: 'outgoing' | 'incoming' | 'both';
      relationshipType?: string;
      targetShardTypeId?: string;
      limit?: number;
    };
  }>(
    '/api/v1/shards/:id/related',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get related shards with data',
        tags: ['Relationships'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params;

      const related = await relationshipService.getRelatedShards(
        tenantId,
        id,
        request.query.direction || 'both',
        {
          relationshipType: request.query.relationshipType,
          targetShardTypeId: request.query.targetShardTypeId,
          limit: request.query.limit,
        }
      );

      reply.send(related);
    }
  );

  /**
   * Get relationship summary
   * GET /api/v1/shards/:id/relationships/summary
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/shards/:id/relationships/summary',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get relationship summary for a shard',
        tags: ['Relationships'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params;

      const summary = await relationshipService.getRelationshipSummary(tenantId, id);
      reply.send(summary);
    }
  );

  /**
   * Update a relationship
   * PUT /api/v1/relationships/:id
   */
  fastify.put<{ Params: { id: string }; Body: UpdateEdgeInput }>(
    '/api/v1/relationships/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update a relationship',
        tags: ['Relationships'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;
      const { id } = request.params;

      const input: UpdateEdgeInput = {
        ...(request.body as object),
        updatedBy: userId,
      } as UpdateEdgeInput;

      const edge = await relationshipService.updateRelationship(id, tenantId, input);
      if (!edge) {
        reply.code(404).send({ error: 'Relationship not found' });
        return;
      }

      reply.send(edge);
    }
  );

  /**
   * Delete a relationship
   * DELETE /api/v1/relationships/:id
   */
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/relationships/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete a relationship',
        tags: ['Relationships'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params;

      const deleted = await relationshipService.deleteRelationship(id, tenantId);
      if (!deleted) {
        reply.code(404).send({ error: 'Relationship not found' });
        return;
      }

      reply.code(204).send();
    }
  );

  /**
   * Traverse graph
   * POST /api/v1/relationships/traverse
   */
  fastify.post<{ Body: GraphTraversalOptions }>(
    '/api/v1/relationships/traverse',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Traverse relationship graph',
        tags: ['Relationships'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const options: GraphTraversalOptions = {
        ...(request.body as object),
        tenantId,
      } as GraphTraversalOptions;

      const graph = await relationshipService.traverseGraph(options);
      reply.send(graph);
    }
  );

  /**
   * Find path between shards
   * GET /api/v1/relationships/path
   */
  fastify.get<{
    Querystring: {
      sourceShardId: string;
      targetShardId: string;
      maxDepth?: number;
    };
  }>(
    '/api/v1/relationships/path',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Find path between two shards',
        tags: ['Relationships'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { sourceShardId, targetShardId, maxDepth = 5 } = request.query;

      const path = await relationshipService.findPath(
        tenantId,
        sourceShardId,
        targetShardId,
        maxDepth
      );

      reply.send(path);
    }
  );

  /**
   * Bulk create relationships
   * POST /api/v1/relationships/bulk
   */
  fastify.post<{ Body: BulkEdgeInput }>(
    '/api/v1/relationships/bulk',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Bulk create relationships',
        tags: ['Relationships'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const result = await relationshipService.bulkCreateRelationships(tenantId, request.body as BulkEdgeInput);
      reply.send(result);
    }
  );

  /**
   * Query edges
   * POST /api/v1/relationships/query
   */
  fastify.post<{ Body: EdgeQueryOptions }>(
    '/api/v1/relationships/query',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Query relationships with filters',
        tags: ['Relationships'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const body = request.body as EdgeQueryOptions & { filter?: { tenantId?: string } };
      const options: EdgeQueryOptions = {
        ...(body as object),
        filter: {
          ...(body.filter as object),
          tenantId,
        },
      } as EdgeQueryOptions;

      const result = await relationshipService.queryEdges(options);
      reply.send(result);
    }
  );

  // ===== LINKING ROUTES =====

  /**
   * Create a link
   * POST /api/v1/links
   */
  fastify.post<{ Body: CreateLinkInput & { projectId: string } }>(
    '/api/v1/links',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a link between two shards',
        tags: ['Links'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;
      const body = request.body as CreateLinkInput & { projectId: string };
      const { projectId, ...linkInput } = body;

      const link = await linkingService.createLink(tenantId, projectId, linkInput, userId);
      reply.code(201).send(link);
    }
  );

  /**
   * Get links for a shard
   * GET /api/v1/shards/:id/links
   */
  fastify.get<{
    Params: { id: string };
    Querystring: {
      projectId: string;
      relationshipType?: string;
      includeInactive?: boolean;
      limit?: number;
    };
  }>(
    '/api/v1/shards/:id/links',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get links for a shard',
        tags: ['Links'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params;
      const { projectId, ...options } = request.query;

      const links = await linkingService.getLinksForShard(tenantId, projectId, id, {
        relationshipType: options.relationshipType as any,
        includeInactive: options.includeInactive,
        limit: options.limit,
      });

      reply.send(links);
    }
  );

  /**
   * Get a link by ID
   * GET /api/v1/links/:id
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { projectId: string };
  }>(
    '/api/v1/links/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get a link by ID',
        tags: ['Links'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params;
      const { projectId } = request.query;

      const link = await linkingService.getLink(tenantId, projectId, id);
      if (!link) {
        reply.code(404).send({ error: 'Link not found' });
        return;
      }

      reply.send(link);
    }
  );

  /**
   * Update a link
   * PUT /api/v1/links/:id
   */
  fastify.put<{ Params: { id: string }; Body: UpdateLinkInput & { projectId: string } }>(
    '/api/v1/links/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update a link',
        tags: ['Links'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;
      const { id } = request.params;
      const body = request.body as UpdateLinkInput & { projectId: string };
      const { projectId, ...updateInput } = body;

      const link = await linkingService.updateLink(tenantId, projectId, id, updateInput, userId);
      reply.send(link);
    }
  );

  /**
   * Delete a link
   * DELETE /api/v1/links/:id
   */
  fastify.delete<{ Params: { id: string }; Querystring: { projectId: string } }>(
    '/api/v1/links/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete a link',
        tags: ['Links'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;
      const { id } = request.params;
      const { projectId } = request.query;

      await linkingService.deleteLink(tenantId, projectId, id, userId);
      reply.code(204).send();
    }
  );

  /**
   * Bulk create links
   * POST /api/v1/links/bulk
   */
  fastify.post<{ Body: BulkLinkInput }>(
    '/api/v1/links/bulk',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Bulk create links',
        tags: ['Links'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const result = await linkingService.bulkCreateLinks(tenantId, request.body as BulkLinkInput, userId);
      reply.send(result);
    }
  );

  // ===== ACL ROUTES =====

  /**
   * Check permission
   * POST /api/v1/acl/check
   */
  fastify.post<{ Body: PermissionCheckContext }>(
    '/api/v1/acl/check',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Check if user has permission on a shard',
        tags: ['ACL'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const context: PermissionCheckContext = {
        ...(request.body as object),
        tenantId,
      } as PermissionCheckContext;

      const result = await aclService.checkPermission(context);
      reply.send(result);
    }
  );

  /**
   * Batch check permissions
   * POST /api/v1/acl/batch-check
   */
  fastify.post<{ Body: ACLBatchCheckRequest }>(
    '/api/v1/acl/batch-check',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Batch check permissions for multiple shards',
        tags: ['ACL'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const requestBody: ACLBatchCheckRequest = {
        ...(request.body as object),
        tenantId,
      } as ACLBatchCheckRequest;

      const result = await aclService.batchCheckPermissions(requestBody);
      reply.send(result);
    }
  );

  /**
   * Grant permission
   * POST /api/v1/acl/grant
   */
  fastify.post<{ Body: GrantPermissionInput }>(
    '/api/v1/acl/grant',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Grant permissions to a user or role',
        tags: ['ACL'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: GrantPermissionInput = {
        ...(request.body as object),
        grantedBy: userId,
      } as GrantPermissionInput;

      await aclService.grantPermission(input, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * Revoke permission
   * POST /api/v1/acl/revoke
   */
  fastify.post<{ Body: RevokePermissionInput }>(
    '/api/v1/acl/revoke',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Revoke permissions from a user or role',
        tags: ['ACL'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: RevokePermissionInput = {
        ...(request.body as object),
        revokedBy: userId,
      } as RevokePermissionInput;

      await aclService.revokePermission(input, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * Update ACL
   * PUT /api/v1/acl/update
   */
  fastify.put<{ Body: UpdateACLInput }>(
    '/api/v1/acl/update',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update ACL entries for a shard',
        tags: ['ACL'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: UpdateACLInput = {
        ...(request.body as object),
        updatedBy: userId,
      } as UpdateACLInput;

      await aclService.updateACL(input, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * Get user permissions
   * GET /api/v1/acl/permissions/:shardId
   */
  fastify.get<{ Params: { shardId: string } }>(
    '/api/v1/acl/permissions/:shardId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get all permissions for current user on a shard',
        tags: ['ACL'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;
      const { shardId } = request.params;

      const permissions = await aclService.getUserPermissions(userId, shardId, tenantId);
      reply.send({ permissions });
    }
  );

  /**
   * Get ACL statistics
   * GET /api/v1/acl/stats
   */
  fastify.get(
    '/api/v1/acl/stats',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get ACL service statistics',
        tags: ['ACL'],
      },
    },
    async (request, reply) => {
      const stats = aclService.getStats();
      reply.send(stats);
    }
  );

  // ===== ADMIN SHARD TYPE ROUTES =====

  /**
   * List all shard types (Admin)
   * GET /api/v1/admin/shard-types
   */
  fastify.get<{
    Querystring: {
      isActive?: boolean;
      isSystem?: boolean;
      limit?: number;
    };
  }>(
    '/api/v1/admin/shard-types',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List all shard types (Admin only)',
        tags: ['Admin', 'Shard Types'],
        querystring: {
          type: 'object',
          properties: {
            isActive: { type: 'boolean' },
            isSystem: { type: 'boolean' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              shardTypes: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      // TODO: Add super admin role check
      const shardTypes = await shardTypeService.list(tenantId, {
        isActive: request.query.isActive,
        isSystem: request.query.isSystem,
        limit: request.query.limit,
      });
      reply.send({ shardTypes });
    }
  );

  /**
   * Get single shard type (Admin)
   * GET /api/v1/admin/shard-types/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/admin/shard-types/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get single shard type by ID (Admin only)',
        tags: ['Admin', 'Shard Types'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              shardType: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      // TODO: Add super admin role check
      const shardType = await shardTypeService.getById(request.params.id, tenantId);
      reply.send({ shardType });
    }
  );

  /**
   * Create shard type (Admin)
   * POST /api/v1/admin/shard-types
   */
  fastify.post<{ Body: CreateShardTypeInput }>(
    '/api/v1/admin/shard-types',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new shard type (Admin only)',
        tags: ['Admin', 'Shard Types'],
        body: {
          type: 'object',
          required: ['name', 'schema'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            schema: { type: 'object' },
            displayConfig: { type: 'object' },
            isSystem: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              shardType: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;
      // TODO: Add super admin role check

      const input: CreateShardTypeInput = {
        ...request.body,
        tenantId,
        createdBy: userId,
      };

      const shardType = await shardTypeService.create(input);
      reply.code(201).send({ shardType });
    }
  );

  /**
   * Update shard type (Admin)
   * PUT /api/v1/admin/shard-types/:id
   */
  fastify.put<{ Params: { id: string }; Body: UpdateShardTypeInput }>(
    '/api/v1/admin/shard-types/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update shard type (Admin only)',
        tags: ['Admin', 'Shard Types'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            schema: { type: 'object' },
            displayConfig: { type: 'object' },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              shardType: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      // TODO: Add super admin role check
      const shardType = await shardTypeService.update(
        request.params.id,
        tenantId,
        request.body
      );
      reply.send({ shardType });
    }
  );

  /**
   * Validate test data against shard type (Admin)
   * POST /api/v1/admin/shard-types/:id/validate
   */
  fastify.post<{ Params: { id: string }; Body: { testData: any } }>(
    '/api/v1/admin/shard-types/:id/validate',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Validate test data against shard type schema (Admin only)',
        tags: ['Admin', 'Shard Types'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['testData'],
          properties: {
            testData: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              valid: { type: 'boolean' },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
              warnings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      // TODO: Add super admin role check
      const result = await shardTypeService.validateTestData(
        request.params.id,
        tenantId,
        request.body.testData
      );
      reply.send(result);
    }
  );

  /**
   * Get shard type usage statistics (Admin)
   * GET /api/v1/admin/shard-types/:id/stats
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/admin/shard-types/:id/stats',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get shard type usage statistics (Admin only)',
        tags: ['Admin', 'Shard Types'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              shardCount: { type: 'number' },
              tenantsUsing: { type: 'number' },
              lastCreated: { type: 'string', format: 'date-time', nullable: true },
              avgShardSize: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      // TODO: Add super admin role check
      const stats = await shardTypeService.getStatistics(request.params.id, tenantId);
      reply.send(stats);
    }
  );

  fastify.log.info({ service: 'shard-manager' }, 'Shard manager routes registered');
}

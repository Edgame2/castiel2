/**
 * Route Registration
 * Registers all shard manager routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ShardService } from '../services/ShardService';
import { ShardTypeService } from '../services/ShardTypeService';
import {
  CreateShardInput,
  UpdateShardInput,
  CreateShardTypeInput,
  UpdateShardTypeInput,
} from '../types/shard.types';

export async function registerRoutes(fastify: FastifyInstance, config: any): Promise<void> {
  const shardService = new ShardService();
  const shardTypeService = new ShardTypeService();

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
            status: { type: 'string', enum: ['active', 'archived', 'deleted', 'draft'] },
            parentShardId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
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
}

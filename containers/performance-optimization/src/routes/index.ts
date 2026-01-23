/**
 * Route Registration
 * Performance Optimization routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { OptimizationService } from '../services/OptimizationService';
import { OptimizerService } from '../services/OptimizerService';
import {
  CreateOptimizationInput,
  UpdateOptimizationInput,
  RunOptimizationInput,
  OptimizationType,
  OptimizationStatus,
  OptimizationPriority,
} from '../types/optimization.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const optimizationService = new OptimizationService();
  const optimizerService = new OptimizerService(optimizationService);

  // ===== OPTIMIZATION ROUTES =====

  /**
   * Create optimization
   * POST /api/v1/optimize
   */
  app.post<{ Body: Omit<CreateOptimizationInput, 'tenantId' | 'userId'> }>(
    '/api/v1/optimize',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new performance optimization',
        tags: ['Performance Optimization'],
        body: {
          type: 'object',
          required: ['type', 'target'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['code', 'bundle_size', 'database_query', 'algorithm', 'memory', 'network', 'render', 'custom'] },
            target: {
              type: 'object',
              required: ['type', 'path'],
              properties: {
                type: { type: 'string', enum: ['file', 'directory', 'module', 'project', 'query', 'function'] },
                path: { type: 'string' },
                identifier: { type: 'string' },
              },
            },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Performance optimization created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateOptimizationInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
      };

      const optimization = await optimizationService.create(input);
      reply.code(201).send(optimization);
    }
  );

  /**
   * Get optimization by ID
   * GET /api/v1/optimize/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/optimize/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get performance optimization by ID',
        tags: ['Performance Optimization'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Performance optimization details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const optimization = await optimizationService.getById(request.params.id, tenantId);
      reply.send(optimization);
    }
  );

  /**
   * Update optimization
   * PUT /api/v1/optimize/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateOptimizationInput }>(
    '/api/v1/optimize/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update performance optimization',
        tags: ['Performance Optimization'],
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
            status: { type: 'string', enum: ['pending', 'analyzing', 'optimizing', 'completed', 'failed', 'cancelled'] },
            optimized: { type: 'object' },
            recommendations: { type: 'array' },
            error: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Performance optimization updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const optimization = await optimizationService.update(request.params.id, tenantId, request.body);
      reply.send(optimization);
    }
  );

  /**
   * Delete optimization
   * DELETE /api/v1/optimize/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/optimize/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete performance optimization',
        tags: ['Performance Optimization'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Performance optimization deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await optimizationService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List optimizations
   * GET /api/v1/optimize
   */
  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      priority?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/optimize',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List performance optimizations',
        tags: ['Performance Optimization'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'analyzing', 'optimizing', 'completed', 'failed', 'cancelled'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of performance optimizations',
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
      const result = await optimizationService.list(tenantId, {
        type: request.query.type as any,
        status: request.query.status as any,
        priority: request.query.priority as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Run optimization
   * POST /api/v1/optimize/:id/run
   */
  app.post<{ Params: { id: string }; Body: { applyChanges?: boolean } }>(
    '/api/v1/optimize/:id/run',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Run performance optimization',
        tags: ['Performance Optimization'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            applyChanges: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Performance optimization started',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: RunOptimizationInput = {
        tenantId,
        userId,
        optimizationId: request.params.id,
        applyChanges: request.body.applyChanges,
      };

      const optimization = await optimizerService.runOptimization(input);
      reply.send(optimization);
    }
  );
}


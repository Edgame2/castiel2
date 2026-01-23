/**
 * Route Registration
 * Cache Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { CacheService } from '../services/CacheService';
import {
  SetCacheEntryInput,
  GetCacheEntryInput,
  DeleteCacheEntryInput,
  InvalidateCachePatternInput,
} from '../types/cache.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const cacheService = new CacheService();

  // ===== CACHE OPERATION ROUTES =====

  /**
   * Set cache entry
   * POST /api/v1/cache/entries
   */
  app.post<{ Body: Omit<SetCacheEntryInput, 'tenantId'> }>(
    '/api/v1/cache/entries',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Set cache entry',
        tags: ['Cache'],
        body: {
          type: 'object',
          required: ['key', 'value'],
          properties: {
            key: { type: 'string', minLength: 1 },
            value: { type: ['string', 'number', 'boolean', 'object', 'array'] },
            ttl: { type: 'number', minimum: 1, description: 'Time to live in seconds' },
            namespace: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Cache entry created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const input: SetCacheEntryInput = {
        ...request.body,
        tenantId,
      };

      const entry = await cacheService.set(input);
      reply.code(201).send(entry);
    }
  );

  /**
   * Get cache entry
   * GET /api/v1/cache/entries/:key
   */
  app.get<{
    Params: { key: string };
    Querystring: { namespace?: string };
  }>(
    '/api/v1/cache/entries/:key',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get cache entry',
        tags: ['Cache'],
        params: {
          type: 'object',
          properties: {
            key: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            namespace: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Cache entry value',
            properties: {
              key: { type: 'string' },
              value: { type: ['string', 'number', 'boolean', 'object', 'array'] },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const input: GetCacheEntryInput = {
        tenantId,
        key: request.params.key,
        namespace: request.query.namespace,
      };

      const value = await cacheService.get(input);
      if (value === null) {
        reply.code(404).send({ error: 'Cache entry not found' });
        return;
      }

      reply.send({ key: request.params.key, value });
    }
  );

  /**
   * Delete cache entry
   * DELETE /api/v1/cache/entries/:key
   */
  app.delete<{
    Params: { key: string };
    Querystring: { namespace?: string };
  }>(
    '/api/v1/cache/entries/:key',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete cache entry',
        tags: ['Cache'],
        params: {
          type: 'object',
          properties: {
            key: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            namespace: { type: 'string' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Cache entry deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const input: DeleteCacheEntryInput = {
        tenantId,
        key: request.params.key,
        namespace: request.query.namespace,
      };

      await cacheService.delete(input);
      reply.code(204).send();
    }
  );

  /**
   * Invalidate cache pattern
   * POST /api/v1/cache/invalidate
   */
  app.post<{ Body: Omit<InvalidateCachePatternInput, 'tenantId'> }>(
    '/api/v1/cache/invalidate',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Invalidate cache entries matching pattern',
        tags: ['Cache'],
        body: {
          type: 'object',
          required: ['pattern'],
          properties: {
            pattern: { type: 'string', description: 'Redis pattern (e.g., "shard:*")' },
            namespace: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Number of keys invalidated',
            properties: {
              deleted: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const input: InvalidateCachePatternInput = {
        ...request.body,
        tenantId,
      };

      const deleted = await cacheService.invalidatePattern(input);
      reply.send({ deleted });
    }
  );

  /**
   * Clear all cache for tenant
   * DELETE /api/v1/cache
   */
  app.delete<{ Querystring: { namespace?: string } }>(
    '/api/v1/cache',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Clear all cache for tenant',
        tags: ['Cache'],
        querystring: {
          type: 'object',
          properties: {
            namespace: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Number of keys cleared',
            properties: {
              deleted: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const deleted = await cacheService.clear(tenantId, request.query.namespace);
      reply.send({ deleted });
    }
  );

  // ===== CACHE STATISTICS ROUTES =====

  /**
   * Get cache statistics
   * GET /api/v1/cache/stats
   */
  app.get<{ Querystring: { namespace?: string } }>(
    '/api/v1/cache/stats',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get cache statistics',
        tags: ['Cache'],
        querystring: {
          type: 'object',
          properties: {
            namespace: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Cache statistics',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const stats = await cacheService.getStats(tenantId, request.query.namespace);
      reply.send(stats);
    }
  );

  /**
   * Reset cache statistics
   * POST /api/v1/cache/stats/reset
   */
  app.post<{ Querystring: { namespace?: string } }>(
    '/api/v1/cache/stats/reset',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Reset cache statistics',
        tags: ['Cache'],
        querystring: {
          type: 'object',
          properties: {
            namespace: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Statistics reset successfully',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await cacheService.resetStats(tenantId, request.query.namespace);
      reply.send({ success: true });
    }
  );

  // ===== CACHE HEALTH & OPTIMIZATION ROUTES =====

  /**
   * Health check
   * GET /api/v1/cache/health
   */
  app.get(
    '/api/v1/cache/health',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Cache health check',
        tags: ['Cache'],
        response: {
          200: {
            type: 'object',
            description: 'Cache health status',
          },
        },
      },
    },
    async (request, reply) => {
      const health = await cacheService.healthCheck();
      reply.send(health);
    }
  );

  /**
   * Optimize cache
   * POST /api/v1/cache/optimize
   */
  app.post<{ Querystring: { namespace?: string } }>(
    '/api/v1/cache/optimize',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get cache optimization recommendations',
        tags: ['Cache'],
        querystring: {
          type: 'object',
          properties: {
            namespace: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Cache optimization report',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const report = await cacheService.optimize(tenantId, request.query.namespace);
      reply.send(report);
    }
  );
}

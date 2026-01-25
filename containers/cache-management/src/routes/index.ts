/**
 * Route registration for cache_management module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { CacheManagementService } from '../services/CacheManagementService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const cacheManagementService = new CacheManagementService();

    // Get cache metrics
    fastify.get<{ Querystring: { cacheKey?: string } }>(
      '/api/v1/cache/metrics',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get cache metrics',
          tags: ['Cache'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const { cacheKey } = request.query;

          const metrics = await cacheManagementService.getCacheMetrics(tenantId, cacheKey);

          return reply.send({ metrics });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to get cache metrics', error instanceof Error ? error : new Error(msg), { service: 'cache-management' });
          return reply.status(statusCode).send({
            error: { code: 'METRICS_RETRIEVAL_FAILED', message: msg || 'Failed to retrieve cache metrics' },
          });
        }
      }
    );

    // Optimize cache
    fastify.post('/api/v1/cache/optimize', {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Optimize cache',
        tags: ['Cache'],
        security: [{ bearerAuth: [] }],
      },
    }, async (request, reply) => {
      try {
        const tenantId = request.user!.tenantId;
        const result = await cacheManagementService.optimizeCache(tenantId);

        return reply.send(result);
      } catch (error: any) {
        log.error('Failed to optimize cache', error, { service: 'cache-management' });
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CACHE_OPTIMIZATION_FAILED',
            message: error.message || 'Failed to optimize cache',
          },
        });
      }
    });

    // Create or update cache strategy
    fastify.post<{ Body: { pattern: string; ttl: number; priority: number } }>(
      '/api/v1/cache/strategies',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create or update cache strategy',
          tags: ['Cache'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { pattern, ttl, priority } = request.body;
          const tenantId = request.user!.tenantId;

          const strategy = await cacheManagementService.upsertCacheStrategy(tenantId, pattern, ttl, priority);

          return reply.send(strategy);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Failed to upsert cache strategy', error instanceof Error ? error : new Error(msg), { service: 'cache-management' });
          return reply.status(statusCode).send({
            error: { code: 'STRATEGY_UPSERT_FAILED', message: msg || 'Failed to create or update cache strategy' },
          });
        }
      }
    );

    log.info('Cache management routes registered', { service: 'cache-management' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'cache-management' });
    throw error;
  }
}

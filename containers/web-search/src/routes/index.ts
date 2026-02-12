/**
 * Route registration for web_search module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { WebSearchService } from '../services/WebSearchService.js';
import { ScheduleService } from '../services/ScheduleService.js';
import type { ScheduleScope } from '../types/schedule.types.js';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, _config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const webSearchService = new WebSearchService(fastify);

    // Perform web search
    fastify.post<{ Body: { query: string; limit?: number; useCache?: boolean; opportunityId?: string; accountId?: string } }>(
      '/api/v1/web-search',
      {
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Perform web search (when web_search.url configured)',
          tags: ['Web Search'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['query'],
            properties: {
              query: { type: 'string', minLength: 1 },
              limit: { type: 'number', minimum: 1, maximum: 50 },
              useCache: { type: 'boolean' },
              opportunityId: { type: 'string' },
              accountId: { type: 'string' },
            },
          },
          response: {
            200: {
              type: 'object',
              properties: {
                results: { type: 'array' },
                query: { type: 'string' },
                cached: { type: 'boolean' },
              },
            },
            400: {
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
            500: {
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { query, limit, useCache, opportunityId, accountId } = request.body;
          const user = (request as any).user!;
          const tenantId = user.tenantId;
          const userId = user.id ?? '';

          const result = await webSearchService.search(tenantId, query, {
            limit,
            useCache,
            userId,
            opportunityId,
            accountId,
          });

          return reply.send(result);
        } catch (error: any) {
          log.error('Failed to perform web search', error, { service: 'web-search' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'WEB_SEARCH_FAILED',
              message: error.message || 'Failed to perform web search',
            },
          });
        }
      }
    );

    // Recurring search schedules CRUD (Phase 4.1)
    const scheduleService = new ScheduleService();
    fastify.get<{ Querystring: { scope?: ScheduleScope; userId?: string } }>(
      '/api/v1/schedules',
      {
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
      },
      async (request, reply) => {
        const tenantId = (request as any).user!.tenantId;
        const list = await scheduleService.list(tenantId, request.query);
        return reply.send({ schedules: list });
      }
    );
    fastify.get<{ Params: { id: string } }>(
      '/api/v1/schedules/:id',
      {
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
      },
      async (request, reply) => {
        const tenantId = (request as any).user!.tenantId;
        const schedule = await scheduleService.get(request.params.id, tenantId);
        if (!schedule) return reply.status(404).send({ error: 'Schedule not found' });
        return reply.send(schedule);
      }
    );
    fastify.post<{ Body: { query: string; cronExpression: string; scope?: ScheduleScope; role?: ScheduleScope } }>(
      '/api/v1/schedules',
      {
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Create recurring web search schedule',
          tags: ['Web Search'],
          body: {
            type: 'object',
            required: ['query', 'cronExpression'],
            properties: {
              query: { type: 'string', minLength: 1 },
              cronExpression: { type: 'string', minLength: 1 },
              scope: { type: 'string', enum: ['super_admin', 'tenant_admin', 'user'] },
              role: { type: 'string', enum: ['super_admin', 'tenant_admin', 'user'] },
            },
          },
          response: {
            201: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                tenantId: { type: 'string' },
                userId: { type: 'string' },
                query: { type: 'string' },
                cronExpression: { type: 'string' },
                scope: { type: 'string' },
                role: { type: 'string' },
                nextRunAt: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        const user = (request as any).user!;
        const schedule = await scheduleService.create({
          tenantId: user.tenantId,
          userId: user.id ?? '',
          query: request.body.query,
          cronExpression: request.body.cronExpression,
          scope: request.body.scope ?? 'user',
          role: request.body.role ?? 'user',
        });
        return reply.status(201).send(schedule);
      }
    );
    fastify.put<{
      Params: { id: string };
      Body: { query?: string; cronExpression?: string; scope?: ScheduleScope; role?: ScheduleScope };
    }>(
      '/api/v1/schedules/:id',
      {
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
        schema: {
          description: 'Update recurring web search schedule',
          tags: ['Web Search'],
          params: {
            type: 'object',
            required: ['id'],
            properties: { id: { type: 'string' } },
          },
          body: {
            type: 'object',
            minProperties: 1,
            properties: {
              query: { type: 'string', minLength: 1 },
              cronExpression: { type: 'string', minLength: 1 },
              scope: { type: 'string', enum: ['super_admin', 'tenant_admin', 'user'] },
              role: { type: 'string', enum: ['super_admin', 'tenant_admin', 'user'] },
            },
          },
          response: {
            200: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                tenantId: { type: 'string' },
                userId: { type: 'string' },
                query: { type: 'string' },
                cronExpression: { type: 'string' },
                scope: { type: 'string' },
                role: { type: 'string' },
                lastRunAt: { type: 'string' },
                nextRunAt: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        const tenantId = (request as any).user!.tenantId;
        const updated = await scheduleService.update(request.params.id, tenantId, request.body);
        if (!updated) return reply.status(404).send({ error: 'Schedule not found' });
        return reply.send(updated);
      }
    );
    fastify.delete<{ Params: { id: string } }>(
      '/api/v1/schedules/:id',
      {
        preHandler: [authenticateRequest() as any, tenantEnforcementMiddleware() as any],
      },
      async (request, reply) => {
        const tenantId = (request as any).user!.tenantId;
        const ok = await scheduleService.delete(request.params.id, tenantId);
        if (!ok) return reply.status(404).send({ error: 'Schedule not found' });
        return reply.status(204).send();
      }
    );

    log.info('Web search routes registered', { service: 'web-search' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'web-search' });
    throw error;
  }
}

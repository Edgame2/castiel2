/**
 * Intent Pattern Management Routes (Super Admin Only)
 * API endpoints for managing intent classification patterns
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { IntentPatternService } from '../services/intent-pattern.service.js';
import type {
  CreateIntentPatternInput,
  UpdateIntentPatternInput,
  TestPatternInput,
  SuggestPatternFromSamplesInput,
} from '../types/intent-pattern.types.js';
import { getUser } from '../middleware/authenticate.js';
import { isGlobalAdmin } from '../middleware/authorization.js';
import { ForbiddenError } from '../middleware/error-handler.js';

/**
 * Verify RBAC: Only Super Admin can access intent patterns
 */
function requireSuperAdmin(req: FastifyRequest): void {
  const user = getUser(req);
  if (!isGlobalAdmin(user)) {
    throw new ForbiddenError('Only Super Admins can manage intent patterns');
  }
}

/**
 * Register intent pattern routes
 */
export async function registerIntentPatternRoutes(
  server: FastifyInstance,
  service: IntentPatternService,
  monitoring: IMonitoringProvider
): Promise<void> {
  // Auth decorator
  const authDecorator = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    requireSuperAdmin(request);
  };

  /**
   * List intent patterns
   * GET /api/v1/insights/admin/intent-patterns
   */
  server.get<{
    Querystring: {
      intentType?: string;
      isActive?: boolean;
      minAccuracy?: number;
      sortBy?: 'accuracy' | 'coverage' | 'createdAt' | 'priority';
      limit?: number;
      offset?: number;
    };
  }>(
    '/api/v1/insights/admin/intent-patterns',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'List intent patterns with performance metrics (Super Admin only)',
        tags: ['Intent Patterns - Admin'],
        querystring: {
          type: 'object',
          properties: {
            intentType: { type: 'string' },
            isActive: { type: 'boolean' },
            minAccuracy: { type: 'number' },
            sortBy: {
              type: 'string',
              enum: ['accuracy', 'coverage', 'createdAt', 'priority'],
            },
            limit: { type: 'number', default: 100, maximum: 200 },
            offset: { type: 'number', default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const options = {
          intentType: request.query.intentType as any,
          isActive: request.query.isActive,
          minAccuracy: request.query.minAccuracy,
          sortBy: request.query.sortBy,
          limit: request.query.limit,
          offset: request.query.offset,
        };

        const result = await service.list(options);

        monitoring.trackEvent('intent-pattern.list', {
          intentType: options.intentType,
          isActive: options.isActive,
          minAccuracy: options.minAccuracy,
          sortBy: options.sortBy,
          limit: options.limit,
          offset: options.offset,
          count: result.patterns.length,
        });

        return reply.send(result);
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'IntentPatternRoutes',
          operation: 'list',
        });
        return reply.status(500).send({
          error: 'Failed to list intent patterns',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get pattern by ID
   * GET /api/v1/insights/admin/intent-patterns/:id
   */
  server.get<{
    Params: { id: string };
  }>(
    '/api/v1/insights/admin/intent-patterns/:id',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'Get intent pattern by ID (Super Admin only)',
        tags: ['Intent Patterns - Admin'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const pattern = await service.findById(id);

        if (!pattern) {
          return reply.status(404).send({ error: 'Intent pattern not found' });
        }

        return reply.send(pattern);
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'IntentPatternRoutes',
          operation: 'get',
          patternId: request.params.id,
        });
        return reply.status(500).send({
          error: 'Failed to get intent pattern',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * Create intent pattern
   * POST /api/v1/insights/admin/intent-patterns
   */
  server.post<{
    Body: CreateIntentPatternInput;
  }>(
    '/api/v1/insights/admin/intent-patterns',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'Create a new intent pattern (Super Admin only)',
        tags: ['Intent Patterns - Admin'],
        body: {
          type: 'object',
          required: ['name', 'description', 'intentType', 'patterns'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            intentType: { type: 'string' },
            subtype: { type: 'string' },
            patterns: { type: 'array', items: { type: 'string' } },
            keywords: { type: 'array', items: { type: 'string' } },
            phrases: { type: 'array', items: { type: 'string' } },
            priority: { type: 'number', minimum: 1, maximum: 10 },
            confidenceWeight: { type: 'number', minimum: 0.1, maximum: 2.0 },
            requiresContext: {
              type: 'object',
              properties: {
                shardTypes: { type: 'array', items: { type: 'string' } },
                userRoles: { type: 'array', items: { type: 'string' } },
              },
            },
            excludePatterns: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const pattern = await service.create(request.body, user.id);

        monitoring.trackEvent('intent-pattern.created', {
          patternId: pattern.id,
          intentType: pattern.intentType,
          createdBy: user.id,
        });

        return reply.status(201).send(pattern);
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'IntentPatternRoutes',
          operation: 'create',
        });
        return reply.status(500).send({
          error: 'Failed to create intent pattern',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * Update intent pattern
   * PATCH /api/v1/insights/admin/intent-patterns/:id
   */
  server.patch<{
    Params: { id: string };
    Body: UpdateIntentPatternInput;
  }>(
    '/api/v1/insights/admin/intent-patterns/:id',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'Update intent pattern (Super Admin only)',
        tags: ['Intent Patterns - Admin'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            intentType: { type: 'string' },
            subtype: { type: 'string' },
            patterns: { type: 'array', items: { type: 'string' } },
            keywords: { type: 'array', items: { type: 'string' } },
            phrases: { type: 'array', items: { type: 'string' } },
            priority: { type: 'number', minimum: 1, maximum: 10 },
            confidenceWeight: { type: 'number', minimum: 0.1, maximum: 2.0 },
            requiresContext: {
              type: 'object',
              properties: {
                shardTypes: { type: 'array', items: { type: 'string' } },
                userRoles: { type: 'array', items: { type: 'string' } },
              },
            },
            excludePatterns: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const user = getUser(request);
        const pattern = await service.update(id, request.body, user.id);

        return reply.send(pattern);
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'IntentPatternRoutes',
          operation: 'update',
          patternId: request.params.id,
        });
        return reply.status(500).send({
          error: 'Failed to update intent pattern',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * Delete intent pattern
   * DELETE /api/v1/insights/admin/intent-patterns/:id
   */
  server.delete<{
    Params: { id: string };
  }>(
    '/api/v1/insights/admin/intent-patterns/:id',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'Delete intent pattern (Super Admin only)',
        tags: ['Intent Patterns - Admin'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        await service.delete(id);

        return reply.status(204).send();
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'IntentPatternRoutes',
          operation: 'delete',
          patternId: request.params.id,
        });
        return reply.status(500).send({
          error: 'Failed to delete intent pattern',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * Test pattern against sample queries
   * POST /api/v1/insights/admin/intent-patterns/test
   */
  server.post<{
    Body: TestPatternInput;
  }>(
    '/api/v1/insights/admin/intent-patterns/test',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'Test intent pattern against sample queries (Super Admin only)',
        tags: ['Intent Patterns - Admin'],
        body: {
          type: 'object',
          required: ['pattern', 'testQueries'],
          properties: {
            pattern: {
              type: 'object',
              required: ['intentType', 'patterns'],
              properties: {
                intentType: { type: 'string' },
                patterns: { type: 'array', items: { type: 'string' } },
                keywords: { type: 'array', items: { type: 'string' } },
                phrases: { type: 'array', items: { type: 'string' } },
                excludePatterns: { type: 'array', items: { type: 'string' } },
                confidenceWeight: { type: 'number' },
              },
            },
            testQueries: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const results = await service.testPattern(request.body);

        monitoring.trackEvent('intent-pattern.tested', {
          testQueries: request.body.testQueries.length,
          matchedCount: results.filter(r => r.matched).length,
        });

        return reply.send({ results });
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'IntentPatternRoutes',
          operation: 'test',
        });
        return reply.status(500).send({
          error: 'Failed to test intent pattern',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * LLM-assisted pattern suggestion from samples
   * POST /api/v1/insights/admin/intent-patterns/suggest-from-samples
   */
  server.post<{
    Body: SuggestPatternFromSamplesInput;
  }>(
    '/api/v1/insights/admin/intent-patterns/suggest-from-samples',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'Generate intent patterns from sample queries using LLM (Super Admin only)',
        tags: ['Intent Patterns - Admin'],
        body: {
          type: 'object',
          required: ['samples', 'targetIntent'],
          properties: {
            samples: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
            },
            targetIntent: { type: 'string' },
            targetSubtype: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const result = await service.suggestPatternFromSamples(
          request.body,
          user.tenantId || 'SYSTEM'
        );

        monitoring.trackEvent('intent-pattern.llm-suggested', {
          intentType: request.body.targetIntent,
          samplesCount: request.body.samples.length,
          patternsSuggested: result.suggestedPatterns.length,
        });

        return reply.send(result);
      } catch (error) {
        monitoring.trackException(error as Error, {
          component: 'IntentPatternRoutes',
          operation: 'suggest-from-samples',
        });
        return reply.status(500).send({
          error: 'Failed to suggest patterns from samples',
          message: (error as Error).message,
        });
      }
    }
  );

  server.log.info('✅ Intent pattern routes registered');
}







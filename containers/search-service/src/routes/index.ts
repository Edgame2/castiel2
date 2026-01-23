/**
 * Route Registration
 * Search Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { SearchService } from '../services/SearchService';
import { SearchAnalyticsService } from '../services/SearchAnalyticsService';
import {
  VectorSearchRequest,
  HybridSearchRequest,
  FullTextSearchRequest,
} from '../types/search.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const searchService = new SearchService(
    config.services.embeddings.url,
    config.services.shard_manager.url
  );
  const searchAnalyticsService = new SearchAnalyticsService();

  // ===== SEARCH ROUTES =====

  /**
   * Vector search (semantic search)
   * POST /api/v1/search/vector
   */
  app.post<{ Body: Omit<VectorSearchRequest, 'tenantId' | 'userId'> }>(
    '/api/v1/search/vector',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Vector search (semantic search)',
        tags: ['Search'],
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1 },
            shardTypeIds: { type: 'array', items: { type: 'string' } },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
            minScore: { type: 'number', minimum: 0, maximum: 1 },
            includeEmbedding: { type: 'boolean' },
            includeShard: { type: 'boolean' },
            filters: {
              type: 'object',
              properties: {
                shardTypeIds: { type: 'array', items: { type: 'string' } },
                createdAfter: { type: 'string', format: 'date-time' },
                createdBefore: { type: 'string', format: 'date-time' },
                tags: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Vector search results',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const searchRequest: VectorSearchRequest = {
        ...request.body,
        tenantId,
        userId,
      };

      const results = await searchService.vectorSearch(searchRequest);
      reply.send(results);
    }
  );

  /**
   * Hybrid search (vector + keyword)
   * POST /api/v1/search/hybrid
   */
  app.post<{ Body: Omit<HybridSearchRequest, 'tenantId' | 'userId'> }>(
    '/api/v1/search/hybrid',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Hybrid search (vector + keyword)',
        tags: ['Search'],
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1 },
            shardTypeIds: { type: 'array', items: { type: 'string' } },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
            minScore: { type: 'number', minimum: 0, maximum: 1 },
            vectorWeight: { type: 'number', minimum: 0, maximum: 1, default: 0.7 },
            keywordWeight: { type: 'number', minimum: 0, maximum: 1, default: 0.3 },
            includeEmbedding: { type: 'boolean' },
            includeShard: { type: 'boolean' },
            filters: {
              type: 'object',
              properties: {
                shardTypeIds: { type: 'array', items: { type: 'string' } },
                createdAfter: { type: 'string', format: 'date-time' },
                createdBefore: { type: 'string', format: 'date-time' },
                tags: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Hybrid search results',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const searchRequest: HybridSearchRequest = {
        ...request.body,
        tenantId,
        userId,
      };

      const results = await searchService.hybridSearch(searchRequest);
      reply.send(results);
    }
  );

  /**
   * Full-text search (keyword search)
   * POST /api/v1/search/fulltext
   */
  app.post<{ Body: Omit<FullTextSearchRequest, 'tenantId' | 'userId'> }>(
    '/api/v1/search/fulltext',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Full-text search (keyword search)',
        tags: ['Search'],
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1 },
            shardTypeIds: { type: 'array', items: { type: 'string' } },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
            offset: { type: 'number', minimum: 0, default: 0 },
            sortBy: { type: 'string', enum: ['relevance', 'createdAt', 'updatedAt'], default: 'relevance' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            filters: {
              type: 'object',
              properties: {
                shardTypeIds: { type: 'array', items: { type: 'string' } },
                createdAfter: { type: 'string', format: 'date-time' },
                createdBefore: { type: 'string', format: 'date-time' },
                tags: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Full-text search results',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const searchRequest: FullTextSearchRequest = {
        ...request.body,
        tenantId,
        userId,
      };

      const results = await searchService.fullTextSearch(searchRequest);
      reply.send(results);
    }
  );

  // ===== ANALYTICS ROUTES =====

  /**
   * Get search analytics
   * GET /api/v1/search/analytics
   */
  app.get<{
    Querystring: {
      startDate: string;
      endDate: string;
    };
  }>(
    '/api/v1/search/analytics',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get search analytics',
        tags: ['Analytics'],
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Search analytics',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const analytics = await searchAnalyticsService.getAnalytics(tenantId, {
        startDate: new Date(request.query.startDate),
        endDate: new Date(request.query.endDate),
      });
      reply.send(analytics);
    }
  );
}

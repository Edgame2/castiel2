/**
 * Search Analytics Routes
 * 
 * API routes for search analytics
 */

import type { FastifyInstance } from 'fastify';
import { SearchAnalyticsController } from '../controllers/search-analytics.controller.js';
import { requireAuth } from '../middleware/authorization.js';

export async function registerSearchAnalyticsRoutes(
  server: FastifyInstance,
  controller: SearchAnalyticsController
): Promise<void> {
  const authDecorator = (server as FastifyInstance & { authenticate?: any }).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️ Search Analytics routes not registered - authentication decorator missing');
    return;
  }

  // authDecorator is already the authenticated function (not a factory)
  const authGuards = [authDecorator, requireAuth()];

  // Get query analytics
  server.get(
    '/api/v1/search/analytics/query',
    {
      onRequest: authGuards,
      schema: {
        description: 'Get analytics for a specific query',
        tags: ['Search Analytics'],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: {
              type: 'string',
              description: 'Search query',
            },
            filters: {
              type: 'string',
              description: 'JSON string of filters',
            },
          },
        },
        response: {
          200: {
            description: 'Query analytics',
            type: 'object',
          },
          404: {
            description: 'No analytics found',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.getQueryAnalytics(request, reply)
  );

  // Get zero-result queries
  server.get(
    '/api/v1/search/analytics/zero-results',
    {
      onRequest: authGuards,
      schema: {
        description: 'Get zero-result queries',
        tags: ['Search Analytics'],
        querystring: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              format: 'date-time',
              description: 'Start date (ISO 8601)',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              description: 'End date (ISO 8601)',
            },
            limit: {
              type: 'string',
              description: 'Maximum number of results (default: 50)',
            },
            shardTypeId: {
              type: 'string',
              description: 'Filter by shard type ID',
            },
          },
        },
        response: {
          200: {
            description: 'Zero-result queries',
            type: 'object',
            properties: {
              queries: {
                type: 'array',
                items: { type: 'object' },
              },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    (request, reply) => controller.getZeroResultQueries(request, reply)
  );

  // Get satisfaction metrics
  server.get(
    '/api/v1/search/analytics/satisfaction',
    {
      onRequest: authGuards,
      schema: {
        description: 'Get satisfaction metrics',
        tags: ['Search Analytics'],
        querystring: {
          type: 'object',
          properties: {
            queryHash: {
              type: 'string',
              description: 'Query hash to filter by',
            },
          },
        },
        response: {
          200: {
            description: 'Satisfaction metrics',
            type: 'object',
            properties: {
              metrics: {
                type: 'array',
                items: { type: 'object' },
              },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    (request, reply) => controller.getSatisfactionMetrics(request, reply)
  );

  // Get popular terms dashboard
  server.get(
    '/api/v1/search/analytics/dashboard',
    {
      onRequest: authGuards,
      schema: {
        description: 'Get popular terms dashboard',
        tags: ['Search Analytics'],
        querystring: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              enum: ['day', 'week', 'month', 'all'],
              description: 'Time period (default: week)',
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              description: 'Start date (ISO 8601)',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              description: 'End date (ISO 8601)',
            },
            limit: {
              type: 'string',
              description: 'Maximum number of top queries (default: 20)',
            },
            shardTypeId: {
              type: 'string',
              description: 'Filter by shard type ID',
            },
          },
        },
        response: {
          200: {
            description: 'Popular terms dashboard',
            type: 'object',
          },
        },
      },
    },
    (request, reply) => controller.getDashboard(request, reply)
  );

  // Record interaction
  server.post(
    '/api/v1/search/analytics/interaction',
    {
      onRequest: authGuards,
      schema: {
        description: 'Record a user interaction with search results',
        tags: ['Search Analytics'],
        body: {
          type: 'object',
          required: ['query', 'interactionType'],
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            filters: {
              type: 'object',
              description: 'Search filters',
            },
            interactionType: {
              type: 'string',
              enum: ['click', 'view', 'satisfaction'],
              description: 'Type of interaction',
            },
            resultId: {
              type: 'string',
              description: 'ID of the result that was interacted with',
            },
            satisfactionScore: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Satisfaction score (1-5), required for satisfaction interactions',
            },
          },
        },
        response: {
          201: {
            description: 'Interaction recorded',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.recordInteraction(request, reply)
  );

  server.log.info('✅ Search Analytics routes registered');
}









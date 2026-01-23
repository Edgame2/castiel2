/**
 * Memory Routes
 * 
 * API routes for AI chat memory management
 * Supports explicit memory management (remember/forget) and memory search
 */

import type { FastifyInstance } from 'fastify';
import { MemoryController } from '../controllers/memory.controller.js';
import { requireAuth } from '../middleware/authorization.js';

export async function registerMemoryRoutes(
  server: FastifyInstance,
  controller: MemoryController
): Promise<void> {
  const authDecorator = (server as FastifyInstance & { authenticate?: any }).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️ Memory routes not registered - authentication decorator missing');
    return;
  }

  const authGuards = [authDecorator, requireAuth()];

  // Remember information
  server.post(
    '/api/v1/memory/remember',
    {
      onRequest: authGuards,
      schema: {
        description: 'Remember explicit information for the user',
        tags: ['Memory'],
        body: {
          type: 'object',
          required: ['information'],
          properties: {
            information: {
              type: 'string',
              minLength: 1,
              maxLength: 1000,
              description: 'Information to remember (natural language)',
            },
            subject: {
              type: 'string',
              description: 'Subject of the fact (default: "user")',
            },
            category: {
              type: 'string',
              enum: ['role', 'expertise', 'interest', 'responsibility', 'preference', 'relationship', 'context', 'custom'],
              description: 'Category of the fact',
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Confidence level (0-1, default: 0.9)',
            },
          },
        },
        response: {
          201: {
            description: 'Information remembered successfully',
            type: 'object',
            properties: {
              fact: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  subject: { type: 'string' },
                  predicate: { type: 'string' },
                  object: { type: 'string' },
                  category: { type: 'string' },
                  confidence: { type: 'number' },
                  source: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.remember(request, reply)
  );

  // Forget information
  server.post(
    '/api/v1/memory/forget',
    {
      onRequest: authGuards,
      schema: {
        description: 'Forget information matching a query',
        tags: ['Memory'],
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: {
              type: 'string',
              minLength: 1,
              maxLength: 500,
              description: 'Search query to find facts to forget',
            },
          },
        },
        response: {
          200: {
            description: 'Information forgotten successfully',
            type: 'object',
            properties: {
              removed: { type: 'number', description: 'Number of facts removed' },
              facts: {
                type: 'array',
                items: { type: 'object' },
                description: 'List of facts that were removed',
              },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.forget(request, reply)
  );

  // Search memory
  server.get(
    '/api/v1/memory/search',
    {
      onRequest: authGuards,
      schema: {
        description: 'Search user memory',
        tags: ['Memory'],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: {
              type: 'string',
              minLength: 1,
              description: 'Search query',
            },
            category: {
              type: 'string',
              enum: ['role', 'expertise', 'interest', 'responsibility', 'preference', 'relationship', 'context', 'custom'],
              description: 'Filter by category',
            },
            limit: {
              type: 'string',
              description: 'Maximum number of results (default: 20)',
            },
          },
        },
        response: {
          200: {
            description: 'Search results',
            type: 'object',
            properties: {
              facts: {
                type: 'array',
                items: { type: 'object' },
              },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    (request, reply) => controller.search(request, reply)
  );

  // List all facts
  server.get(
    '/api/v1/memory/facts',
    {
      onRequest: authGuards,
      schema: {
        description: 'List all user facts',
        tags: ['Memory'],
        querystring: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['role', 'expertise', 'interest', 'responsibility', 'preference', 'relationship', 'context', 'custom'],
              description: 'Filter by category',
            },
            limit: {
              type: 'string',
              description: 'Maximum number of results (default: 50)',
            },
            offset: {
              type: 'string',
              description: 'Number of results to skip (default: 0)',
            },
          },
        },
        response: {
          200: {
            description: 'List of facts',
            type: 'object',
            properties: {
              facts: {
                type: 'array',
                items: { type: 'object' },
              },
              total: { type: 'number' },
              limit: { type: 'number' },
              offset: { type: 'number' },
            },
          },
        },
      },
    },
    (request, reply) => controller.listFacts(request, reply)
  );

  // Remove specific fact
  server.delete(
    '/api/v1/memory/facts/:factId',
    {
      onRequest: authGuards,
      schema: {
        description: 'Remove a specific fact',
        tags: ['Memory'],
        params: {
          type: 'object',
          required: ['factId'],
          properties: {
            factId: {
              type: 'string',
              description: 'Fact ID to remove',
            },
          },
        },
        response: {
          200: {
            description: 'Fact removed successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          404: {
            description: 'Fact not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.removeFact(request, reply)
  );

  // Get memory summary
  server.get(
    '/api/v1/memory',
    {
      onRequest: authGuards,
      schema: {
        description: 'Get user memory summary',
        tags: ['Memory'],
        response: {
          200: {
            description: 'Memory summary',
            type: 'object',
            properties: {
              userId: { type: 'string' },
              tenantId: { type: 'string' },
              preferences: { type: 'object' },
              factCount: { type: 'number' },
              recentTopics: { type: 'array', items: { type: 'string' } },
              recentShards: { type: 'array', items: { type: 'string' } },
              stats: { type: 'object' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.getMemory(request, reply)
  );

  // Clear all memory
  server.delete(
    '/api/v1/memory',
    {
      onRequest: authGuards,
      schema: {
        description: 'Clear all user memory (for privacy/GDPR)',
        tags: ['Memory'],
        response: {
          200: {
            description: 'Memory cleared successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.clearMemory(request, reply)
  );

  server.log.info('Memory routes registered');
}


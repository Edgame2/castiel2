import { FastifyInstance } from 'fastify';
import { AdvancedSearchController } from '../controllers/advanced-search.controller.js';
import { AdvancedSearchService } from '../services/advanced-search.service.js';

/**
 * Advanced Search Routes
 */
export async function registerAdvancedSearchRoutes(
  fastify: FastifyInstance,
  searchService: AdvancedSearchService
): Promise<void> {
  const controller = new AdvancedSearchController(searchService);

  // Search schemas
  const searchQuerySchema = {
    type: 'object',
    properties: {
      query: { type: 'string' },
      queryFields: { type: 'array', items: { type: 'string' } },
      queryType: { type: 'string', enum: ['best_fields', 'most_fields', 'cross_fields', 'phrase'] },
      filters: { type: 'object' },
      shardTypeIds: { type: 'array', items: { type: 'string' } },
      statuses: { type: 'array', items: { type: 'string' } },
      tags: { type: 'array', items: { type: 'string' } },
      createdBy: { type: 'string' },
      createdAfter: { type: 'string', format: 'date-time' },
      createdBefore: { type: 'string', format: 'date-time' },
      updatedAfter: { type: 'string', format: 'date-time' },
      updatedBefore: { type: 'string', format: 'date-time' },
      relatedTo: { type: 'string' },
      relationshipType: { type: 'string' },
      hasRelationships: { type: 'boolean' },
      facets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            type: { type: 'string', enum: ['terms', 'range', 'date_histogram', 'stats'] },
            size: { type: 'integer', minimum: 1, maximum: 100 },
          },
          required: ['field'],
        },
      },
      sort: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            order: { type: 'string', enum: ['asc', 'desc'] },
          },
          required: ['field', 'order'],
        },
      },
      highlight: {
        type: 'object',
        properties: {
          fields: { type: 'array', items: { type: 'string' } },
          preTag: { type: 'string' },
          postTag: { type: 'string' },
          fragmentSize: { type: 'integer' },
        },
      },
      limit: { type: 'integer', minimum: 1, maximum: 1000, default: 50 },
      offset: { type: 'integer', minimum: 0, default: 0 },
      includeTotal: { type: 'boolean', default: false },
      trackScores: { type: 'boolean' },
      explain: { type: 'boolean' },
      minScore: { type: 'number' },
      idsOnly: { type: 'boolean' },
      fields: { type: 'array', items: { type: 'string' } },
      includeComputedFields: { type: 'boolean' },
    },
  };

  const savedSearchSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', maxLength: 1000 },
      query: searchQuerySchema,
      visibility: { type: 'string', enum: ['private', 'team', 'tenant'] },
      sharedWith: { type: 'array', items: { type: 'string' } },
      tags: { type: 'array', items: { type: 'string' } },
      icon: { type: 'string' },
      color: { type: 'string' },
    },
    required: ['name', 'query'],
  };

  // Search routes
  fastify.post('/api/search', {
    schema: {
      tags: ['search'],
      summary: 'Execute advanced search',
      body: searchQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            items: { type: 'array' },
            total: { type: 'integer' },
            maxScore: { type: 'number' },
            facets: { type: 'array' },
            took: { type: 'integer' },
          },
        },
      },
    },
    handler: controller.search.bind(controller),
  });

  fastify.get('/api/search/quick', {
    schema: {
      tags: ['search'],
      summary: 'Quick search',
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          type: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
        required: ['q'],
      },
    },
    handler: controller.quickSearch.bind(controller),
  });

  fastify.post('/api/search/facets', {
    schema: {
      tags: ['search'],
      summary: 'Get search facets',
      body: {
        type: 'object',
        properties: {
          shardTypeIds: { type: 'array', items: { type: 'string' } },
          facets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                size: { type: 'integer', minimum: 1, maximum: 100 },
              },
              required: ['field'],
            },
          },
        },
        required: ['facets'],
      },
    },
    handler: controller.getFacets.bind(controller),
  });

  // Saved search routes
  fastify.post('/api/search/saved', {
    schema: {
      tags: ['search', 'saved-search'],
      summary: 'Create saved search',
      body: savedSearchSchema,
    },
    handler: controller.createSavedSearch.bind(controller),
  });

  fastify.get('/api/search/saved', {
    schema: {
      tags: ['search', 'saved-search'],
      summary: 'List saved searches',
      querystring: {
        type: 'object',
        properties: {
          visibility: { type: 'string', enum: ['private', 'team', 'tenant'] },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
    },
    handler: controller.listSavedSearches.bind(controller),
  });

  fastify.get('/api/search/saved/:id', {
    schema: {
      tags: ['search', 'saved-search'],
      summary: 'Get saved search',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    handler: controller.getSavedSearch.bind(controller),
  });

  fastify.patch('/api/search/saved/:id', {
    schema: {
      tags: ['search', 'saved-search'],
      summary: 'Update saved search',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 1000 },
          query: searchQuerySchema,
          visibility: { type: 'string', enum: ['private', 'team', 'tenant'] },
          sharedWith: { type: 'array', items: { type: 'string' } },
          isPinned: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string' } },
          icon: { type: 'string' },
          color: { type: 'string' },
        },
      },
    },
    handler: controller.updateSavedSearch.bind(controller),
  });

  fastify.delete('/api/search/saved/:id', {
    schema: {
      tags: ['search', 'saved-search'],
      summary: 'Delete saved search',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    handler: controller.deleteSavedSearch.bind(controller),
  });

  fastify.post('/api/search/saved/:id/execute', {
    schema: {
      tags: ['search', 'saved-search'],
      summary: 'Execute saved search',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 1000 },
          offset: { type: 'integer', minimum: 0 },
        },
      },
    },
    handler: controller.executeSavedSearch.bind(controller),
  });

  // Analytics routes
  fastify.get('/api/search/popular', {
    schema: {
      tags: ['search', 'analytics'],
      summary: 'Get popular search terms',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
    },
    handler: controller.getPopularTerms.bind(controller),
  });
}












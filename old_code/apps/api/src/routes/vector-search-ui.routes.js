/**
 * Vector Search UI Routes
 *
 * API routes for vector search UI features
 */
import { requireAuth } from '../middleware/authorization.js';
export async function registerVectorSearchUIRoutes(server, controller) {
    const authDecorator = server.authenticate;
    if (!authDecorator) {
        server.log.warn('⚠️ Vector Search UI routes not registered - authentication decorator missing');
        return;
    }
    // authDecorator is already the authenticated function (not a factory)
    const authGuards = [authDecorator, requireAuth()];
    // Search history routes
    server.get('/api/v1/search/history', {
        onRequest: authGuards,
        schema: {
            description: 'Get search history for current user',
            tags: ['Vector Search UI'],
            querystring: {
                type: 'object',
                properties: {
                    limit: {
                        type: 'string',
                        description: 'Maximum number of entries to return (default: 20)',
                    },
                    offset: {
                        type: 'string',
                        description: 'Number of entries to skip (default: 0)',
                    },
                    shardTypeId: {
                        type: 'string',
                        description: 'Filter by shard type ID',
                    },
                },
            },
            response: {
                200: {
                    description: 'Search history',
                    type: 'object',
                    properties: {
                        entries: {
                            type: 'array',
                            items: { type: 'object' },
                        },
                        total: { type: 'number' },
                    },
                },
            },
        },
    }, (request, reply) => controller.getHistory(request, reply));
    server.delete('/api/v1/search/history', {
        onRequest: authGuards,
        schema: {
            description: 'Clear search history for current user',
            tags: ['Vector Search UI'],
            response: {
                200: {
                    description: 'Search history cleared',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, (request, reply) => controller.clearHistory(request, reply));
    // Saved searches routes
    server.post('/api/v1/search/saved', {
        onRequest: authGuards,
        schema: {
            description: 'Create a saved search',
            tags: ['Vector Search UI'],
            body: {
                type: 'object',
                required: ['name', 'query'],
                properties: {
                    name: { type: 'string', minLength: 1, maxLength: 200 },
                    description: { type: 'string', maxLength: 1000 },
                    query: { type: 'string', minLength: 1 },
                    filters: { type: 'object' },
                    topK: { type: 'number', minimum: 1, maximum: 100 },
                    minScore: { type: 'number', minimum: 0, maximum: 1 },
                    similarityMetric: { type: 'string', enum: ['cosine', 'dot', 'euclidean'] },
                    visibility: { type: 'string', enum: ['private', 'team', 'tenant'] },
                    sharedWith: {
                        type: 'array',
                        items: { type: 'string' },
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                    },
                    icon: { type: 'string' },
                    color: { type: 'string' },
                },
            },
            response: {
                201: {
                    description: 'Saved search created',
                    type: 'object',
                },
            },
        },
    }, (request, reply) => controller.createSavedSearch(request, reply));
    server.get('/api/v1/search/saved', {
        onRequest: authGuards,
        schema: {
            description: 'List saved searches for current user',
            tags: ['Vector Search UI'],
            querystring: {
                type: 'object',
                properties: {
                    includeShared: {
                        type: 'string',
                        enum: ['true', 'false'],
                        description: 'Include shared searches',
                    },
                    visibility: {
                        type: 'string',
                        enum: ['private', 'team', 'tenant'],
                        description: 'Filter by visibility',
                    },
                },
            },
            response: {
                200: {
                    description: 'List of saved searches',
                    type: 'object',
                    properties: {
                        searches: {
                            type: 'array',
                            items: { type: 'object' },
                        },
                        count: { type: 'number' },
                    },
                },
            },
        },
    }, (request, reply) => controller.listSavedSearches(request, reply));
    server.get('/api/v1/search/saved/:id', {
        onRequest: authGuards,
        schema: {
            description: 'Get a saved search by ID',
            tags: ['Vector Search UI'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
            response: {
                200: {
                    description: 'Saved search',
                    type: 'object',
                },
                404: {
                    description: 'Saved search not found',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, (request, reply) => controller.getSavedSearch(request, reply));
    server.patch('/api/v1/search/saved/:id', {
        onRequest: authGuards,
        schema: {
            description: 'Update a saved search',
            tags: ['Vector Search UI'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string', minLength: 1, maxLength: 200 },
                    description: { type: 'string', maxLength: 1000 },
                    query: { type: 'string', minLength: 1 },
                    filters: { type: 'object' },
                    topK: { type: 'number', minimum: 1, maximum: 100 },
                    minScore: { type: 'number', minimum: 0, maximum: 1 },
                    similarityMetric: { type: 'string', enum: ['cosine', 'dot', 'euclidean'] },
                    visibility: { type: 'string', enum: ['private', 'team', 'tenant'] },
                    sharedWith: {
                        type: 'array',
                        items: { type: 'string' },
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                    },
                    icon: { type: 'string' },
                    color: { type: 'string' },
                    isPinned: { type: 'boolean' },
                },
            },
            response: {
                200: {
                    description: 'Saved search updated',
                    type: 'object',
                },
                404: {
                    description: 'Saved search not found',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, (request, reply) => controller.updateSavedSearch(request, reply));
    server.delete('/api/v1/search/saved/:id', {
        onRequest: authGuards,
        schema: {
            description: 'Delete a saved search',
            tags: ['Vector Search UI'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
            response: {
                200: {
                    description: 'Saved search deleted',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                    },
                },
                404: {
                    description: 'Saved search not found',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, (request, reply) => controller.deleteSavedSearch(request, reply));
    // Autocomplete route
    server.get('/api/v1/search/autocomplete', {
        onRequest: authGuards,
        schema: {
            description: 'Get autocomplete suggestions',
            tags: ['Vector Search UI'],
            querystring: {
                type: 'object',
                required: ['q'],
                properties: {
                    q: {
                        type: 'string',
                        minLength: 1,
                        description: 'Partial query string',
                    },
                    limit: {
                        type: 'string',
                        description: 'Maximum number of suggestions (default: 10)',
                    },
                    includeHistory: {
                        type: 'string',
                        enum: ['true', 'false'],
                        description: 'Include suggestions from search history (default: true)',
                    },
                    includePopular: {
                        type: 'string',
                        enum: ['true', 'false'],
                        description: 'Include popular search terms (default: true)',
                    },
                    includeSuggestions: {
                        type: 'string',
                        enum: ['true', 'false'],
                        description: 'Include suggestions from saved searches (default: true)',
                    },
                    shardTypeId: {
                        type: 'string',
                        description: 'Filter by shard type ID',
                    },
                },
            },
            response: {
                200: {
                    description: 'Autocomplete suggestions',
                    type: 'object',
                    properties: {
                        suggestions: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    query: { type: 'string' },
                                    type: { type: 'string', enum: ['history', 'popular', 'suggestion'] },
                                    score: { type: 'number' },
                                    metadata: { type: 'object' },
                                },
                            },
                        },
                        total: { type: 'number' },
                    },
                },
            },
        },
    }, (request, reply) => controller.getAutocomplete(request, reply));
    server.log.info('✅ Vector Search UI routes registered');
}
//# sourceMappingURL=vector-search-ui.routes.js.map
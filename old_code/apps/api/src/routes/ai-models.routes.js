/**
 * AI Models Management Routes (Super Admin Only)
 *
 * Manages the catalog of available AI models
 */
import { AIModelService } from '../services/ai/index.js';
export async function aiModelsRoutes(fastify, options) {
    const modelService = new AIModelService(options.monitoring);
    /**
     * List all AI models in the catalog
     * GET /admin/ai/models
     */
    fastify.get('/admin/ai/models', {
        schema: {
            description: 'List all AI models in the catalog',
            tags: ['ai-admin'],
            querystring: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['LLM', 'Embedding'] },
                    provider: { type: 'string' },
                    hoster: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'deprecated', 'disabled'] },
                    allowTenantConnections: { type: 'boolean' },
                    limit: { type: 'number', default: 50, minimum: 1, maximum: 1000 },
                    offset: { type: 'number', default: 0, minimum: 0 },
                    sortBy: { type: 'string', enum: ['name', 'provider', 'createdAt', 'updatedAt'], default: 'name' },
                    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const result = await modelService.listModels(request.query);
            return result;
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to list AI models');
            return reply.status(500).send({
                error: 'Failed to list AI models',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * Get a specific AI model
     * GET /admin/ai/models/:modelId
     */
    fastify.get('/admin/ai/models/:modelId', {
        schema: {
            description: 'Get a specific AI model',
            tags: ['ai-admin'],
        },
    }, async (request, reply) => {
        try {
            const model = await modelService.getModel(request.params.modelId);
            if (!model) {
                return reply.status(404).send({ error: 'Model not found' });
            }
            return { model };
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to get AI model');
            return reply.status(500).send({
                error: 'Failed to get AI model',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * Create a new AI model
     * POST /admin/ai/models
     */
    fastify.post('/admin/ai/models', {
        schema: {
            description: 'Create a new AI model in the catalog',
            tags: ['ai-admin'],
            body: {
                type: 'object',
                required: [
                    'name',
                    'provider',
                    'type',
                    'hoster',
                    'allowTenantConnections',
                    'contextWindow',
                    'maxOutputs',
                    'streaming',
                    'vision',
                    'functions',
                    'jsonMode',
                ],
                properties: {
                    name: { type: 'string' },
                    provider: { type: 'string' },
                    type: { type: 'string', enum: ['LLM', 'Embedding'] },
                    hoster: { type: 'string' },
                    allowTenantConnections: { type: 'boolean' },
                    contextWindow: { type: 'number' },
                    maxOutputs: { type: 'number' },
                    streaming: { type: 'boolean' },
                    vision: { type: 'boolean' },
                    functions: { type: 'boolean' },
                    jsonMode: { type: 'boolean' },
                    description: { type: 'string' },
                    modelIdentifier: { type: 'string' },
                    pricing: {
                        type: 'object',
                        properties: {
                            inputTokenPrice: { type: 'number' },
                            outputTokenPrice: { type: 'number' },
                            currency: { type: 'string' },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const userId = request.user?.userId || 'system';
        try {
            const model = await modelService.createModel(request.body, userId);
            return reply.status(201).send({
                success: true,
                model,
            });
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to create AI model');
            return reply.status(500).send({
                error: 'Failed to create AI model',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * Update an AI model
     * PATCH /admin/ai/models/:modelId
     */
    fastify.patch('/admin/ai/models/:modelId', {
        schema: {
            description: 'Update an AI model',
            tags: ['ai-admin'],
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    allowTenantConnections: { type: 'boolean' },
                    contextWindow: { type: 'number' },
                    maxOutputs: { type: 'number' },
                    streaming: { type: 'boolean' },
                    vision: { type: 'boolean' },
                    functions: { type: 'boolean' },
                    jsonMode: { type: 'boolean' },
                    status: { type: 'string', enum: ['active', 'deprecated', 'disabled'] },
                    description: { type: 'string' },
                    modelIdentifier: { type: 'string' },
                    pricing: {
                        type: 'object',
                        properties: {
                            inputTokenPrice: { type: 'number' },
                            outputTokenPrice: { type: 'number' },
                            currency: { type: 'string' },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const userId = request.user?.userId || 'system';
        try {
            const model = await modelService.updateModel(request.params.modelId, request.body, userId);
            return { success: true, model };
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to update AI model');
            if (error instanceof Error && error.message === 'Model not found') {
                return reply.status(404).send({ error: 'Model not found' });
            }
            return reply.status(500).send({
                error: 'Failed to update AI model',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * Delete an AI model (soft delete)
     * DELETE /admin/ai/models/:modelId
     */
    fastify.delete('/admin/ai/models/:modelId', {
        schema: {
            description: 'Delete (disable) an AI model',
            tags: ['ai-admin'],
        },
    }, async (request, reply) => {
        const userId = request.user?.userId || 'system';
        try {
            await modelService.deleteModel(request.params.modelId, userId);
            return reply.status(204).send();
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to delete AI model');
            return reply.status(500).send({
                error: 'Failed to delete AI model',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * Get models available for tenant connections
     * GET /tenant/ai/available-models
     */
    fastify.get('/tenant/ai/available-models', {
        schema: {
            description: 'Get AI models available for tenant connections',
            tags: ['ai-tenant'],
        },
    }, async (_request, reply) => {
        try {
            const models = await modelService.getModelsForTenants();
            return { models };
        }
        catch (error) {
            fastify.log.error({ error }, 'Failed to get available models');
            return reply.status(500).send({
                error: 'Failed to get available models',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
}
//# sourceMappingURL=ai-models.routes.js.map
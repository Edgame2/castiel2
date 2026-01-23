import { ContextTemplateController } from '../controllers/context-template.controller.js';
/**
 * Register context template routes
 */
export async function contextTemplateRoutes(server, options) {
    const { monitoring, shardRepository, shardTypeRepository, relationshipService, redis } = options;
    const controller = new ContextTemplateController(monitoring, shardRepository, shardTypeRepository, relationshipService, redis);
    // ===============================================
    // CONTEXT ASSEMBLY
    // ===============================================
    // Assemble context for a shard
    server.route({
        method: 'POST',
        url: '/context',
        schema: {
            tags: ['AI Context'],
            summary: 'Assemble context for a shard using a template',
            body: {
                type: 'object',
                required: ['shardId'],
                properties: {
                    shardId: { type: 'string', format: 'uuid', description: 'Target shard ID' },
                    templateId: { type: 'string', description: 'Preferred template ID' },
                    assistantId: { type: 'string', description: 'Assistant ID for template selection' },
                    debug: { type: 'boolean', default: false, description: 'Include debug info' },
                    maxTokensOverride: { type: 'integer', minimum: 500, maximum: 128000, description: 'Override max tokens' },
                    skipCache: { type: 'boolean', default: false, description: 'Skip cached context' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        context: {
                            type: 'object',
                            properties: {
                                templateId: { type: 'string' },
                                templateName: { type: 'string' },
                                self: { type: 'object' },
                                related: { type: 'object' },
                                metadata: {
                                    type: 'object',
                                    properties: {
                                        totalShards: { type: 'integer' },
                                        tokenEstimate: { type: 'integer' },
                                        truncated: { type: 'boolean' },
                                        cachedUntil: { type: 'string' },
                                        executionTimeMs: { type: 'integer' },
                                    },
                                },
                                formatted: { type: 'string' },
                            },
                        },
                        debug: { type: 'object' },
                    },
                },
                400: { type: 'object', properties: { error: { type: 'string' } } },
            },
        },
        handler: controller.assembleContext,
    });
    // Invalidate cached context
    server.route({
        method: 'DELETE',
        url: '/context/cache/:shardId',
        schema: {
            tags: ['AI Context'],
            summary: 'Invalidate cached context for a shard',
            params: {
                type: 'object',
                properties: { shardId: { type: 'string', format: 'uuid' } },
                required: ['shardId'],
            },
            response: {
                204: { type: 'null' },
            },
        },
        handler: controller.invalidateCache,
    });
    // ===============================================
    // TEMPLATE MANAGEMENT
    // ===============================================
    // List templates
    server.route({
        method: 'GET',
        url: '/templates',
        schema: {
            tags: ['AI Context'],
            summary: 'List available context templates',
            querystring: {
                type: 'object',
                properties: {
                    category: {
                        type: 'string',
                        enum: ['general', 'sales', 'support', 'technical', 'legal', 'financial', 'custom']
                    },
                    applicableShardType: { type: 'string', description: 'Filter by applicable shard type' },
                    includeSystem: { type: 'boolean', default: true, description: 'Include system templates' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        templates: { type: 'array', items: { type: 'object' } },
                        count: { type: 'integer' },
                    },
                },
            },
        },
        handler: controller.listTemplates,
    });
    // Get template by ID
    server.route({
        method: 'GET',
        url: '/templates/:id',
        schema: {
            tags: ['AI Context'],
            summary: 'Get a specific template',
            params: {
                type: 'object',
                properties: { id: { type: 'string' } },
                required: ['id'],
            },
            response: {
                200: { type: 'object' },
                404: { type: 'object', properties: { error: { type: 'string' } } },
            },
        },
        handler: controller.getTemplate,
    });
    // Get system template definitions
    server.route({
        method: 'GET',
        url: '/templates/system',
        schema: {
            tags: ['AI Context'],
            summary: 'Get system template definitions',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        templates: { type: 'array', items: { type: 'object' } },
                        count: { type: 'integer' },
                    },
                },
            },
        },
        handler: controller.getSystemTemplates,
    });
    // Select template for a shard
    server.route({
        method: 'POST',
        url: '/templates/select',
        schema: {
            tags: ['AI Context'],
            summary: 'Select the appropriate template for a shard',
            body: {
                type: 'object',
                properties: {
                    shardId: { type: 'string', description: 'Target shard ID' },
                    shardTypeName: { type: 'string', description: 'Shard type name' },
                    preferredTemplateId: { type: 'string', description: 'Preferred template ID' },
                    assistantId: { type: 'string', description: 'Assistant ID' },
                },
            },
            response: {
                200: { type: 'object' },
                404: { type: 'object', properties: { error: { type: 'string' } } },
            },
        },
        handler: controller.selectTemplate,
    });
}
//# sourceMappingURL=context-template.routes.js.map
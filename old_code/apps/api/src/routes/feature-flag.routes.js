/**
 * Feature Flag Routes
 *
 * REST API routes for managing feature flags.
 */
import { FeatureFlagController } from '../controllers/feature-flag.controller.js';
/**
 * Register feature flag routes
 */
export async function registerFeatureFlagRoutes(fastify, options) {
    const controller = new FeatureFlagController(options.monitoring);
    await controller.initialize();
    // ============================================================================
    // Collection Routes
    // ============================================================================
    /**
     * GET /api/v1/feature-flags
     * List all feature flags
     */
    fastify.get('/', {
        schema: {
            description: 'List all feature flags',
            tags: ['Feature Flags'],
            response: {
                200: {
                    description: 'List of feature flags',
                    type: 'object',
                    properties: {
                        flags: {
                            type: 'array',
                            items: { type: 'object' },
                        },
                        count: { type: 'number' },
                    },
                },
            },
        },
        handler: controller.listFeatureFlags,
    });
    /**
     * POST /api/v1/feature-flags
     * Create a new feature flag (admin only)
     */
    fastify.post('/', {
        schema: {
            description: 'Create a new feature flag',
            tags: ['Feature Flags'],
            body: {
                type: 'object',
                required: ['name', 'description', 'enabled'],
                properties: {
                    name: { type: 'string', description: 'Unique feature flag name' },
                    description: { type: 'string', description: 'Feature flag description' },
                    enabled: { type: 'boolean', description: 'Whether the flag is enabled' },
                    environments: {
                        type: 'array',
                        items: { type: 'string', enum: ['development', 'staging', 'production'] },
                        description: 'Environments where this flag applies',
                    },
                    roles: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'User roles that can access this feature',
                    },
                    percentage: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        description: 'Percentage rollout (0-100)',
                    },
                    tenantId: {
                        type: 'string',
                        description: 'Tenant ID for tenant-specific flag (omit for global)',
                    },
                },
            },
            response: {
                201: {
                    description: 'Feature flag created',
                    type: 'object',
                },
                400: { type: 'object', properties: { error: { type: 'string' } } },
                401: { type: 'object', properties: { error: { type: 'string' } } },
                403: { type: 'object', properties: { error: { type: 'string' } } },
            },
        },
        handler: controller.createFeatureFlag,
    });
    // ============================================================================
    // Individual Flag Routes
    // ============================================================================
    /**
     * GET /api/v1/feature-flags/:name
     * Get a specific feature flag
     */
    fastify.get('/:name', {
        schema: {
            description: 'Get a specific feature flag by name',
            tags: ['Feature Flags'],
            params: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', description: 'Feature flag name' },
                },
            },
            response: {
                200: {
                    description: 'Feature flag',
                    type: 'object',
                },
                404: { type: 'object', properties: { error: { type: 'string' } } },
            },
        },
        handler: controller.getFeatureFlag,
    });
    /**
     * GET /api/v1/feature-flags/:name/check
     * Check if a feature flag is enabled for the current context
     */
    fastify.get('/:name/check', {
        schema: {
            description: 'Check if a feature flag is enabled',
            tags: ['Feature Flags'],
            params: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', description: 'Feature flag name' },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    environment: {
                        type: 'string',
                        enum: ['development', 'staging', 'production'],
                        description: 'Environment to check',
                    },
                    userRole: { type: 'string', description: 'User role to check' },
                    userId: { type: 'string', description: 'User ID for percentage rollout' },
                },
            },
            response: {
                200: {
                    description: 'Feature flag check result',
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        enabled: { type: 'boolean' },
                        context: { type: 'object' },
                    },
                },
            },
        },
        handler: controller.checkFeatureFlag,
    });
    /**
     * PATCH /api/v1/feature-flags/:id
     * Update a feature flag (admin only)
     */
    fastify.patch('/:id', {
        schema: {
            description: 'Update a feature flag',
            tags: ['Feature Flags'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', description: 'Feature flag ID' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    enabled: { type: 'boolean', description: 'Whether the flag is enabled' },
                    description: { type: 'string', description: 'Feature flag description' },
                    environments: {
                        type: 'array',
                        items: { type: 'string', enum: ['development', 'staging', 'production'] },
                        description: 'Environments where this flag applies',
                    },
                    roles: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'User roles that can access this feature',
                    },
                    percentage: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        description: 'Percentage rollout (0-100)',
                    },
                },
            },
            response: {
                200: {
                    description: 'Feature flag updated',
                    type: 'object',
                },
                404: { type: 'object', properties: { error: { type: 'string' } } },
                403: { type: 'object', properties: { error: { type: 'string' } } },
            },
        },
        handler: controller.updateFeatureFlag,
    });
    /**
     * DELETE /api/v1/feature-flags/:id
     * Delete a feature flag (admin only)
     */
    fastify.delete('/:id', {
        schema: {
            description: 'Delete a feature flag',
            tags: ['Feature Flags'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', description: 'Feature flag ID' },
                },
            },
            response: {
                204: { description: 'Feature flag deleted' },
                404: { type: 'object', properties: { error: { type: 'string' } } },
                403: { type: 'object', properties: { error: { type: 'string' } } },
            },
        },
        handler: controller.deleteFeatureFlag,
    });
}
//# sourceMappingURL=feature-flag.routes.js.map
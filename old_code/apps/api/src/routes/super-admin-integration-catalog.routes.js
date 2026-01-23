/**
 * Super Admin Integration Catalog Routes
 *
 * REST API endpoints for managing the integration catalog
 * All routes require super admin authentication
 */
import { requireAuth, requireRole } from '../middleware/authorization.js';
/**
 * Register super admin integration catalog routes
 */
export async function registerSuperAdminIntegrationCatalogRoutes(fastify, controller) {
    // Get the authentication decorator from fastify
    const authDecorator = fastify.authenticate;
    if (!authDecorator) {
        fastify.log.warn('⚠️  Integration catalog routes not registered - authentication decorator missing');
        return;
    }
    // Authorization middlewares
    const superAdminAuth = [authDecorator, requireAuth(), requireRole('global_admin', 'super_admin', 'super-admin')];
    // ============================================
    // Catalog Entry Management
    // ============================================
    /**
     * POST /super-admin/integration-catalog
     * Create new integration in catalog
     */
    fastify.post('/super-admin/integration-catalog', {
        schema: {
            tags: ['super-admin', 'integration-catalog'],
            summary: 'Create new integration in catalog',
            body: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string', minLength: 1 },
                    name: { type: 'string', minLength: 1 },
                    displayName: { type: 'string', minLength: 1 },
                    description: { type: 'string' },
                    category: { type: 'string', enum: ['crm', 'communication', 'data_source', 'storage', 'custom', 'ai_provider'] },
                    icon: { type: 'string' },
                    color: { type: 'string' },
                    visibility: { type: 'string', enum: ['public', 'superadmin_only'] },
                    requiredPlan: { type: 'string', enum: ['free', 'pro', 'enterprise', 'premium'] },
                    capabilities: { type: 'array', items: { type: 'string' } },
                    supportedSyncDirections: { type: 'array', items: { type: 'string' } },
                    authType: { type: 'string', enum: ['oauth2', 'api_key', 'basic', 'custom'] },
                    supportedShardTypes: { type: 'array', items: { type: 'string' } },
                    shardMappings: { type: 'array' },
                },
                required: [
                    'integrationId',
                    'name',
                    'displayName',
                    'description',
                    'category',
                    'visibility',
                    'capabilities',
                    'supportedSyncDirections',
                    'authType',
                    'supportedShardTypes',
                    'shardMappings',
                ],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.createIntegration(request, reply));
    /**
     * GET /super-admin/integration-catalog
     * List all integrations in catalog
     */
    fastify.get('/super-admin/integration-catalog', {
        schema: {
            tags: ['super-admin', 'integration-catalog'],
            summary: 'List all integrations in catalog',
            // Accept any query params; controller will coerce/validate as needed
            querystring: { type: 'object', additionalProperties: true },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.listIntegrations(request, reply));
    /**
     * GET /super-admin/integration-catalog/:integrationId
     * Get integration details
     */
    fastify.get('/super-admin/integration-catalog/:integrationId', {
        schema: {
            tags: ['super-admin', 'integration-catalog'],
            summary: 'Get integration details',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                },
                required: ['integrationId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.getIntegration(request, reply));
    /**
     * PATCH /super-admin/integration-catalog/:integrationId
     * Update integration details
     */
    fastify.patch('/super-admin/integration-catalog/:integrationId', {
        schema: {
            tags: ['super-admin', 'integration-catalog'],
            summary: 'Update integration details',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                },
                required: ['integrationId'],
            },
            body: {
                type: 'object',
                properties: {
                    displayName: { type: 'string' },
                    description: { type: 'string' },
                    icon: { type: 'string' },
                    color: { type: 'string' },
                    visibility: { type: 'string', enum: ['public', 'superadmin_only'] },
                    requiredPlan: { type: 'string' },
                    capabilities: { type: 'array', items: { type: 'string' } },
                    supportedSyncDirections: { type: 'array', items: { type: 'string' } },
                    status: { type: 'string', enum: ['active', 'beta', 'deprecated', 'disabled'] },
                },
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.updateIntegration(request, reply));
    /**
     * DELETE /super-admin/integration-catalog/:integrationId
     * Delete integration from catalog
     */
    fastify.delete('/super-admin/integration-catalog/:integrationId', {
        schema: {
            tags: ['super-admin', 'integration-catalog'],
            summary: 'Delete integration from catalog',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                },
                required: ['integrationId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.deleteIntegration(request, reply));
    /**
     * POST /super-admin/integration-catalog/:integrationId/deprecate
     * Deprecate integration (soft delete)
     */
    fastify.post('/super-admin/integration-catalog/:integrationId/deprecate', {
        schema: {
            tags: ['super-admin', 'integration-catalog'],
            summary: 'Deprecate integration (soft delete)',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                },
                required: ['integrationId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.deprecateIntegration(request, reply));
    // ============================================
    // Shard Type Mappings
    // ============================================
    /**
     * GET /super-admin/integration-catalog/:integrationId/shard-mappings
     * Get shard type mappings
     */
    fastify.get('/super-admin/integration-catalog/:integrationId/shard-mappings', {
        schema: {
            tags: ['super-admin', 'integration-catalog'],
            summary: 'Get shard type mappings for integration',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                },
                required: ['integrationId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.getShardMappings(request, reply));
    /**
     * PATCH /super-admin/integration-catalog/:integrationId/shard-mappings
     * Update shard type mappings
     */
    fastify.patch('/super-admin/integration-catalog/:integrationId/shard-mappings', {
        schema: {
            tags: ['super-admin', 'integration-catalog'],
            summary: 'Update shard type mappings',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                },
                required: ['integrationId'],
            },
            body: {
                type: 'object',
                properties: {
                    mappings: { type: 'array' },
                },
                required: ['mappings'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.updateShardMappings(request, reply));
    // ============================================
    // Visibility Rules Management
    // ============================================
    /**
     * GET /super-admin/integration-catalog/:integrationId/visibility
     * Get all visibility rules for integration
     */
    fastify.get('/super-admin/integration-catalog/:integrationId/visibility', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'visibility'],
            summary: 'Get visibility rules for integration (across all tenants)',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                },
                required: ['integrationId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.getVisibilityRulesForIntegration(request, reply));
    /**
     * GET /super-admin/tenants/:tenantId/integration-visibility
     * Get all visibility rules for tenant
     */
    fastify.get('/super-admin/tenants/:tenantId/integration-visibility', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'visibility'],
            summary: 'Get visibility rules for tenant (across all integrations)',
            params: {
                type: 'object',
                properties: {
                    tenantId: { type: 'string' },
                },
                required: ['tenantId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.getVisibilityRulesForTenant(request, reply));
    /**
     * POST /super-admin/integration-catalog/:integrationId/visibility/:tenantId
     * Create or update visibility rule
     */
    fastify.post('/super-admin/integration-catalog/:integrationId/visibility/:tenantId', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'visibility'],
            summary: 'Create or update visibility rule for tenant',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                    tenantId: { type: 'string' },
                },
                required: ['integrationId', 'tenantId'],
            },
            body: {
                type: 'object',
                properties: {
                    isVisible: { type: 'boolean' },
                    isEnabled: { type: 'boolean' },
                    isApproved: { type: 'boolean' },
                    availableInPlan: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
                    customCapabilities: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.createOrUpdateVisibilityRule(request, reply));
    /**
     * POST /super-admin/integration-catalog/:integrationId/approve/:tenantId
     * Approve integration for tenant
     */
    fastify.post('/super-admin/integration-catalog/:integrationId/approve/:tenantId', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'visibility'],
            summary: 'Approve integration for tenant',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                    tenantId: { type: 'string' },
                },
                required: ['integrationId', 'tenantId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.approveIntegration(request, reply));
    /**
     * POST /super-admin/integration-catalog/:integrationId/deny/:tenantId
     * Deny integration for tenant
     */
    fastify.post('/super-admin/integration-catalog/:integrationId/deny/:tenantId', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'visibility'],
            summary: 'Deny integration for tenant',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                    tenantId: { type: 'string' },
                },
                required: ['integrationId', 'tenantId'],
            },
            body: {
                type: 'object',
                properties: {
                    reason: { type: 'string' },
                },
                required: ['reason'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.denyIntegration(request, reply));
    /**
     * POST /super-admin/integration-catalog/:integrationId/hide/:tenantId
     * Hide integration from tenant
     */
    fastify.post('/super-admin/integration-catalog/:integrationId/hide/:tenantId', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'visibility'],
            summary: 'Hide integration from tenant',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                    tenantId: { type: 'string' },
                },
                required: ['integrationId', 'tenantId'],
            },
            body: {
                type: 'object',
                properties: {
                    reason: { type: 'string' },
                },
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.hideIntegrationFromTenant(request, reply));
    /**
     * POST /super-admin/integration-catalog/:integrationId/show/:tenantId
     * Show integration to tenant
     */
    fastify.post('/super-admin/integration-catalog/:integrationId/show/:tenantId', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'visibility'],
            summary: 'Show integration to tenant',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                    tenantId: { type: 'string' },
                },
                required: ['integrationId', 'tenantId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.showIntegrationToTenant(request, reply));
    // ============================================
    // Whitelist & Blocking Management
    // ============================================
    /**
     * POST /super-admin/integration-catalog/:integrationId/whitelist/:tenantId
     * Add tenant to whitelist
     */
    fastify.post('/super-admin/integration-catalog/:integrationId/whitelist/:tenantId', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'whitelist'],
            summary: 'Add tenant to integration whitelist',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                    tenantId: { type: 'string' },
                },
                required: ['integrationId', 'tenantId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.addTenantToWhitelist(request, reply));
    /**
     * DELETE /super-admin/integration-catalog/:integrationId/whitelist/:tenantId
     * Remove tenant from whitelist
     */
    fastify.delete('/super-admin/integration-catalog/:integrationId/whitelist/:tenantId', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'whitelist'],
            summary: 'Remove tenant from integration whitelist',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                    tenantId: { type: 'string' },
                },
                required: ['integrationId', 'tenantId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.removeTenantFromWhitelist(request, reply));
    /**
     * POST /super-admin/integration-catalog/:integrationId/block/:tenantId
     * Block tenant from integration
     */
    fastify.post('/super-admin/integration-catalog/:integrationId/block/:tenantId', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'blocking'],
            summary: 'Block tenant from using integration',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                    tenantId: { type: 'string' },
                },
                required: ['integrationId', 'tenantId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.blockTenant(request, reply));
    /**
     * DELETE /super-admin/integration-catalog/:integrationId/block/:tenantId
     * Unblock tenant
     */
    fastify.delete('/super-admin/integration-catalog/:integrationId/block/:tenantId', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'blocking'],
            summary: 'Unblock tenant from integration',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                    tenantId: { type: 'string' },
                },
                required: ['integrationId', 'tenantId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.unblockTenant(request, reply));
    /**
     * POST /super-admin/integration-catalog/:integrationId/make-public
     * Make integration available to all tenants
     */
    fastify.post('/super-admin/integration-catalog/:integrationId/make-public', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'whitelist'],
            summary: 'Make integration available to all tenants',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                },
                required: ['integrationId'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.makePublic(request, reply));
    /**
     * POST /super-admin/integration-catalog/:integrationId/make-private
     * Make integration available to whitelist only
     */
    fastify.post('/super-admin/integration-catalog/:integrationId/make-private', {
        schema: {
            tags: ['super-admin', 'integration-catalog', 'whitelist'],
            summary: 'Make integration available to whitelist only',
            params: {
                type: 'object',
                properties: {
                    integrationId: { type: 'string' },
                },
                required: ['integrationId'],
            },
            body: {
                type: 'object',
                properties: {
                    allowedTenants: { type: 'array', items: { type: 'string' } },
                },
                required: ['allowedTenants'],
            },
        },
        onRequest: superAdminAuth,
    }, (request, reply) => controller.makePrivate(request, reply));
}
//# sourceMappingURL=super-admin-integration-catalog.routes.js.map
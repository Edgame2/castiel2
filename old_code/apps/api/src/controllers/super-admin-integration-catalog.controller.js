/**
 * Super Admin Integration Catalog Controller
 *
 * REST API endpoints for managing the integration catalog
 * Only accessible to super admins
 */
/**
 * Super Admin Integration Catalog Controller
 */
export class SuperAdminIntegrationCatalogController {
    catalogService;
    catalogRepository;
    constructor(catalogService, catalogRepository) {
        this.catalogService = catalogService;
        this.catalogRepository = catalogRepository;
    }
    // ============================================
    // Catalog Entry Management Endpoints
    // ============================================
    /**
     * POST /api/super-admin/integration-catalog
     * Create new integration in catalog
     */
    async createIntegration(request, reply) {
        try {
            const input = request.body;
            const userId = request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const result = await this.catalogService.createIntegration({
                ...input,
                createdBy: userId,
            });
            return reply.status(201).send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to create integration',
            });
        }
    }
    /**
     * GET /api/super-admin/integration-catalog/:integrationId
     * Get integration details
     */
    async getIntegration(request, reply) {
        try {
            const { integrationId } = request.params;
            const result = await this.catalogService.getIntegration(integrationId);
            if (!result) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to fetch integration',
            });
        }
    }
    /**
     * GET /api/super-admin/integration-catalog
     * List all integrations in catalog
     */
    async listIntegrations(request, reply) {
        try {
            const { limit = 20, offset = 0, category, status, visibility, requiredPlan, searchTerm, beta, deprecated } = request.query;
            const options = {
                limit: parseInt(limit),
                offset: parseInt(offset),
                filter: {
                    ...(category && { category }),
                    ...(status && { status }),
                    ...(visibility && { visibility }),
                    ...(requiredPlan && { requiredPlan }),
                    ...(searchTerm && { searchTerm }),
                    ...(beta !== undefined && { beta: beta === 'true' }),
                    ...(deprecated !== undefined && { deprecated: deprecated === 'true' }),
                },
            };
            const result = await this.catalogService.listIntegrations(options);
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to list integrations',
            });
        }
    }
    /**
     * PATCH /api/super-admin/integration-catalog/:integrationId
     * Update integration details
     */
    async updateIntegration(request, reply) {
        try {
            const { integrationId } = request.params;
            const input = request.body;
            const userId = request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const result = await this.catalogService.updateIntegration(integrationId, {
                ...input,
                updatedBy: userId,
            });
            if (!result) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to update integration',
            });
        }
    }
    /**
     * DELETE /api/super-admin/integration-catalog/:integrationId
     * Delete integration from catalog
     */
    async deleteIntegration(request, reply) {
        try {
            const { integrationId } = request.params;
            const success = await this.catalogService.deleteIntegration(integrationId);
            if (!success) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            return reply.status(204).send();
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to delete integration',
            });
        }
    }
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/deprecate
     * Deprecate integration (soft delete)
     */
    async deprecateIntegration(request, reply) {
        try {
            const { integrationId } = request.params;
            const userId = request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const result = await this.catalogService.deprecateIntegration(integrationId, userId);
            if (!result) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to deprecate integration',
            });
        }
    }
    // ============================================
    // Shard Type Mappings
    // ============================================
    /**
     * GET /api/super-admin/integration-catalog/:integrationId/shard-mappings
     * Get shard type mappings
     */
    async getShardMappings(request, reply) {
        try {
            const { integrationId } = request.params;
            const integration = await this.catalogService.getIntegration(integrationId);
            if (!integration) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            return reply.send({
                integrationId,
                shardMappings: integration.shardMappings,
                supportedShardTypes: integration.supportedShardTypes,
                relationshipMappings: integration.relationshipMappings,
            });
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to fetch shard mappings',
            });
        }
    }
    /**
     * PATCH /api/super-admin/integration-catalog/:integrationId/shard-mappings
     * Update shard type mappings
     */
    async updateShardMappings(request, reply) {
        try {
            const { integrationId } = request.params;
            const { mappings } = request.body;
            const userId = request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const result = await this.catalogService.updateShardMappings(integrationId, mappings, userId);
            if (!result) {
                return reply.status(404).send({ error: 'Integration not found' });
            }
            return reply.send({
                integrationId,
                shardMappings: result.shardMappings,
                supportedShardTypes: result.supportedShardTypes,
            });
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to update shard mappings',
            });
        }
    }
    // ============================================
    // Visibility Rules Management
    // ============================================
    /**
     * GET /api/super-admin/integration-catalog/:integrationId/visibility
     * Get all visibility rules for integration
     */
    async getVisibilityRulesForIntegration(request, reply) {
        try {
            const { integrationId } = request.params;
            const rules = await this.catalogService.getVisibilityRulesForIntegration(integrationId);
            return reply.send(rules);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to fetch visibility rules',
            });
        }
    }
    /**
     * GET /api/super-admin/tenants/:tenantId/integration-visibility
     * Get all visibility rules for tenant
     */
    async getVisibilityRulesForTenant(request, reply) {
        try {
            const { tenantId } = request.params;
            const rules = await this.catalogService.getVisibilityRulesForTenant(tenantId);
            return reply.send(rules);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to fetch visibility rules',
            });
        }
    }
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/visibility/:tenantId
     * Create or update visibility rule
     */
    async createOrUpdateVisibilityRule(request, reply) {
        try {
            const { integrationId, tenantId } = request.params;
            const input = request.body;
            let rule = await this.catalogService.getVisibilityRule(tenantId, integrationId);
            if (rule) {
                rule = await this.catalogService.updateVisibilityRule(rule.id, tenantId, input);
                return reply.send(rule);
            }
            rule = await this.catalogService.createVisibilityRule({
                tenantId,
                integrationId,
                ...input,
            });
            return reply.status(201).send(rule);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to manage visibility rule',
            });
        }
    }
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/approve/:tenantId
     * Approve integration for tenant
     */
    async approveIntegration(request, reply) {
        try {
            const { integrationId, tenantId } = request.params;
            const userId = request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const result = await this.catalogService.approveIntegration(tenantId, integrationId, userId);
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to approve integration',
            });
        }
    }
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/deny/:tenantId
     * Deny integration for tenant
     */
    async denyIntegration(request, reply) {
        try {
            const { integrationId, tenantId } = request.params;
            const { reason } = request.body;
            const userId = request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const result = await this.catalogService.denyIntegration(tenantId, integrationId, reason, userId);
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to deny integration',
            });
        }
    }
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/hide/:tenantId
     * Hide integration from tenant
     */
    async hideIntegrationFromTenant(request, reply) {
        try {
            const { integrationId, tenantId } = request.params;
            const { reason } = request.body;
            const result = await this.catalogService.hideIntegrationFromTenant(tenantId, integrationId, reason);
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to hide integration',
            });
        }
    }
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/show/:tenantId
     * Show integration to tenant
     */
    async showIntegrationToTenant(request, reply) {
        try {
            const { integrationId, tenantId } = request.params;
            const result = await this.catalogService.showIntegrationToTenant(tenantId, integrationId);
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to show integration',
            });
        }
    }
    // ============================================
    // Whitelist & Blocking Management
    // ============================================
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/whitelist/:tenantId
     * Add tenant to whitelist
     */
    async addTenantToWhitelist(request, reply) {
        try {
            const { integrationId, tenantId } = request.params;
            const userId = request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const result = await this.catalogService.addTenantToWhitelist(integrationId, tenantId, userId);
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to add tenant to whitelist',
            });
        }
    }
    /**
     * DELETE /api/super-admin/integration-catalog/:integrationId/whitelist/:tenantId
     * Remove tenant from whitelist
     */
    async removeTenantFromWhitelist(request, reply) {
        try {
            const { integrationId, tenantId } = request.params;
            const userId = request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const result = await this.catalogService.removeTenantFromWhitelist(integrationId, tenantId, userId);
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to remove tenant from whitelist',
            });
        }
    }
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/block/:tenantId
     * Block tenant from integration
     */
    async blockTenant(request, reply) {
        try {
            const { integrationId, tenantId } = request.params;
            const userId = request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const result = await this.catalogService.blockTenant(integrationId, tenantId, userId);
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to block tenant',
            });
        }
    }
    /**
     * DELETE /api/super-admin/integration-catalog/:integrationId/block/:tenantId
     * Unblock tenant
     */
    async unblockTenant(request, reply) {
        try {
            const { integrationId, tenantId } = request.params;
            const userId = request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const result = await this.catalogService.unblockTenant(integrationId, tenantId, userId);
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to unblock tenant',
            });
        }
    }
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/make-public
     * Make integration available to all tenants
     */
    async makePublic(request, reply) {
        try {
            const { integrationId } = request.params;
            const userId = request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const result = await this.catalogService.makePublic(integrationId, userId);
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to make integration public',
            });
        }
    }
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/make-private
     * Make integration available to whitelist only
     */
    async makePrivate(request, reply) {
        try {
            const { integrationId } = request.params;
            const { allowedTenants } = request.body;
            const userId = request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const result = await this.catalogService.makePrivate(integrationId, allowedTenants, userId);
            return reply.send(result);
        }
        catch (error) {
            return reply.status(400).send({
                error: error.message || 'Failed to make integration private',
            });
        }
    }
}
//# sourceMappingURL=super-admin-integration-catalog.controller.js.map
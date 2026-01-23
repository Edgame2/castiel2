/**
 * Super Admin Integration Catalog Controller
 *
 * REST API endpoints for managing the integration catalog
 * Only accessible to super admins
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { IntegrationCatalogService } from '../services/integration-catalog.service.js';
import { IntegrationCatalogRepository } from '../repositories/integration-catalog.repository.js';
/**
 * Super Admin Integration Catalog Controller
 */
export declare class SuperAdminIntegrationCatalogController {
    private catalogService;
    private catalogRepository;
    constructor(catalogService: IntegrationCatalogService, catalogRepository: IntegrationCatalogRepository);
    /**
     * POST /api/super-admin/integration-catalog
     * Create new integration in catalog
     */
    createIntegration(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/super-admin/integration-catalog/:integrationId
     * Get integration details
     */
    getIntegration(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/super-admin/integration-catalog
     * List all integrations in catalog
     */
    listIntegrations(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * PATCH /api/super-admin/integration-catalog/:integrationId
     * Update integration details
     */
    updateIntegration(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * DELETE /api/super-admin/integration-catalog/:integrationId
     * Delete integration from catalog
     */
    deleteIntegration(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/deprecate
     * Deprecate integration (soft delete)
     */
    deprecateIntegration(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/super-admin/integration-catalog/:integrationId/shard-mappings
     * Get shard type mappings
     */
    getShardMappings(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * PATCH /api/super-admin/integration-catalog/:integrationId/shard-mappings
     * Update shard type mappings
     */
    updateShardMappings(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/super-admin/integration-catalog/:integrationId/visibility
     * Get all visibility rules for integration
     */
    getVisibilityRulesForIntegration(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/super-admin/tenants/:tenantId/integration-visibility
     * Get all visibility rules for tenant
     */
    getVisibilityRulesForTenant(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/visibility/:tenantId
     * Create or update visibility rule
     */
    createOrUpdateVisibilityRule(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/approve/:tenantId
     * Approve integration for tenant
     */
    approveIntegration(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/deny/:tenantId
     * Deny integration for tenant
     */
    denyIntegration(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/hide/:tenantId
     * Hide integration from tenant
     */
    hideIntegrationFromTenant(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/show/:tenantId
     * Show integration to tenant
     */
    showIntegrationToTenant(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/whitelist/:tenantId
     * Add tenant to whitelist
     */
    addTenantToWhitelist(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * DELETE /api/super-admin/integration-catalog/:integrationId/whitelist/:tenantId
     * Remove tenant from whitelist
     */
    removeTenantFromWhitelist(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/block/:tenantId
     * Block tenant from integration
     */
    blockTenant(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * DELETE /api/super-admin/integration-catalog/:integrationId/block/:tenantId
     * Unblock tenant
     */
    unblockTenant(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/make-public
     * Make integration available to all tenants
     */
    makePublic(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/super-admin/integration-catalog/:integrationId/make-private
     * Make integration available to whitelist only
     */
    makePrivate(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=super-admin-integration-catalog.controller.d.ts.map
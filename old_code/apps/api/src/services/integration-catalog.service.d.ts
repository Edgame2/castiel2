/**
 * Integration Catalog Service
 *
 * Business logic for managing the integration catalog
 */
import { IntegrationCatalogEntry, CreateIntegrationCatalogInput, UpdateIntegrationCatalogInput, CatalogListOptions, CatalogListResult, IntegrationVisibilityRule, CreateVisibilityRuleInput, UpdateVisibilityRuleInput, EntityToShardTypeMapping } from '../types/integration.types.js';
import { IntegrationCatalogRepository } from '../repositories/integration-catalog.repository.js';
/**
 * Integration Catalog Service
 * Manages catalog operations for super admins
 */
export declare class IntegrationCatalogService {
    private catalogRepository;
    constructor(catalogRepository: IntegrationCatalogRepository);
    /**
     * Create new integration in catalog
     */
    createIntegration(input: CreateIntegrationCatalogInput): Promise<IntegrationCatalogEntry>;
    /**
     * Get integration details
     */
    getIntegration(integrationId: string): Promise<IntegrationCatalogEntry | null>;
    /**
     * List all integrations in catalog
     */
    listIntegrations(options?: CatalogListOptions): Promise<CatalogListResult>;
    /**
     * Update integration in catalog
     */
    updateIntegration(integrationId: string, input: UpdateIntegrationCatalogInput): Promise<IntegrationCatalogEntry | null>;
    /**
     * Delete integration from catalog
     */
    deleteIntegration(integrationId: string): Promise<boolean>;
    /**
     * Deprecate integration (soft delete)
     * Marks as deprecated so existing connections continue working but no new ones can be created
     */
    deprecateIntegration(integrationId: string, updatedBy: string): Promise<IntegrationCatalogEntry | null>;
    /**
     * Get integrations by category
     */
    getIntegrationsByCategory(category: string): Promise<IntegrationCatalogEntry[]>;
    /**
     * Get premium integrations
     */
    getPremiumIntegrations(): Promise<IntegrationCatalogEntry[]>;
    /**
     * Update integration's shard type mappings
     * Critical for defining which shard types this integration can sync to
     */
    updateShardMappings(integrationId: string, mappings: EntityToShardTypeMapping[], updatedBy: string): Promise<IntegrationCatalogEntry | null>;
    /**
     * Validate shard type mappings
     */
    private validateShardMappings;
    /**
     * Create visibility rule for tenant
     */
    createVisibilityRule(input: CreateVisibilityRuleInput): Promise<IntegrationVisibilityRule>;
    /**
     * Get visibility rule
     */
    getVisibilityRule(tenantId: string, integrationId: string): Promise<IntegrationVisibilityRule | null>;
    /**
     * Update visibility rule
     */
    updateVisibilityRule(id: string, tenantId: string, input: UpdateVisibilityRuleInput): Promise<IntegrationVisibilityRule | null>;
    /**
     * Approve integration for tenant
     */
    approveIntegration(tenantId: string, integrationId: string, approvedBy: string): Promise<IntegrationVisibilityRule | null>;
    /**
     * Deny integration for tenant
     */
    denyIntegration(tenantId: string, integrationId: string, denialReason: string, approvedBy: string): Promise<IntegrationVisibilityRule | null>;
    /**
     * Hide integration from tenant
     */
    hideIntegrationFromTenant(tenantId: string, integrationId: string, reason?: string): Promise<IntegrationVisibilityRule | null>;
    /**
     * Show integration to tenant
     */
    showIntegrationToTenant(tenantId: string, integrationId: string): Promise<IntegrationVisibilityRule | null>;
    /**
     * Restrict integration capabilities for tenant
     */
    restrictCapabilitiesForTenant(tenantId: string, integrationId: string, allowedCapabilities: string[], restrictedBy: string): Promise<IntegrationVisibilityRule | null>;
    /**
     * Get visibility rules for integration (across all tenants)
     */
    getVisibilityRulesForIntegration(integrationId: string): Promise<IntegrationVisibilityRule[]>;
    /**
     * Get visibility rules for tenant (across all integrations)
     */
    getVisibilityRulesForTenant(tenantId: string): Promise<IntegrationVisibilityRule[]>;
    /**
     * Add tenant to whitelist for integration
     */
    addTenantToWhitelist(integrationId: string, tenantId: string, updatedBy: string): Promise<IntegrationCatalogEntry | null>;
    /**
     * Remove tenant from whitelist
     */
    removeTenantFromWhitelist(integrationId: string, tenantId: string, updatedBy: string): Promise<IntegrationCatalogEntry | null>;
    /**
     * Block tenant from using integration
     */
    blockTenant(integrationId: string, tenantId: string, updatedBy: string): Promise<IntegrationCatalogEntry | null>;
    /**
     * Unblock tenant
     */
    unblockTenant(integrationId: string, tenantId: string, updatedBy: string): Promise<IntegrationCatalogEntry | null>;
    /**
     * Make integration available to all tenants (remove whitelist)
     */
    makePublic(integrationId: string, updatedBy: string): Promise<IntegrationCatalogEntry | null>;
    /**
     * Make integration private (enable whitelist mode)
     */
    makePrivate(integrationId: string, allowedTenants: string[], updatedBy: string): Promise<IntegrationCatalogEntry | null>;
}
//# sourceMappingURL=integration-catalog.service.d.ts.map
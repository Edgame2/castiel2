/**
 * Integration Catalog Repository
 *
 * Manages integration catalog entries and visibility rules.
 * Stores catalog definitions managed by super admins.
 */
import { Container, CosmosClient } from '@azure/cosmos';
import { IntegrationCatalogEntry, CreateIntegrationCatalogInput, UpdateIntegrationCatalogInput, CatalogListOptions, CatalogListResult, IntegrationVisibilityRule, CreateVisibilityRuleInput, UpdateVisibilityRuleInput } from '../types/integration.types.js';
/**
 * Integration Catalog Repository
 * Manages system-wide integration catalog
 */
export declare class IntegrationCatalogRepository {
    private catalogContainer;
    private visibilityContainer;
    constructor(client: CosmosClient, databaseId: string, catalogContainerId?: string, visibilityContainerId?: string);
    /**
     * Ensure containers exist
     */
    static ensureContainers(client: CosmosClient, databaseId: string, catalogContainerId?: string, visibilityContainerId?: string): Promise<{
        catalog: Container;
        visibility: Container;
    }>;
    /**
     * Create catalog entry
     */
    createCatalogEntry(input: CreateIntegrationCatalogInput): Promise<IntegrationCatalogEntry>;
    /**
     * Get catalog entry by ID
     */
    getCatalogEntry(id: string, category: string): Promise<IntegrationCatalogEntry | null>;
    /**
     * Get catalog entry by integration ID
     */
    getCatalogEntryByIntegrationId(integrationId: string): Promise<IntegrationCatalogEntry | null>;
    /**
     * List catalog entries
     */
    listCatalogEntries(options?: CatalogListOptions): Promise<CatalogListResult>;
    /**
     * Update catalog entry
     */
    updateCatalogEntry(id: string, category: string, input: UpdateIntegrationCatalogInput): Promise<IntegrationCatalogEntry | null>;
    /**
     * Delete catalog entry
     */
    deleteCatalogEntry(id: string, category: string): Promise<boolean>;
    /**
     * Deprecate integration (soft delete)
     */
    deprecateCatalogEntry(id: string, category: string, updatedBy: string): Promise<IntegrationCatalogEntry | null>;
    /**
     * Get integrations by category
     */
    getCatalogEntriesByCategory(category: string): Promise<IntegrationCatalogEntry[]>;
    /**
     * Create visibility rule
     */
    createVisibilityRule(input: CreateVisibilityRuleInput): Promise<IntegrationVisibilityRule>;
    /**
     * Get visibility rule
     */
    getVisibilityRule(id: string, tenantId: string): Promise<IntegrationVisibilityRule | null>;
    /**
     * Get visibility rule by tenant and integration
     */
    getVisibilityRuleByTenantAndIntegration(tenantId: string, integrationId: string): Promise<IntegrationVisibilityRule | null>;
    /**
     * List visibility rules for tenant
     */
    listVisibilityRulesForTenant(tenantId: string): Promise<IntegrationVisibilityRule[]>;
    /**
     * List visibility rules for integration
     */
    listVisibilityRulesForIntegration(integrationId: string): Promise<IntegrationVisibilityRule[]>;
    /**
     * Update visibility rule
     */
    updateVisibilityRule(id: string, tenantId: string, input: UpdateVisibilityRuleInput): Promise<IntegrationVisibilityRule | null>;
    /**
     * Delete visibility rule
     */
    deleteVisibilityRule(id: string, tenantId: string): Promise<boolean>;
    /**
     * Approve integration for tenant
     */
    approveIntegrationForTenant(id: string, tenantId: string, approvedBy: string): Promise<IntegrationVisibilityRule | null>;
    /**
     * Deny integration for tenant
     */
    denyIntegrationForTenant(id: string, tenantId: string, denialReason: string, approvedBy: string): Promise<IntegrationVisibilityRule | null>;
    /**
     * Get integrations with specific tier requirement
     */
    getCatalogEntriesByPlan(requiredPlan: string): Promise<IntegrationCatalogEntry[]>;
}
//# sourceMappingURL=integration-catalog.repository.d.ts.map
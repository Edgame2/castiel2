/**
 * Integration Visibility Service
 *
 * Filters integrations based on tenant tier, visibility rules,
 * whitelisting, and blocking settings.
 */
import { IntegrationCatalogEntry, IntegrationVisibilityRule, TenantCatalogView } from '../types/integration.types.js';
import { IntegrationCatalogRepository } from '../repositories/integration-catalog.repository.js';
interface TenantContext {
    tenantId: string;
    pricingTier?: 'free' | 'pro' | 'enterprise';
    superAdmin: boolean;
}
/**
 * Integration Visibility Service
 * Determines which integrations are visible/available for a tenant
 */
export declare class IntegrationVisibilityService {
    private catalogRepository;
    constructor(catalogRepository: IntegrationCatalogRepository);
    /**
     * Get filtered integrations for a tenant
     * Applies visibility rules, pricing restrictions, whitelisting, etc.
     */
    getTenantCatalogView(tenantContext: TenantContext): Promise<TenantCatalogView>;
    /**
     * Check if integration is available for tenant
     */
    isIntegrationAvailable(tenantContext: TenantContext, integrationId: string): Promise<{
        available: boolean;
        reason?: 'requires_plan' | 'requires_approval' | 'blocked' | 'superadmin_only';
        message?: string;
    }>;
    /**
     * Get integration with applied visibility rules for tenant
     */
    getIntegrationForTenant(tenantContext: TenantContext, integrationId: string): Promise<(IntegrationCatalogEntry & {
        visibilityRule?: IntegrationVisibilityRule;
    }) | null>;
    /**
     * Get effective rate limit for tenant/integration
     * Considers both catalog defaults and custom tenant overrides
     */
    getEffectiveRateLimit(tenantContext: TenantContext, integrationId: string): Promise<{
        requestsPerMinute: number;
        requestsPerHour: number;
    } | null>;
    /**
     * Get effective capabilities for tenant/integration
     * Considers both catalog and custom tenant overrides
     */
    getEffectiveCapabilities(tenantContext: TenantContext, integrationId: string): Promise<string[] | null>;
    /**
     * Get effective sync directions for tenant/integration
     */
    getEffectiveSyncDirections(tenantContext: TenantContext, integrationId: string): Promise<('pull' | 'push' | 'bidirectional')[] | null>;
    /**
     * Convert pricing tier to numeric level for comparison
     */
    private getTierLevel;
}
export {};
//# sourceMappingURL=integration-visibility.service.d.ts.map
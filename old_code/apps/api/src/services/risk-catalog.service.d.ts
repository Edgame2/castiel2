/**
 * Risk Catalog Service
 * Manages risk catalog definitions (global, industry, tenant-specific)
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import type { RiskCatalog, CreateRiskInput, UpdateRiskInput } from '../types/risk-analysis.types.js';
export declare class RiskCatalogService {
    private monitoring;
    private shardRepository;
    private shardTypeRepository;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository);
    /**
     * Ensure the risk catalog shard type exists, create it if it doesn't
     */
    private ensureShardType;
    /**
     * Get applicable risk catalog for a tenant
     * Returns global, industry-specific (if applicable), and tenant-specific risks
     */
    getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>;
    /**
     * Create a risk (global, industry, or tenant-specific based on user role)
     */
    createCustomRisk(tenantId: string, userId: string, input: CreateRiskInput, userRoles?: string[]): Promise<RiskCatalog>;
    /**
     * Update a risk catalog entry
     */
    updateRisk(riskId: string, tenantId: string, userId: string, updates: UpdateRiskInput): Promise<RiskCatalog>;
    /**
     * Duplicate a global or industry risk to tenant-specific
     * Allows tenant admins to create a tenant-specific copy of a global/industry risk
     */
    duplicateRisk(sourceRiskId: string, sourceCatalogType: 'global' | 'industry', sourceIndustryId: string | undefined, targetTenantId: string, userId: string, newRiskId?: string): Promise<RiskCatalog>;
    /**
     * Enable or disable a global/industry risk for a specific tenant
     * Creates a tenant-specific override that controls visibility
     */
    setRiskEnabledForTenant(riskId: string, catalogType: 'global' | 'industry', industryId: string | undefined, tenantId: string, userId: string, enabled: boolean): Promise<void>;
    /**
     * Delete a risk catalog entry (tenant-specific only)
     */
    deleteRisk(riskId: string, tenantId: string, userId: string): Promise<void>;
    /**
     * Get effective ponderation (weight) for a risk
     * Checks for tenant/industry/opportunity_type overrides
     */
    getPonderation(riskId: string, tenantId: string, industryId?: string, opportunityType?: string): Promise<number>;
    /**
     * Convert shard to RiskCatalog
     */
    private shardToRiskCatalog;
}
//# sourceMappingURL=risk-catalog.service.d.ts.map
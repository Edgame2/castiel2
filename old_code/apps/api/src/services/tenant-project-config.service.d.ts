/**
 * Tenant Project Configuration Service
 * Manages tenant-specific project settings with caching and validation
 */
import { CosmosDBService } from './cosmos-db.service.js';
import { CacheService } from './cache.service.js';
import type { TenantProjectSettings, SystemProjectSettings, UpdateTenantProjectSettingsInput } from '../types/tenant-project-config.types.js';
export declare class TenantProjectConfigService {
    private cosmosDb;
    private cache;
    private logger;
    constructor(cosmosDb: CosmosDBService, cache: CacheService | null);
    /**
     * Get tenant project settings with caching
     */
    getTenantConfig(tenantId: string): Promise<TenantProjectSettings>;
    /**
     * Update tenant project settings
     */
    updateTenantConfig(tenantId: string, input: UpdateTenantProjectSettingsInput, updatedBy: string): Promise<TenantProjectSettings>;
    /**
     * Reset tenant config to system defaults
     */
    resetToDefaults(tenantId: string, updatedBy: string): Promise<TenantProjectSettings>;
    /**
     * Get system project settings
     */
    getSystemConfig(): Promise<SystemProjectSettings>;
    /**
     * Update system project settings (super admin only)
     */
    updateSystemConfig(updates: Partial<SystemProjectSettings>, updatedBy: string): Promise<SystemProjectSettings>;
    /**
     * Validate configuration input
     */
    private validateConfigInput;
    /**
     * Get default tenant configuration
     */
    private getDefaultTenantConfig;
    /**
     * Get default system configuration
     */
    private getDefaultSystemConfig;
}
//# sourceMappingURL=tenant-project-config.service.d.ts.map
import { SystemConfigRepository } from '../repositories/system-config.repository.js';
import { TenantRepository } from '../repositories/tenant.repository.js';
import { GlobalDocumentSettings, TenantDocumentSettings } from '../types/document.types.js';
export declare class DocumentSettingsService {
    private systemConfigRepository;
    private tenantRepository;
    constructor(systemConfigRepository: SystemConfigRepository, tenantRepository: TenantRepository);
    /**
     * Get global settings, returning defaults if not configured
     */
    getGlobalSettings(): Promise<GlobalDocumentSettings>;
    /**
     * Get tenant settings, returning defaults (based on global) if not configured
     */
    getTenantSettings(tenantId: string): Promise<TenantDocumentSettings>;
    /**
   * Update global settings
   */
    updateGlobalSettings(updates: Partial<GlobalDocumentSettings>, updatedBy: string): Promise<GlobalDocumentSettings>;
    /**
     * Update tenant settings
     */
    updateTenantSettings(tenantId: string, updates: Partial<TenantDocumentSettings>, updatedBy: string): Promise<TenantDocumentSettings>;
    /**
     * Get both settings for validation
     */
    getFullConfiguration(tenantId: string): Promise<{
        globalSettings: GlobalDocumentSettings;
        tenantSettings: TenantDocumentSettings;
    }>;
    /**
     * Generate default tenant settings based on global configuration
     * Public method for use in migration scripts
     */
    generateDefaultTenantSettings(global: GlobalDocumentSettings): TenantDocumentSettings;
    /**
     * Get hardcoded default global settings (bootstrap)
     */
    private getDefaultGlobalSettings;
}
//# sourceMappingURL=document-settings.service.d.ts.map
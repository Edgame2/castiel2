
import { SystemConfigRepository } from '../repositories/system-config.repository.js';
import { TenantRepository } from '../repositories/tenant.repository.js';
import {
    GlobalDocumentSettings,
    TenantDocumentSettings,
    DocumentCategory,
} from '../types/document.types.js';

export class DocumentSettingsService {
    constructor(
        private systemConfigRepository: SystemConfigRepository,
        private tenantRepository: TenantRepository
    ) { }

    /**
     * Get global settings, returning defaults if not configured
     */
    async getGlobalSettings(): Promise<GlobalDocumentSettings> {
        const settings = await this.systemConfigRepository.getDocumentSettings();
        if (settings) {
            return settings;
        }
        return this.getDefaultGlobalSettings();
    }

    /**
     * Get tenant settings, returning defaults (based on global) if not configured
     */
    async getTenantSettings(tenantId: string): Promise<TenantDocumentSettings> {
        const tenant = await this.tenantRepository.getTenant(tenantId);
        const globalSettings = await this.getGlobalSettings();

        // Use stored settings if they exist
        if (tenant?.documentSettings) {
            return tenant.documentSettings;
        }

        // Otherwise generate defaults from global settings
        return this.generateDefaultTenantSettings(globalSettings);
    }

    /**
   * Update global settings
   */
    async updateGlobalSettings(
        updates: Partial<GlobalDocumentSettings>,
        updatedBy: string
    ): Promise<GlobalDocumentSettings> {
        const current = await this.getGlobalSettings();
        const updated: GlobalDocumentSettings = {
            ...current,
            ...updates,
            updatedAt: new Date(),
            updatedBy,
        };

        await this.systemConfigRepository.updateDocumentSettings(updated);
        return updated;
    }

    /**
     * Update tenant settings
     */
    async updateTenantSettings(
        tenantId: string,
        updates: Partial<TenantDocumentSettings>,
        updatedBy: string
    ): Promise<TenantDocumentSettings> {
        const current = await this.getTenantSettings(tenantId);

        // Ensure we don't exceed global limits (simple validation)
        const global = await this.getGlobalSettings();

        if (updates.maxFileSizeBytes && updates.maxFileSizeBytes > global.globalMaxFileSizeBytes) {
            throw new Error(`Cannot exceed global max file size (${global.globalMaxFileSizeBytes})`);
        }

        const updated: TenantDocumentSettings = {
            ...current,
            ...updates,
            updatedAt: new Date() as any, // Cast for string compatibility if needed
            updatedBy,
        };

        await this.tenantRepository.updateTenantDocumentSettings(tenantId, updated);
        return updated;
    }

    /**
     * Get both settings for validation
     */
    async getFullConfiguration(tenantId: string): Promise<{
        globalSettings: GlobalDocumentSettings;
        tenantSettings: TenantDocumentSettings;
    }> {
        const globalSettings = await this.getGlobalSettings();
        let tenantSettings = (await this.tenantRepository.getTenant(tenantId))?.documentSettings;

        if (!tenantSettings) {
            tenantSettings = this.generateDefaultTenantSettings(globalSettings);
        }

        return { globalSettings, tenantSettings };
    }

    /**
     * Generate default tenant settings based on global configuration
     * Public method for use in migration scripts
     */
    generateDefaultTenantSettings(
        global: GlobalDocumentSettings
    ): TenantDocumentSettings {

        // Default categories if none exist
        const defaultCategories: DocumentCategory[] = global.defaultCategories || [];

        return {
            maxFileSizeBytes: global.defaultTenantMaxFileSizeBytes,
            dailyUploadLimit: global.defaultDailyUploadLimit,
            monthlyUploadLimit: global.defaultMonthlyUploadLimit,
            maxStorageSizeBytes: global.defaultTenantMaxStorageBytes,
            currentStorageUsed: 0,
            dailyUploadCount: 0,
            dailyUploadCountResetAt: new Date(new Date().setHours(24, 0, 0, 0)),
            monthlyUploadCount: 0,
            monthlyUploadCountResetAt: new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                1
            ),
            acceptedMimeTypes: global.systemAcceptedMimeTypes,
            blockedMimeTypes: global.systemBlockedMimeTypes,
            categories: defaultCategories,
            allowCustomCategories: true,
            defaultVisibility: 'internal' as any,
            allowPublicDocuments: true,
            enableVirusScanning: false,
            enablePIIRedaction: false,
            enableTextExtraction: false,
            enablePreviewGeneration: false,
            defaultRetentionDays: global.defaultRetentionDays,
            updatedAt: new Date(),
            updatedBy: 'system',
        };
    }

    /**
     * Get hardcoded default global settings (bootstrap)
     */
    private getDefaultGlobalSettings(): GlobalDocumentSettings {
        return {
            id: 'document-global-settings',
            configType: 'documents',
            partitionKey: 'documents',
            globalMaxFileSizeBytes: 524288000, // 500MB
            globalMaxStorageSizeBytes: 1099511627776, // 1TB
            defaultTenantMaxFileSizeBytes: 104857600, // 100MB
            defaultTenantMaxStorageBytes: 107374182400, // 100GB
            defaultDailyUploadLimit: 1000,
            defaultMonthlyUploadLimit: 10000,
            systemAcceptedMimeTypes: ['*/*'],
            systemBlockedMimeTypes: [],
            defaultCategories: [],
            enableDocumentManagement: true,
            enableBulkOperations: true,
            enableCollections: true,
            defaultRetentionDays: 30,
            hardDeleteAfterDays: 30,
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: 'system',
        };
    }
}

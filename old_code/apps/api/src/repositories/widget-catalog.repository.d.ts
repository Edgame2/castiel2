/**
 * Widget Catalog Repository
 * Persists widget catalog entries and tenant configurations to Cosmos DB
 */
import { WidgetCatalogEntry, TenantWidgetCatalogOverride, TenantWidgetCatalogConfig, WidgetCatalogListOptions, WidgetCatalogListResult, TenantWidgetOverrideListResult } from '../types/widget-catalog.types.js';
export declare class WidgetCatalogRepository {
    private client;
    private catalogContainer;
    private overrideContainer;
    private configContainer;
    constructor();
    /**
     * Create widget catalog entry
     */
    createCatalogEntry(entry: WidgetCatalogEntry): Promise<WidgetCatalogEntry>;
    /**
     * Get widget catalog entry by ID
     */
    getCatalogEntry(entryId: string): Promise<WidgetCatalogEntry | null>;
    /**
     * List widget catalog entries with filtering
     */
    listCatalogEntries(options: WidgetCatalogListOptions): Promise<WidgetCatalogListResult>;
    /**
     * Update widget catalog entry
     */
    updateCatalogEntry(entry: WidgetCatalogEntry): Promise<WidgetCatalogEntry>;
    /**
     * Delete widget catalog entry
     */
    deleteCatalogEntry(entryId: string): Promise<void>;
    /**
     * Get tenant widget override
     */
    getTenantWidgetOverride(tenantId: string, widgetCatalogEntryId: string): Promise<TenantWidgetCatalogOverride | null>;
    /**
     * Update tenant widget override
     */
    updateTenantWidgetOverride(override: TenantWidgetCatalogOverride): Promise<TenantWidgetCatalogOverride>;
    /**
     * List tenant widget overrides
     */
    listTenantWidgetOverrides(tenantId: string, page?: number, limit?: number): Promise<TenantWidgetOverrideListResult>;
    /**
     * Delete tenant widget override
     */
    deleteTenantWidgetOverride(tenantId: string, widgetCatalogEntryId: string): Promise<void>;
    /**
     * Get tenant widget catalog configuration
     */
    getTenantWidgetConfig(tenantId: string): Promise<TenantWidgetCatalogConfig>;
    /**
     * Update tenant widget catalog configuration
     */
    updateTenantWidgetConfig(config: TenantWidgetCatalogConfig): Promise<TenantWidgetCatalogConfig>;
    /**
     * Get default tenant widget configuration
     */
    private getDefaultTenantConfig;
}
//# sourceMappingURL=widget-catalog.repository.d.ts.map
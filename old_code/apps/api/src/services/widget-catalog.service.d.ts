/**
 * Widget Catalog Service
 * Manages widget catalog entries and tenant customizations
 *
 * Permissions:
 * - SuperAdmin: Full CRUD on widget catalog entries (system-wide)
 * - TenantAdmin: Visibility/role customization only (cannot modify base config)
 * - Regular User: Read-only access to visible widgets
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { WidgetCatalogEntry, TenantWidgetCatalogOverride, TenantWidgetCatalogConfig, CreateWidgetCatalogEntryInput, UpdateWidgetCatalogEntryInput, UpdateTenantWidgetAccessInput, UpdateTenantWidgetConfigInput, WidgetCatalogListOptions, WidgetCatalogListResult, TenantWidgetOverrideListResult } from '../types/widget-catalog.types.js';
export declare class WidgetCatalogService {
    private repository;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Create widget catalog entry (SuperAdmin only)
     */
    createCatalogEntry(input: CreateWidgetCatalogEntryInput, userId: string): Promise<WidgetCatalogEntry>;
    /**
     * Get widget catalog entry by ID
     */
    getCatalogEntry(entryId: string): Promise<WidgetCatalogEntry | null>;
    /**
     * List widget catalog entries with filtering
     */
    listCatalogEntries(options: WidgetCatalogListOptions): Promise<WidgetCatalogListResult>;
    /**
     * Update widget catalog entry (SuperAdmin only)
     * Immutable fields: widgetType, catalogType, name
     */
    updateCatalogEntry(entryId: string, input: UpdateWidgetCatalogEntryInput, userId: string): Promise<WidgetCatalogEntry>;
    /**
     * Delete widget catalog entry (SuperAdmin only)
     */
    deleteCatalogEntry(entryId: string): Promise<void>;
    /**
     * Update tenant widget access (visibility/roles only, TenantAdmin)
     * Cannot modify base widget configuration
     */
    updateTenantWidgetAccess(tenantId: string, input: UpdateTenantWidgetAccessInput, userId: string): Promise<TenantWidgetCatalogOverride>;
    /**
     * Get tenant widget catalog configuration
     */
    getTenantWidgetConfig(tenantId: string): Promise<TenantWidgetCatalogConfig>;
    /**
     * Update tenant widget catalog configuration (TenantAdmin)
     */
    updateTenantWidgetConfig(tenantId: string, input: UpdateTenantWidgetConfigInput, userId: string): Promise<TenantWidgetCatalogConfig>;
    /**
     * Get widget catalog entries for user (with tenant overrides applied)
     * Filters based on user role, tenant, and visibility settings
     */
    getUserWidgetCatalog(tenantId: string, userRoles: string[], options?: Partial<WidgetCatalogListOptions>): Promise<WidgetCatalogListResult>;
    /**
     * Get tenant widget override
     */
    getTenantWidgetOverride(tenantId: string, widgetCatalogEntryId: string): Promise<TenantWidgetCatalogOverride | null>;
    /**
     * List tenant widget overrides
     */
    listTenantWidgetOverrides(tenantId: string, page?: number, limit?: number): Promise<TenantWidgetOverrideListResult>;
    /**
     * Delete tenant widget override (reset to default)
     */
    deleteTenantWidgetOverride(tenantId: string, widgetCatalogEntryId: string): Promise<void>;
}
//# sourceMappingURL=widget-catalog.service.d.ts.map
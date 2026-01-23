/**
 * Widget Catalog Types
 * Types for widget catalog management at platform and tenant levels
 * SuperAdmins manage system widget types; TenantAdmins only customize visibility/role access
 */
import type { WidgetType, WidgetPermissions } from './widget.types.js';
import type { GridSize } from './dashboard.types.js';
export declare enum WidgetCatalogStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    DEPRECATED = "deprecated",
    HIDDEN = "hidden"
}
export declare enum WidgetVisibilityLevel {
    ALL = "all",// All authenticated users
    AUTHENTICATED = "authenticated",// Only logged-in users
    TENANT = "tenant",// Tenant users only
    SPECIFIC_ROLES = "specific_roles",// Specific roles only
    HIDDEN = "hidden"
}
/**
 * Widget template that can be used in catalogs
 * Created and managed by SuperAdmins only
 * TenantAdmins cannot modify base config, only visibility/role access
 */
export interface WidgetCatalogEntry {
    id: string;
    widgetType: WidgetType;
    catalogType: 'system';
    name: string;
    displayName: string;
    description: string;
    category: string;
    icon?: string;
    thumbnail?: string;
    status: WidgetCatalogStatus;
    isDefault: boolean;
    isFeatured: boolean;
    visibilityLevel: WidgetVisibilityLevel;
    allowedRoles?: string[];
    defaultSize: GridSize;
    defaultConfig: Record<string, unknown>;
    minSize?: GridSize;
    maxSize?: GridSize;
    defaultPermissions: Partial<WidgetPermissions>;
    allowUserConfiguration: boolean;
    configurableFields?: string[];
    version: number;
    tags?: string[];
    sortOrder: number;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
}
/**
 * Tenant-level widget catalog customization
 * TenantAdmins can ONLY modify visibility and role-based access
 * Cannot change widget configuration, size, or other base properties
 */
export interface TenantWidgetCatalogOverride {
    id: string;
    tenantId: string;
    widgetCatalogEntryId: string;
    visibleToTenant: boolean;
    customVisibilityLevel?: WidgetVisibilityLevel;
    customAllowedRoles?: string[];
    tenantSpecificRoles?: string[];
    enableForTenant: boolean;
    featuredForTenant: boolean;
    version: number;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
}
/**
 * Tenant-level widget catalog configuration and settings
 */
export interface TenantWidgetCatalogConfig {
    tenantId: string;
    enableCustomWidgets: boolean;
    enableWidgetSharing: boolean;
    enableWidgetExport: boolean;
    visibleWidgetIds: string[];
    hiddenWidgetIds: string[];
    featuredWidgetIds: string[];
    roleBasedWidgetAccess?: Record<string, string[]>;
    customCategoryLabels?: Record<string, string>;
    defaultWidgetCatalogEntryIds: string[];
    maxWidgetsPerDashboard: number;
    maxCustomQueryWidgets: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string;
}
export interface CreateWidgetCatalogEntryInput {
    widgetType: WidgetType;
    name: string;
    displayName: string;
    description: string;
    category: string;
    icon?: string;
    thumbnail?: string;
    defaultSize: GridSize;
    defaultConfig: Record<string, unknown>;
    visibilityLevel: WidgetVisibilityLevel;
    allowedRoles?: string[];
    isDefault?: boolean;
    isFeatured?: boolean;
    status?: WidgetCatalogStatus;
}
export interface UpdateWidgetCatalogEntryInput {
    displayName?: string;
    description?: string;
    category?: string;
    icon?: string;
    thumbnail?: string;
    status?: WidgetCatalogStatus;
    isDefault?: boolean;
    isFeatured?: boolean;
    visibilityLevel?: WidgetVisibilityLevel;
    allowedRoles?: string[];
    defaultSize?: GridSize;
    defaultConfig?: Record<string, unknown>;
    minSize?: GridSize;
    maxSize?: GridSize;
    version: number;
}
export interface UpdateTenantWidgetAccessInput {
    widgetCatalogEntryId: string;
    visibleToTenant?: boolean;
    customVisibilityLevel?: WidgetVisibilityLevel;
    customAllowedRoles?: string[];
    enableForTenant?: boolean;
    featuredForTenant?: boolean;
    version: number;
}
export interface UpdateTenantWidgetConfigInput {
    visibleWidgetIds?: string[];
    hiddenWidgetIds?: string[];
    featuredWidgetIds?: string[];
    roleBasedWidgetAccess?: Record<string, string[]>;
    defaultWidgetCatalogEntryIds?: string[];
    maxWidgetsPerDashboard?: number;
    maxCustomQueryWidgets?: number;
    version: number;
}
export interface WidgetCatalogListOptions {
    tenantId?: string;
    status?: WidgetCatalogStatus;
    category?: string;
    visibilityLevel?: WidgetVisibilityLevel;
    search?: string;
    sort?: 'name' | 'category' | 'recent' | 'featured';
    page?: number;
    limit?: number;
}
export interface WidgetCatalogListResult {
    items: WidgetCatalogEntry[];
    total: number;
    page: number;
    limit: number;
}
export interface TenantWidgetOverrideListResult {
    items: TenantWidgetCatalogOverride[];
    total: number;
    page: number;
    limit: number;
}
/**
 * Widget catalog entry with tenant overrides applied
 * Used in API responses to show what user actually sees
 */
export interface WidgetCatalogEntryWithTenantOverride extends WidgetCatalogEntry {
    tenantOverride?: TenantWidgetCatalogOverride;
    visibleToUser: boolean;
    userAllowedRoles: string[];
}
//# sourceMappingURL=widget-catalog.types.d.ts.map
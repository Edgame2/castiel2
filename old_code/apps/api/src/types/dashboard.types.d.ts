/**
 * Dashboard Types
 * Types for customizable, permission-aware dashboards
 */
/**
 * Dashboard type based on ownership level
 */
export declare enum DashboardType {
    SYSTEM = "system",// Created by Super Admin, global
    TENANT = "tenant",// Created by Tenant Admin
    USER = "user"
}
/**
 * Dashboard permission levels
 */
export declare enum DashboardPermissionLevel {
    VIEW = "view",// Can view dashboard
    INTERACT = "interact",// Can use filters, refresh
    CUSTOMIZE = "customize",// Can reposition, hide widgets
    EDIT = "edit",// Can edit dashboard settings
    ADMIN = "admin"
}
/**
 * Dashboard visibility
 */
export declare enum DashboardVisibility {
    PRIVATE = "private",// Only owner and explicit shares
    TENANT = "tenant",// All users in tenant
    PUBLIC = "public"
}
/**
 * Widget position on the grid
 */
export interface GridPosition {
    x: number;
    y: number;
}
/**
 * Widget size
 */
export interface GridSize {
    width: number;
    height: number;
}
/**
 * Widget position with ID for layout arrays
 */
export interface WidgetPosition {
    widgetId: string;
    position: GridPosition;
    size: GridSize;
}
/**
 * Responsive layout configuration
 */
export interface ResponsiveLayout {
    desktop: WidgetPosition[];
    tablet?: WidgetPosition[];
    mobile?: WidgetPosition[];
}
/**
 * Grid configuration
 */
export interface GridConfig {
    columns: {
        desktop: number;
        tablet: number;
        mobile: number;
    };
    rowHeight: number;
    gap: number;
    padding: number;
}
/**
 * Dashboard context type
 */
export type DashboardContextType = 'none' | 'shard' | 'custom';
/**
 * Shard-based context configuration
 */
export interface ShardContext {
    shardTypeId: string;
    shardId?: string;
    required: boolean;
}
/**
 * Custom context parameter
 */
export interface ContextParameter {
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'shardId';
    label: string;
    required: boolean;
    defaultValue?: unknown;
    shardTypeId?: string;
}
/**
 * Custom context configuration
 */
export interface CustomContext {
    parameters: ContextParameter[];
}
/**
 * Dashboard context configuration
 */
export interface DashboardContext {
    contextType: DashboardContextType;
    shardContext?: ShardContext;
    customContext?: CustomContext;
}
/**
 * Date range presets
 */
export type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_fiscal_quarter' | 'last_fiscal_quarter' | 'this_year' | 'last_year' | 'this_fiscal_year' | 'last_fiscal_year' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_365_days' | 'custom';
/**
 * Date range value
 */
export interface DateRangeValue {
    preset: DatePreset;
    startDate?: Date;
    endDate?: Date;
}
/**
 * Filter option for select/multiselect
 */
export interface FilterOption {
    value: string;
    label: string;
}
/**
 * Dashboard filter definition
 */
export interface DashboardFilter {
    id: string;
    name: string;
    field: string;
    type: 'select' | 'multiselect' | 'search' | 'boolean';
    options?: FilterOption[];
    optionsQuery?: string;
    defaultValue?: unknown;
    required: boolean;
}
/**
 * Dashboard filters configuration
 */
export interface DashboardFilters {
    dateRange?: {
        enabled: boolean;
        field: string;
        presets: DatePreset[];
        allowCustomRange: boolean;
        defaultPreset?: DatePreset;
    };
    customFilters?: DashboardFilter[];
}
/**
 * Role-based permission entry
 */
export interface RolePermission {
    role: string;
    permission: DashboardPermissionLevel;
}
/**
 * Group-based permission entry
 */
export interface GroupPermission {
    groupId: string;
    permission: DashboardPermissionLevel;
}
/**
 * User-specific permission entry
 */
export interface UserPermission {
    userId: string;
    permission: DashboardPermissionLevel;
}
/**
 * Dashboard permissions
 */
export interface DashboardPermissions {
    visibility: DashboardVisibility;
    ownerId: string;
    ownerType: 'user' | 'tenant' | 'system';
    roles: RolePermission[];
    groups: GroupPermission[];
    users: UserPermission[];
    allowedTenantIds?: string[];
}
/**
 * Dashboard theme
 */
export type DashboardTheme = 'light' | 'dark' | 'system';
/**
 * Dashboard density
 */
export type DashboardDensity = 'compact' | 'normal' | 'comfortable';
/**
 * Dashboard settings
 */
export interface DashboardSettings {
    autoRefresh: boolean;
    autoRefreshInterval: number;
    theme: DashboardTheme;
    density: DashboardDensity;
    showInheritedWidgets: boolean;
    allowWidgetFilters: boolean;
}
/**
 * Dashboard structured data (stored in Shard)
 */
export interface DashboardStructuredData {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    dashboardType: DashboardType;
    ownerId: string;
    ownerType: 'user' | 'tenant' | 'system';
    isDefault: boolean;
    isTemplate: boolean;
    isPublic: boolean;
    gridConfig: GridConfig;
    layout: ResponsiveLayout;
    context?: DashboardContext;
    filters?: DashboardFilters;
    settings: DashboardSettings;
    permissions: DashboardPermissions;
    templateId?: string;
    templateVersion?: number;
    version: number;
}
/**
 * Dashboard (full entity with Shard fields)
 */
export interface Dashboard {
    id: string;
    tenantId: string;
    userId: string;
    shardTypeId: 'c_dashboard';
    structuredData: DashboardStructuredData;
    createdAt: Date;
    updatedAt: Date;
    widgetIds?: string[];
}
/**
 * Hidden widget reference
 */
export interface HiddenWidget {
    widgetId: string;
    sourceDashboardId: string;
}
/**
 * Position override for inherited widget
 */
export interface PositionOverride {
    widgetId: string;
    sourceDashboardId: string;
    position: GridPosition;
}
/**
 * User's dashboard overrides
 */
export interface UserDashboardOverrides {
    userId: string;
    dashboardId: string;
    hiddenWidgets: HiddenWidget[];
    positionOverrides: PositionOverride[];
    filterState?: {
        dateRange?: DateRangeValue;
        customFilters?: Record<string, unknown>;
    };
    updatedAt: Date;
}
/**
 * Widget with source information
 */
export interface MergedWidget {
    widgetId: string;
    source: DashboardType;
    sourceDashboardId: string;
    canEdit: boolean;
    canHide: boolean;
    canReposition: boolean;
    isHidden: boolean;
    position: GridPosition;
    size: GridSize;
}
/**
 * Merged dashboard result
 */
export interface MergedDashboard {
    primaryDashboardId: string;
    widgets: MergedWidget[];
    sources: {
        system: string[];
        tenant: string[];
        user: string[];
    };
    context?: {
        shardId?: string;
        shardTypeId?: string;
        customParams?: Record<string, unknown>;
    };
    filters?: {
        dateRange?: DateRangeValue;
        customFilters?: Record<string, unknown>;
    };
    settings: DashboardSettings;
    gridConfig: GridConfig;
}
/**
 * Create dashboard input
 */
export interface CreateDashboardInput {
    tenantId: string;
    userId: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    dashboardType?: DashboardType;
    templateId?: string;
    context?: DashboardContext;
    filters?: DashboardFilters;
    settings?: Partial<DashboardSettings>;
    permissions?: Partial<DashboardPermissions>;
}
/**
 * Update dashboard input
 */
export interface UpdateDashboardInput {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    isDefault?: boolean;
    isPublic?: boolean;
    context?: DashboardContext;
    filters?: DashboardFilters;
    settings?: Partial<DashboardSettings>;
    permissions?: Partial<DashboardPermissions>;
    layout?: ResponsiveLayout;
}
/**
 * Dashboard query filters
 */
export interface DashboardQueryFilter {
    tenantId: string;
    userId?: string;
    dashboardType?: DashboardType;
    isDefault?: boolean;
    isTemplate?: boolean;
    contextType?: DashboardContextType;
    search?: string;
}
/**
 * Dashboard list options
 */
export interface DashboardListOptions {
    filter: DashboardQueryFilter;
    includeInherited?: boolean;
    includeTemplates?: boolean;
    limit?: number;
    offset?: number;
}
/**
 * Dashboard list result
 */
export interface DashboardListResult {
    dashboards: Dashboard[];
    total: number;
    hasMore: boolean;
}
/**
 * Dashboard change type
 */
export type DashboardChangeType = 'widget_added' | 'widget_removed' | 'widget_updated' | 'layout_changed' | 'settings_changed' | 'permissions_changed' | 'bulk_update' | 'rollback';
/**
 * Dashboard version snapshot
 */
export interface DashboardVersionSnapshot {
    widgets: string[];
    layout: ResponsiveLayout;
    settings: DashboardSettings;
    permissions: DashboardPermissions;
}
/**
 * Dashboard version
 */
export interface DashboardVersion {
    id: string;
    dashboardId: string;
    version: number;
    snapshot: DashboardVersionSnapshot;
    changeSummary: string;
    changeType: DashboardChangeType;
    createdAt: Date;
    createdBy: string;
}
/**
 * Dashboard feature flags
 */
export interface DashboardFeatureFlags {
    dashboardsEnabled: boolean;
    features: {
        customDashboards: boolean;
        dashboardSharing: boolean;
        customWidgets: boolean;
        dashboardTemplates: boolean;
        dashboardExport: boolean;
        realTimeUpdates: boolean;
    };
    limits: {
        maxDashboardsPerUser: number;
        maxDashboardsPerTenant: number;
        maxWidgetsPerDashboard: number;
        maxCustomQueries: number;
    };
}
/**
 * Tenant dashboard configuration override
 */
export interface TenantDashboardConfig {
    tenantId: string;
    dashboardsEnabled: boolean;
    features?: Partial<DashboardFeatureFlags['features']>;
    limits?: Partial<DashboardFeatureFlags['limits']>;
    configuredAt: Date;
    configuredBy: string;
}
/**
 * Fiscal year start configuration
 */
export interface FiscalYearStart {
    month: number;
    day: number;
}
/**
 * Tenant fiscal year configuration
 */
export interface TenantFiscalYearConfig {
    tenantId: string;
    fiscalYearStart: FiscalYearStart;
    configuredAt: Date;
    configuredBy: string;
}
/**
 * Default grid configuration
 */
export declare const DEFAULT_GRID_CONFIG: GridConfig;
/**
 * Default dashboard settings
 */
export declare const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings;
/**
 * Default feature flags
 */
export declare const DEFAULT_FEATURE_FLAGS: DashboardFeatureFlags;
/**
 * Default fiscal year (calendar year)
 */
export declare const DEFAULT_FISCAL_YEAR_START: FiscalYearStart;
//# sourceMappingURL=dashboard.types.d.ts.map
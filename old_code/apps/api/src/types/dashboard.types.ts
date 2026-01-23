/**
 * Dashboard Types
 * Types for customizable, permission-aware dashboards
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Dashboard type based on ownership level
 */
export enum DashboardType {
  SYSTEM = 'system',   // Created by Super Admin, global
  TENANT = 'tenant',   // Created by Tenant Admin
  USER = 'user',       // Created by individual user
}

/**
 * Dashboard permission levels
 */
export enum DashboardPermissionLevel {
  VIEW = 'view',           // Can view dashboard
  INTERACT = 'interact',   // Can use filters, refresh
  CUSTOMIZE = 'customize', // Can reposition, hide widgets
  EDIT = 'edit',           // Can edit dashboard settings
  ADMIN = 'admin',         // Full control, can delete
}

/**
 * Dashboard visibility
 */
export enum DashboardVisibility {
  PRIVATE = 'private',   // Only owner and explicit shares
  TENANT = 'tenant',     // All users in tenant
  PUBLIC = 'public',     // All tenants (system dashboards only)
}

// ============================================================================
// Grid & Layout
// ============================================================================

/**
 * Widget position on the grid
 */
export interface GridPosition {
  x: number;  // Column (0-11 for 12-column grid)
  y: number;  // Row
}

/**
 * Widget size
 */
export interface GridSize {
  width: number;   // Columns (1-12)
  height: number;  // Rows (1-N)
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
    desktop: number;  // Default: 12
    tablet: number;   // Default: 8
    mobile: number;   // Default: 4
  };
  rowHeight: number;  // Default: 80px
  gap: number;        // Default: 16px
  padding: number;    // Default: 24px
}

// ============================================================================
// Context & Filters
// ============================================================================

/**
 * Dashboard context type
 */
export type DashboardContextType = 'none' | 'shard' | 'custom';

/**
 * Shard-based context configuration
 */
export interface ShardContext {
  shardTypeId: string;       // e.g., 'c_project', 'c_opportunity'
  shardId?: string;          // Specific shard ID (for instances)
  required: boolean;         // Dashboard requires context to load
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
  shardTypeId?: string;      // For shardId type
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
export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_fiscal_quarter'
  | 'last_fiscal_quarter'
  | 'this_year'
  | 'last_year'
  | 'this_fiscal_year'
  | 'last_fiscal_year'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'last_365_days'
  | 'custom';

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

// ============================================================================
// Permissions
// ============================================================================

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
  allowedTenantIds?: string[];  // For system dashboards
}

// ============================================================================
// Settings
// ============================================================================

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
  autoRefreshInterval: number;  // seconds
  theme: DashboardTheme;
  density: DashboardDensity;
  showInheritedWidgets: boolean;
  allowWidgetFilters: boolean;
}

// ============================================================================
// Dashboard Entity
// ============================================================================

/**
 * Dashboard structured data (stored in Shard)
 */
export interface DashboardStructuredData {
  // Display
  name: string;
  description?: string;
  icon?: string;
  color?: string;

  // Type
  dashboardType: DashboardType;

  // Ownership
  ownerId: string;
  ownerType: 'user' | 'tenant' | 'system';

  // Flags
  isDefault: boolean;
  isTemplate: boolean;
  isPublic: boolean;

  // Layout
  gridConfig: GridConfig;
  layout: ResponsiveLayout;

  // Context & Filters
  context?: DashboardContext;
  filters?: DashboardFilters;

  // Settings
  settings: DashboardSettings;

  // Permissions
  permissions: DashboardPermissions;

  // Template source
  templateId?: string;
  templateVersion?: number;

  // Version
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
  
  // Widget IDs (relationships)
  widgetIds?: string[];
}

// ============================================================================
// User Overrides
// ============================================================================

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

// ============================================================================
// Merged Dashboard (what user sees)
// ============================================================================

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
  // Primary dashboard (user's own or default)
  primaryDashboardId: string;
  
  // All widgets with sources
  widgets: MergedWidget[];
  
  // Source tracking
  sources: {
    system: string[];
    tenant: string[];
    user: string[];
  };
  
  // Applied context
  context?: {
    shardId?: string;
    shardTypeId?: string;
    customParams?: Record<string, unknown>;
  };
  
  // Applied filters
  filters?: {
    dateRange?: DateRangeValue;
    customFilters?: Record<string, unknown>;
  };
  
  // Settings (from primary dashboard)
  settings: DashboardSettings;
  gridConfig: GridConfig;
}

// ============================================================================
// CRUD Operations
// ============================================================================

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

// ============================================================================
// Versioning
// ============================================================================

/**
 * Dashboard change type
 */
export type DashboardChangeType =
  | 'widget_added'
  | 'widget_removed'
  | 'widget_updated'
  | 'layout_changed'
  | 'settings_changed'
  | 'permissions_changed'
  | 'bulk_update'
  | 'rollback';

/**
 * Dashboard version snapshot
 */
export interface DashboardVersionSnapshot {
  widgets: string[];  // Widget IDs
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

// ============================================================================
// Feature Flags & Limits
// ============================================================================

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

// ============================================================================
// Fiscal Year
// ============================================================================

/**
 * Fiscal year start configuration
 */
export interface FiscalYearStart {
  month: number;  // 1-12
  day: number;    // 1-31
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

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default grid configuration
 */
export const DEFAULT_GRID_CONFIG: GridConfig = {
  columns: {
    desktop: 12,
    tablet: 8,
    mobile: 4,
  },
  rowHeight: 80,
  gap: 16,
  padding: 24,
};

/**
 * Default dashboard settings
 */
export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  autoRefresh: false,
  autoRefreshInterval: 60,
  theme: 'system',
  density: 'normal',
  showInheritedWidgets: true,
  allowWidgetFilters: true,
};

/**
 * Default feature flags
 */
export const DEFAULT_FEATURE_FLAGS: DashboardFeatureFlags = {
  dashboardsEnabled: true,
  features: {
    customDashboards: true,
    dashboardSharing: true,
    customWidgets: true,
    dashboardTemplates: true,
    dashboardExport: true,
    realTimeUpdates: true,
  },
  limits: {
    maxDashboardsPerUser: 10,
    maxDashboardsPerTenant: 100,
    maxWidgetsPerDashboard: 50,
    maxCustomQueries: 20,
  },
};

/**
 * Default fiscal year (calendar year)
 */
export const DEFAULT_FISCAL_YEAR_START: FiscalYearStart = {
  month: 1,
  day: 1,
};












/**
 * Dashboard Types for Frontend
 */

// ============================================================================
// Enums
// ============================================================================

export enum DashboardType {
  SYSTEM = 'system',
  TENANT = 'tenant',
  USER = 'user',
}

export enum DashboardStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum DashboardVisibility {
  PRIVATE = 'private',
  TENANT = 'tenant',
  PUBLIC = 'public',
}

export enum DashboardPermissionLevel {
  VIEW = 'view',
  INTERACT = 'interact',
  CUSTOMIZE = 'customize',
  EDIT = 'edit',
  ADMIN = 'admin',
}

export enum WidgetType {
  // Data Widgets
  COUNTER = 'counter',
  CHART = 'chart',
  TABLE = 'table',
  LIST = 'list',
  GAUGE = 'gauge',
  // Shard Widgets
  RECENT_SHARDS = 'recent_shards',
  SHARD_ACTIVITY = 'shard_activity',
  SHARD_STATS = 'shard_stats',
  SHARD_SEARCH = 'shard_search',
  SHARD_KANBAN = 'shard_kanban',
  // User Widgets
  TEAM_ACTIVITY = 'team_activity',
  USER_STATS = 'user_stats',
  MY_TASKS = 'my_tasks',
  NOTIFICATIONS = 'notifications',
  // Integration Widgets
  EXTERNAL_DATA = 'external_data',
  EMBED = 'embed',
  WEBHOOK_STATUS = 'webhook_status',
  INTEGRATION_STATUS = 'integration_status',
  INTEGRATION_ACTIVITY = 'integration_activity',
  INTEGRATION_SEARCH = 'integration_search',
  // Google Workspace Widgets
  GMAIL_INBOX = 'gmail_inbox',
  CALENDAR_EVENTS = 'calendar_events',
  DRIVE_FILES = 'drive_files',
  CONTACTS_STATS = 'contacts_stats',
  TASKS_SUMMARY = 'tasks_summary',
  // Custom Widgets
  CUSTOM_QUERY = 'custom_query',
  MARKDOWN = 'markdown',
  DOCUMENT_PREVIEW = 'document_preview',
  QUICK_LINKS = 'quick_links',
}

export enum DatePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  THIS_WEEK = 'this_week',
  LAST_WEEK = 'last_week',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_QUARTER = 'this_quarter',
  LAST_QUARTER = 'last_quarter',
  THIS_YEAR = 'this_year',
  LAST_YEAR = 'last_year',
  THIS_FISCAL_YEAR = 'this_fiscal_year',
  LAST_FISCAL_YEAR = 'last_fiscal_year',
  THIS_FISCAL_QUARTER = 'this_fiscal_quarter',
  LAST_FISCAL_QUARTER = 'last_fiscal_quarter',
  CUSTOM = 'custom',
}

// ============================================================================
// Grid & Layout Types
// ============================================================================

export interface GridPosition {
  x: number;
  y: number;
}

export interface GridSize {
  width: number;
  height: number;
}

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

export interface WidgetLayoutItem {
  widgetId: string;
  position: GridPosition;
  size: GridSize;
}

export interface ResponsiveLayout {
  desktop: WidgetLayoutItem[];
  tablet?: WidgetLayoutItem[];
  mobile?: WidgetLayoutItem[];
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardContext {
  shardId?: string;
  shardTypeId?: string;
  customParams?: Record<string, unknown>;
}

export interface DashboardFilter {
  id: string;
  type: 'date' | 'shard' | 'user' | 'custom';
  name: string;
  description?: string;
  datePreset?: DatePreset;
  startDate?: string;
  endDate?: string;
  shardTypeId?: string;
  field?: string;
  operator?: string;
  value?: unknown;
  userId?: string;
}

export interface DashboardSettings {
  autoRefresh: boolean;
  autoRefreshInterval: number;
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'normal' | 'comfortable';
  showInheritedWidgets: boolean;
  allowWidgetFilters: boolean;
}

export interface DashboardPermissions {
  visibility: DashboardVisibility;
  ownerId: string;
  ownerType: 'system' | 'tenant' | 'user';
  roles: Array<{ role: string; permission: DashboardPermissionLevel }>;
  groups: Array<{ groupId: string; permission: DashboardPermissionLevel }>;
  users: Array<{ userId: string; permission: DashboardPermissionLevel }>;
}

export interface Dashboard {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  dashboardType: DashboardType;
  status: DashboardStatus;
  ownerId: string;
  ownerType: 'system' | 'tenant' | 'user';
  isDefault: boolean;
  isTemplate: boolean;
  isPublic: boolean;
  gridConfig: GridConfig;
  layout: ResponsiveLayout;
  context?: DashboardContext;
  filters?: DashboardFilter[];
  settings: DashboardSettings;
  permissions: DashboardPermissions;
  templateId?: string;
  templateVersion?: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Widget Types
// ============================================================================

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: unknown;
}

export interface WidgetDataSource {
  type: 'predefined' | 'custom' | 'integration';
  predefinedQuery?: string;
  customQuery?: {
    target: string;
    filters?: QueryFilter[];
    aggregation?: {
      type: 'count' | 'sum' | 'avg' | 'min' | 'max';
      field?: string;
      groupBy?: string;
    };
    sort?: {
      field: string;
      direction: 'asc' | 'desc';
    };
    limit?: number;
    applyDashboardContext?: boolean;
    applyDashboardFilters?: boolean;
  };
  integrationSource?: {
    integrationId: string;
    endpoint: string;
    parameters: Record<string, unknown>;
  };
  allowUserFilters: boolean;
  defaultFilters?: QueryFilter[];
  realtimeEnabled?: boolean;
  realtimeInterval?: number;
}

export interface WidgetPermissions {
  visibility: {
    roles: string[];
    userIds?: string[];
    groupIds?: string[];
    excludeUserIds?: string[];
  };
  dataFiltering: {
    applyTenantFilter: boolean;
    applyUserFilter: boolean;
    permissionField?: string;
    customFilter?: string;
  };
  actions: {
    canRefresh: boolean;
    canExport: boolean;
    canDrillDown: boolean;
    canConfigure: boolean;
  };
}

export interface Widget {
  id: string;
  tenantId: string;
  dashboardId: string;
  name: string;
  description?: string;
  icon?: string;
  widgetType: WidgetType;
  dataSource: WidgetDataSource;
  config: Record<string, unknown>;
  position: GridPosition;
  size: GridSize;
  minSize?: GridSize;
  maxSize?: GridSize;
  refreshInterval?: number;
  permissions: WidgetPermissions;
  contextFilters?: DashboardFilter[];
  createdAt: string;
  updatedAt: string;
}

export interface WidgetData {
  widgetId: string;
  data: unknown;
  metadata?: {
    totalCount?: number;
    hasMore?: boolean;
    lastRefreshedAt: string;
    cacheHit?: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Merged Dashboard (computed view for user)
// ============================================================================

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

export interface MergedDashboard {
  primaryDashboardId: string;
  widgets: MergedWidget[];
  sources: {
    system: string[];
    tenant: string[];
    user: string[];
  };
  context?: DashboardContext;
  filters?: {
    dateRange?: DateRangeValue;
    customFilters?: Record<string, unknown>;
  };
  settings: DashboardSettings;
  gridConfig: GridConfig;
}

export interface DateRangeValue {
  preset?: DatePreset;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// User Overrides
// ============================================================================

export interface UserDashboardOverrides {
  userId: string;
  dashboardId: string;
  hiddenWidgets: Array<{
    widgetId: string;
    sourceDashboardId: string;
  }>;
  positionOverrides: Array<{
    widgetId: string;
    sourceDashboardId: string;
    position: GridPosition;
  }>;
  filterState?: {
    dateRange?: DateRangeValue;
    customFilters?: Record<string, unknown>;
  };
  updatedAt: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateDashboardRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  dashboardType?: DashboardType;
  context?: DashboardContext;
  filters?: DashboardFilter[];
  settings?: Partial<DashboardSettings>;
}

export interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  status?: DashboardStatus;
  isDefault?: boolean;
  context?: DashboardContext;
  filters?: DashboardFilter[];
  settings?: Partial<DashboardSettings>;
  permissions?: Partial<DashboardPermissions>;
  layout?: ResponsiveLayout;
}

export interface CreateWidgetRequest {
  dashboardId: string;
  name: string;
  description?: string;
  icon?: string;
  widgetType: WidgetType;
  dataSource: WidgetDataSource;
  config: Record<string, unknown>;
  position: GridPosition;
  size: GridSize;
  refreshInterval?: number;
  permissions?: Partial<WidgetPermissions>;
}

export interface UpdateWidgetRequest {
  name?: string;
  description?: string;
  icon?: string;
  config?: Record<string, unknown>;
  dataSource?: Partial<WidgetDataSource>;
  position?: GridPosition;
  size?: GridSize;
  refreshInterval?: number;
  permissions?: Partial<WidgetPermissions>;
}

export interface BatchUpdatePositionsRequest {
  positions: Array<{
    widgetId: string;
    position: GridPosition;
    size?: GridSize;
  }>;
}

export interface WidgetDataRequest {
  filters?: QueryFilter[];
  dateRange?: DateRangeValue;
  page?: number;
  pageSize?: number;
}

export interface DashboardListParams {
  dashboardType?: DashboardType;
  isTemplate?: boolean;
  isDefault?: boolean;
  page?: number;
  pageSize?: number;
}

export interface DashboardListResponse {
  dashboards: Dashboard[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Dashboard Version (for history)
// ============================================================================

export interface DashboardVersion {
  id: string;
  dashboardId: string;
  version: number;
  changeType: 'widget_added' | 'widget_removed' | 'widget_updated' | 'layout_changed' | 'settings_changed' | 'permissions_changed' | 'rollback';
  changeSummary: string;
  changedBy: string;
  createdAt: string;
}

// ============================================================================
// Tenant Configuration
// ============================================================================

export interface TenantDashboardConfig {
  tenantId: string;
  dashboardsEnabled: boolean;
  features?: {
    customDashboards?: boolean;
    templateLibrary?: boolean;
    widgetMarketplace?: boolean;
    advancedFilters?: boolean;
    realTimeData?: boolean;
    exportDashboard?: boolean;
  };
  limits?: {
    maxDashboardsPerUser?: number;
    maxWidgetsPerDashboard?: number;
  };
}

export interface FiscalYearConfig {
  tenantId: string;
  fiscalYearStart: {
    month: number;
    day: number;
  };
  configuredAt: string;
  configuredBy: string;
}





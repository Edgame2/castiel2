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
export var DashboardType;
(function (DashboardType) {
    DashboardType["SYSTEM"] = "system";
    DashboardType["TENANT"] = "tenant";
    DashboardType["USER"] = "user";
})(DashboardType || (DashboardType = {}));
/**
 * Dashboard permission levels
 */
export var DashboardPermissionLevel;
(function (DashboardPermissionLevel) {
    DashboardPermissionLevel["VIEW"] = "view";
    DashboardPermissionLevel["INTERACT"] = "interact";
    DashboardPermissionLevel["CUSTOMIZE"] = "customize";
    DashboardPermissionLevel["EDIT"] = "edit";
    DashboardPermissionLevel["ADMIN"] = "admin";
})(DashboardPermissionLevel || (DashboardPermissionLevel = {}));
/**
 * Dashboard visibility
 */
export var DashboardVisibility;
(function (DashboardVisibility) {
    DashboardVisibility["PRIVATE"] = "private";
    DashboardVisibility["TENANT"] = "tenant";
    DashboardVisibility["PUBLIC"] = "public";
})(DashboardVisibility || (DashboardVisibility = {}));
// ============================================================================
// Default Values
// ============================================================================
/**
 * Default grid configuration
 */
export const DEFAULT_GRID_CONFIG = {
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
export const DEFAULT_DASHBOARD_SETTINGS = {
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
export const DEFAULT_FEATURE_FLAGS = {
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
export const DEFAULT_FISCAL_YEAR_START = {
    month: 1,
    day: 1,
};
//# sourceMappingURL=dashboard.types.js.map
/**
 * Dashboard Service
 * Business logic for dashboards, widgets, and dashboard merging
 * Includes caching integration for optimal performance
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { DashboardCacheService } from './dashboard-cache.service.js';
import { Dashboard, CreateDashboardInput, UpdateDashboardInput, DashboardListOptions, DashboardListResult, DashboardVersion, MergedDashboard, DateRangeValue, DatePreset, TenantFiscalYearConfig, DashboardFeatureFlags, GridPosition } from '../types/dashboard.types.js';
import { Widget, CreateWidgetInput, UpdateWidgetInput, BatchUpdatePositionsInput } from '../types/widget.types.js';
/**
 * Dashboard Service
 */
export declare class DashboardService {
    private repository;
    private monitoring;
    private cacheService?;
    private globalConfig;
    constructor(monitoring: IMonitoringProvider, cacheService?: DashboardCacheService);
    /**
     * Set cache service (for late initialization)
     */
    setCacheService(cacheService: DashboardCacheService): void;
    /**
     * Create a new dashboard
     */
    createDashboard(input: CreateDashboardInput): Promise<Dashboard>;
    /**
     * Get dashboard by ID (with caching)
     */
    getDashboard(id: string, tenantId: string, userId: string): Promise<Dashboard | null>;
    /**
     * Get dashboard with all its widgets
     */
    getDashboardWithWidgets(id: string, tenantId: string, userId: string): Promise<{
        dashboard: Dashboard;
        widgets: Widget[];
    } | null>;
    /**
     * Update dashboard
     */
    updateDashboard(id: string, tenantId: string, userId: string, input: UpdateDashboardInput): Promise<Dashboard | null>;
    /**
     * Delete dashboard
     */
    deleteDashboard(id: string, tenantId: string, userId: string): Promise<boolean>;
    /**
     * List dashboards
     */
    listDashboards(options: DashboardListOptions): Promise<DashboardListResult>;
    /**
     * Get merged dashboard for user (with caching)
     */
    getMergedDashboard(userId: string, tenantId: string, dashboardId?: string, context?: {
        shardId?: string;
        customParams?: Record<string, unknown>;
    }, filters?: {
        dateRange?: DateRangeValue;
        customFilters?: Record<string, unknown>;
    }): Promise<MergedDashboard>;
    /**
     * Set dashboard as default
     */
    setAsDefault(id: string, tenantId: string, userId: string): Promise<Dashboard | null>;
    /**
     * Duplicate dashboard
     */
    duplicateDashboard(id: string, tenantId: string, userId: string, newName: string): Promise<Dashboard>;
    /**
     * Create widget
     */
    createWidget(input: CreateWidgetInput): Promise<Widget>;
    /**
     * Get widget
     */
    getWidget(id: string, tenantId: string): Promise<Widget | null>;
    /**
     * Get widgets for dashboard
     */
    getWidgetsByDashboard(dashboardId: string, tenantId: string): Promise<Widget[]>;
    /**
     * Update widget
     */
    updateWidget(id: string, tenantId: string, userId: string, input: UpdateWidgetInput): Promise<Widget | null>;
    /**
     * Delete widget
     */
    deleteWidget(id: string, tenantId: string, userId: string): Promise<boolean>;
    /**
     * Batch update widget positions
     */
    batchUpdatePositions(dashboardId: string, tenantId: string, userId: string, input: BatchUpdatePositionsInput): Promise<Widget[]>;
    /**
     * Hide inherited widget
     */
    hideWidget(userId: string, tenantId: string, dashboardId: string, widgetId: string, sourceDashboardId: string): Promise<void>;
    /**
     * Show inherited widget
     */
    showWidget(userId: string, tenantId: string, dashboardId: string, widgetId: string, sourceDashboardId: string): Promise<void>;
    /**
     * Override inherited widget position
     */
    overrideWidgetPosition(userId: string, tenantId: string, dashboardId: string, widgetId: string, sourceDashboardId: string, position: GridPosition): Promise<void>;
    /**
     * Save user's filter state
     */
    saveFilterState(userId: string, tenantId: string, dashboardId: string, filterState: {
        dateRange?: DateRangeValue;
        customFilters?: Record<string, unknown>;
    }): Promise<void>;
    /**
     * Get dashboard versions
     */
    getDashboardVersions(dashboardId: string, tenantId: string): Promise<DashboardVersion[]>;
    /**
     * Rollback to version
     */
    rollbackToVersion(dashboardId: string, tenantId: string, userId: string, targetVersion: number): Promise<Dashboard | null>;
    /**
     * Get effective configuration for tenant (with caching)
     */
    getEffectiveConfig(tenantId: string): Promise<DashboardFeatureFlags>;
    /**
     * Get tenant fiscal year config (with caching)
     */
    getFiscalYearConfig(tenantId: string): Promise<TenantFiscalYearConfig>;
    /**
     * Save tenant fiscal year config
     */
    saveFiscalYearConfig(tenantId: string, fiscalYearStart: {
        month: number;
        day: number;
    }, userId: string): Promise<void>;
    /**
     * Calculate date range from preset
     */
    calculateDateRange(preset: DatePreset, fiscalYearStart: {
        month: number;
        day: number;
    }): {
        startDate: Date;
        endDate: Date;
    };
    /**
     * Get dashboard stats (real implementation)
     */
    getStats(tenantId: string): Promise<any>;
    /**
     * Get dashboard activity
     */
    getActivity(tenantId: string): Promise<any[]>;
    /**
     * Get recent shards
     */
    getRecentShards(tenantId: string, limit?: number): Promise<any[]>;
    /**
     * Resolve user permission for dashboard
     */
    private resolvePermission;
    private getFiscalYear;
    private getFiscalQuarter;
    private getFiscalYearStart;
    private getFiscalYearEnd;
    private getFiscalQuarterStart;
    private getFiscalQuarterEnd;
}
//# sourceMappingURL=dashboard.service.d.ts.map
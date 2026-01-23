/**
 * Dashboard Repository
 * Handles Cosmos DB operations for Dashboards and Widgets
 * Dashboards are stored as Shards with shardTypeId = 'c_dashboard'
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { Dashboard, CreateDashboardInput, UpdateDashboardInput, DashboardListOptions, DashboardListResult, DashboardVersion, DashboardChangeType, UserDashboardOverrides, TenantDashboardConfig, TenantFiscalYearConfig } from '../types/dashboard.types.js';
import { Widget, CreateWidgetInput, UpdateWidgetInput, BatchUpdatePositionsInput } from '../types/widget.types.js';
/**
 * Dashboard Repository
 */
export declare class DashboardRepository {
    private client;
    private shardsContainer;
    private configContainer;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Create a new dashboard
     */
    createDashboard(input: CreateDashboardInput): Promise<Dashboard>;
    /**
     * Get dashboard by ID
     */
    getDashboard(id: string, tenantId: string): Promise<Dashboard | null>;
    /**
     * Get dashboard with all its widgets
     */
    getDashboardWithWidgets(id: string, tenantId: string): Promise<{
        dashboard: Dashboard;
        widgets: Widget[];
    } | null>;
    /**
     * Update dashboard
     */
    updateDashboard(id: string, tenantId: string, input: UpdateDashboardInput): Promise<Dashboard | null>;
    /**
     * Delete dashboard (soft delete) with transactional batch
     */
    deleteDashboard(id: string, tenantId: string): Promise<boolean>;
    /**
     * List dashboards
     */
    listDashboards(options: DashboardListOptions): Promise<DashboardListResult>;
    /**
     * Get dashboards for inheritance (system + tenant dashboards)
     */
    getInheritedDashboards(tenantId: string): Promise<Dashboard[]>;
    /**
     * Create a widget
     */
    createWidget(input: CreateWidgetInput): Promise<Widget>;
    /**
     * Get widget by ID
     */
    getWidget(id: string, tenantId: string): Promise<Widget | null>;
    /**
     * Get widgets for a dashboard
     */
    getWidgetsByDashboard(dashboardId: string, tenantId: string): Promise<Widget[]>;
    /**
     * Update widget
     */
    updateWidget(id: string, tenantId: string, input: UpdateWidgetInput): Promise<Widget | null>;
    /**
     * Delete widget
     */
    deleteWidget(id: string, tenantId: string): Promise<boolean>;
    /**
     * Batch update widget positions
     */
    batchUpdatePositions(dashboardId: string, tenantId: string, input: BatchUpdatePositionsInput): Promise<Widget[]>;
    /**
     * Save dashboard version
     */
    saveDashboardVersion(dashboardId: string, tenantId: string, changeType: DashboardChangeType, changeSummary: string, userId: string): Promise<DashboardVersion>;
    /**
     * Get dashboard versions
     */
    getDashboardVersions(dashboardId: string, tenantId: string, limit?: number): Promise<DashboardVersion[]>;
    /**
     * Get user dashboard overrides
     */
    getUserOverrides(userId: string, dashboardId: string, tenantId: string): Promise<UserDashboardOverrides | null>;
    /**
     * Save user dashboard overrides
     */
    saveUserOverrides(overrides: UserDashboardOverrides & {
        tenantId: string;
    }): Promise<void>;
    /**
     * Get tenant dashboard config
     */
    getTenantDashboardConfig(tenantId: string): Promise<TenantDashboardConfig | null>;
    /**
     * Save tenant dashboard config
     */
    saveTenantDashboardConfig(config: TenantDashboardConfig): Promise<void>;
    /**
     * Get tenant fiscal year config
     */
    getTenantFiscalYearConfig(tenantId: string): Promise<TenantFiscalYearConfig | null>;
    /**
     * Save tenant fiscal year config
     */
    saveTenantFiscalYearConfig(config: TenantFiscalYearConfig): Promise<void>;
    /**
     * Query recent shards for widget
     */
    queryRecentShards(tenantId: string, page: number, pageSize: number): Promise<{
        results: unknown[];
        totalCount: number;
        hasMore: boolean;
    }>;
    /**
     * Query shard count by type
     */
    queryShardCountByType(tenantId: string): Promise<Array<{
        type: string;
        count: number;
    }>>;
    /**
     * Query shard count by status
     */
    queryShardCountByStatus(tenantId: string): Promise<Array<{
        status: string;
        count: number;
    }>>;
    /**
     * Query user activity timeline
     */
    queryUserActivityTimeline(tenantId: string, userId: string, page: number, pageSize: number): Promise<{
        results: unknown[];
        totalCount: number;
        hasMore: boolean;
    }>;
    /**
     * Query team activity summary
     */
    queryTeamActivitySummary(tenantId: string): Promise<{
        totalShards: number;
        activeUsers: number;
        shardsToday: number;
        shardsThisWeek: number;
    }>;
    /**
     * Query my tasks
     */
    queryMyTasks(tenantId: string, userId: string, page: number, pageSize: number): Promise<{
        results: unknown[];
        totalCount: number;
        hasMore: boolean;
    }>;
    /**
     * Query upcoming events
     */
    queryUpcomingEvents(tenantId: string, userId: string, page: number, pageSize: number): Promise<{
        results: unknown[];
        totalCount: number;
        hasMore: boolean;
    }>;
    /**
     * Query storage usage
     */
    queryStorageUsage(tenantId: string): Promise<{
        totalShards: number;
        totalSize: number;
        byType: Array<{
            type: string;
            count: number;
        }>;
    }>;
    /**
     * Query active users
     */
    queryActiveUsers(tenantId: string): Promise<Array<{
        userId: string;
        activityCount: number;
    }>>;
    /**
     * Execute custom widget query
     */
    executeCustomWidgetQuery(params: {
        tenantId: string;
        target: string;
        filters?: Array<{
            field: string;
            operator: string;
            value: unknown;
        }>;
        aggregation?: {
            type: string;
            field?: string;
            groupBy?: string;
        };
        sort?: {
            field: string;
            direction: 'asc' | 'desc';
        };
        limit?: number;
        offset?: number;
        pageSize?: number;
    }): Promise<{
        results: unknown[];
        totalCount: number;
        hasMore: boolean;
    }>;
    /**
     * Convert Shard document to Dashboard
     */
    private shardToDashboard;
    /**
     * Convert Shard document to Widget
     */
    private shardToWidget;
}
//# sourceMappingURL=dashboard.repository.d.ts.map
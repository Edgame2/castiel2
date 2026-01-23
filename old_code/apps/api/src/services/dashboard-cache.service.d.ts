/**
 * Dashboard Cache Service
 * Handles caching for dashboards, widgets, and widget data
 * Uses hybrid strategy: TTL + event-based invalidation
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { CacheService } from './cache.service.js';
import { CacheSubscriberService } from './cache-subscriber.service.js';
import { Dashboard, MergedDashboard, UserDashboardOverrides, TenantDashboardConfig, TenantFiscalYearConfig } from '../types/dashboard.types.js';
import { Widget, WidgetDataResponse } from '../types/widget.types.js';
/**
 * Configurable cache TTLs
 */
export interface DashboardCacheTTLConfig {
    dashboard: number;
    dashboardWidgets: number;
    widget: number;
    widgetData: number;
    mergedDashboard: number;
    userOverrides: number;
    tenantConfig: number;
    fiscalYear: number;
}
/**
 * Dashboard Cache Service
 */
export declare class DashboardCacheService {
    private cacheService;
    private cacheSubscriber;
    private monitoring;
    private ttlConfig;
    constructor(cacheService: CacheService, cacheSubscriber: CacheSubscriberService, monitoring: IMonitoringProvider, ttlConfig?: Partial<DashboardCacheTTLConfig>);
    /**
     * Subscribe to cache invalidation events for dashboards
     */
    private subscribeToInvalidations;
    /**
     * Get cached dashboard
     */
    getCachedDashboard(tenantId: string, dashboardId: string): Promise<Dashboard | null>;
    /**
     * Cache dashboard
     */
    cacheDashboard(dashboard: Dashboard): Promise<void>;
    /**
     * Get or fetch dashboard with cache-aside pattern
     */
    getOrFetchDashboard(tenantId: string, dashboardId: string, fetchFn: () => Promise<Dashboard | null>): Promise<Dashboard | null>;
    /**
     * Invalidate dashboard cache
     */
    invalidateDashboard(tenantId: string, dashboardId: string, publish?: boolean): Promise<void>;
    private invalidateDashboardInternal;
    /**
     * Get cached widget
     */
    getCachedWidget(tenantId: string, widgetId: string): Promise<Widget | null>;
    /**
     * Cache widget
     */
    cacheWidget(widget: Widget): Promise<void>;
    /**
     * Get cached widgets for dashboard
     */
    getCachedDashboardWidgets(tenantId: string, dashboardId: string): Promise<Widget[] | null>;
    /**
     * Cache widgets for dashboard
     */
    cacheDashboardWidgets(tenantId: string, dashboardId: string, widgets: Widget[]): Promise<void>;
    /**
     * Invalidate widget cache
     */
    invalidateWidget(tenantId: string, widgetId: string, publish?: boolean): Promise<void>;
    private invalidateWidgetInternal;
    /**
     * Get cached widget data (checks shared first, then user-specific)
     */
    getCachedWidgetData(tenantId: string, widgetId: string, userId: string, queryParams: Record<string, unknown>): Promise<WidgetDataResponse | null>;
    /**
     * Cache widget data
     * @param isShared Whether this data can be shared across users
     */
    cacheWidgetData(tenantId: string, widgetId: string, userId: string, queryParams: Record<string, unknown>, data: WidgetDataResponse, isShared?: boolean): Promise<void>;
    /**
     * Invalidate all widget data for a tenant (when shards change)
     */
    invalidateWidgetDataForTenant(tenantId: string): Promise<void>;
    /**
     * Get cached merged dashboard
     */
    getCachedMergedDashboard(tenantId: string, userId: string, dashboardId?: string): Promise<MergedDashboard | null>;
    /**
     * Cache merged dashboard
     */
    cacheMergedDashboard(tenantId: string, userId: string, merged: MergedDashboard, dashboardId?: string): Promise<void>;
    /**
     * Invalidate merged dashboard cache for user
     */
    invalidateMergedDashboard(tenantId: string, userId: string): Promise<void>;
    /**
     * Get cached user overrides
     */
    getCachedUserOverrides(tenantId: string, userId: string, dashboardId: string): Promise<UserDashboardOverrides | null>;
    /**
     * Cache user overrides
     */
    cacheUserOverrides(tenantId: string, userId: string, dashboardId: string, overrides: UserDashboardOverrides): Promise<void>;
    /**
     * Invalidate user overrides cache
     */
    invalidateUserOverrides(tenantId: string, userId: string, dashboardId: string): Promise<void>;
    /**
     * Get cached tenant dashboard config
     */
    getCachedTenantConfig(tenantId: string): Promise<TenantDashboardConfig | null>;
    /**
     * Cache tenant dashboard config
     */
    cacheTenantConfig(config: TenantDashboardConfig): Promise<void>;
    /**
     * Invalidate tenant config cache
     */
    invalidateTenantConfig(tenantId: string): Promise<void>;
    /**
     * Get cached fiscal year config
     */
    getCachedFiscalYearConfig(tenantId: string): Promise<TenantFiscalYearConfig | null>;
    /**
     * Cache fiscal year config
     */
    cacheFiscalYearConfig(config: TenantFiscalYearConfig): Promise<void>;
    /**
     * Invalidate fiscal year cache
     */
    invalidateFiscalYearConfig(tenantId: string): Promise<void>;
    /**
     * Invalidate all dashboard caches for tenant
     */
    invalidateAllDashboards(tenantId: string, publish?: boolean): Promise<void>;
    private invalidateAllDashboardsInternal;
    /**
     * Warm cache for frequently accessed dashboards
     */
    warmCache(tenantId: string, dashboards: Dashboard[], widgetsMap: Map<string, Widget[]>): Promise<void>;
    /**
     * Update TTL configuration (for admin)
     */
    updateTTLConfig(newConfig: Partial<DashboardCacheTTLConfig>): void;
    /**
     * Get current TTL configuration
     */
    getTTLConfig(): DashboardCacheTTLConfig;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        hits: number;
        misses: number;
        evictions: number;
        errors: number;
        total: number;
        hitRate: string;
    };
    private trackCacheAccess;
    private handleCacheError;
}
//# sourceMappingURL=dashboard-cache.service.d.ts.map
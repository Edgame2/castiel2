/**
 * Dashboard Cache Service
 * Handles caching for dashboards, widgets, and widget data
 * Uses hybrid strategy: TTL + event-based invalidation
 */
import { cacheKeys, CacheTTL, hashQuery } from '../utils/cache-keys.js';
/**
 * Default TTL configuration
 */
const DEFAULT_TTL_CONFIG = {
    dashboard: CacheTTL.DASHBOARD,
    dashboardWidgets: CacheTTL.DASHBOARD_WIDGETS,
    widget: CacheTTL.WIDGET,
    widgetData: CacheTTL.WIDGET_DATA,
    mergedDashboard: CacheTTL.MERGED_DASHBOARD,
    userOverrides: CacheTTL.USER_OVERRIDES,
    tenantConfig: CacheTTL.TENANT_CONFIG,
    fiscalYear: CacheTTL.FISCAL_YEAR,
};
/**
 * Dashboard Cache Service
 */
export class DashboardCacheService {
    cacheService;
    cacheSubscriber;
    monitoring;
    ttlConfig;
    constructor(cacheService, cacheSubscriber, monitoring, ttlConfig) {
        this.cacheService = cacheService;
        this.cacheSubscriber = cacheSubscriber;
        this.monitoring = monitoring;
        this.ttlConfig = { ...DEFAULT_TTL_CONFIG, ...ttlConfig };
        // Subscribe to invalidation events
        this.subscribeToInvalidations();
    }
    /**
     * Subscribe to cache invalidation events for dashboards
     */
    subscribeToInvalidations() {
        this.cacheSubscriber.subscribe('dashboard', async (tenantId, resourceId) => {
            if (resourceId) {
                await this.invalidateDashboardInternal(tenantId, resourceId);
            }
            else {
                await this.invalidateAllDashboardsInternal(tenantId);
            }
        });
        this.cacheSubscriber.subscribe('widget', async (tenantId, resourceId) => {
            if (resourceId) {
                await this.invalidateWidgetInternal(tenantId, resourceId);
            }
        });
        // Subscribe to shard events that might affect widget data
        this.cacheSubscriber.subscribe('shard', async (tenantId) => {
            // When shards change, invalidate all widget data for the tenant
            await this.invalidateWidgetDataForTenant(tenantId);
        });
    }
    // ============================================================================
    // Dashboard Caching
    // ============================================================================
    /**
     * Get cached dashboard
     */
    async getCachedDashboard(tenantId, dashboardId) {
        try {
            const key = cacheKeys.dashboard(tenantId, dashboardId);
            const cached = await this.cacheService.get(key);
            this.trackCacheAccess('dashboard', tenantId, cached !== null);
            return cached;
        }
        catch (error) {
            this.handleCacheError('dashboard.get', error, { tenantId, dashboardId });
            return null;
        }
    }
    /**
     * Cache dashboard
     */
    async cacheDashboard(dashboard) {
        try {
            const key = cacheKeys.dashboard(dashboard.tenantId, dashboard.id);
            await this.cacheService.set(key, dashboard, this.ttlConfig.dashboard);
            this.monitoring.trackEvent('dashboard.cache.set', {
                tenantId: dashboard.tenantId,
                dashboardId: dashboard.id,
            });
        }
        catch (error) {
            this.handleCacheError('dashboard.set', error, {
                tenantId: dashboard.tenantId,
                dashboardId: dashboard.id
            });
        }
    }
    /**
     * Get or fetch dashboard with cache-aside pattern
     */
    async getOrFetchDashboard(tenantId, dashboardId, fetchFn) {
        const cached = await this.getCachedDashboard(tenantId, dashboardId);
        if (cached) {
            return cached;
        }
        const dashboard = await fetchFn();
        if (dashboard) {
            await this.cacheDashboard(dashboard);
        }
        return dashboard;
    }
    /**
     * Invalidate dashboard cache
     */
    async invalidateDashboard(tenantId, dashboardId, publish = true) {
        await this.invalidateDashboardInternal(tenantId, dashboardId);
        if (publish) {
            await this.cacheSubscriber.publishInvalidation(tenantId, 'dashboard', dashboardId);
        }
    }
    async invalidateDashboardInternal(tenantId, dashboardId) {
        try {
            // Invalidate dashboard metadata
            await this.cacheService.delete(cacheKeys.dashboard(tenantId, dashboardId));
            // Invalidate dashboard widgets list
            await this.cacheService.delete(cacheKeys.dashboardWidgets(tenantId, dashboardId));
            // Invalidate all merged dashboard caches that include this dashboard
            const pattern = `tenant:${tenantId}:merged:*`;
            await this.cacheService.invalidatePattern(pattern);
            this.monitoring.trackEvent('dashboard.cache.invalidate', {
                tenantId,
                dashboardId,
            });
        }
        catch (error) {
            this.handleCacheError('dashboard.invalidate', error, { tenantId, dashboardId });
        }
    }
    // ============================================================================
    // Widget Caching
    // ============================================================================
    /**
     * Get cached widget
     */
    async getCachedWidget(tenantId, widgetId) {
        try {
            const key = cacheKeys.widget(tenantId, widgetId);
            const cached = await this.cacheService.get(key);
            this.trackCacheAccess('widget', tenantId, cached !== null);
            return cached;
        }
        catch (error) {
            this.handleCacheError('widget.get', error, { tenantId, widgetId });
            return null;
        }
    }
    /**
     * Cache widget
     */
    async cacheWidget(widget) {
        try {
            const key = cacheKeys.widget(widget.tenantId, widget.id);
            await this.cacheService.set(key, widget, this.ttlConfig.widget);
            this.monitoring.trackEvent('widget.cache.set', {
                tenantId: widget.tenantId,
                widgetId: widget.id,
            });
        }
        catch (error) {
            this.handleCacheError('widget.set', error, {
                tenantId: widget.tenantId,
                widgetId: widget.id
            });
        }
    }
    /**
     * Get cached widgets for dashboard
     */
    async getCachedDashboardWidgets(tenantId, dashboardId) {
        try {
            const key = cacheKeys.dashboardWidgets(tenantId, dashboardId);
            const cached = await this.cacheService.get(key);
            this.trackCacheAccess('dashboardWidgets', tenantId, cached !== null);
            return cached;
        }
        catch (error) {
            this.handleCacheError('dashboardWidgets.get', error, { tenantId, dashboardId });
            return null;
        }
    }
    /**
     * Cache widgets for dashboard
     */
    async cacheDashboardWidgets(tenantId, dashboardId, widgets) {
        try {
            const key = cacheKeys.dashboardWidgets(tenantId, dashboardId);
            await this.cacheService.set(key, widgets, this.ttlConfig.dashboardWidgets);
            this.monitoring.trackEvent('dashboardWidgets.cache.set', {
                tenantId,
                dashboardId,
                count: widgets.length,
            });
        }
        catch (error) {
            this.handleCacheError('dashboardWidgets.set', error, { tenantId, dashboardId });
        }
    }
    /**
     * Invalidate widget cache
     */
    async invalidateWidget(tenantId, widgetId, publish = true) {
        await this.invalidateWidgetInternal(tenantId, widgetId);
        if (publish) {
            await this.cacheSubscriber.publishInvalidation(tenantId, 'widget', widgetId);
        }
    }
    async invalidateWidgetInternal(tenantId, widgetId) {
        try {
            // Invalidate widget config
            await this.cacheService.delete(cacheKeys.widget(tenantId, widgetId));
            // Invalidate all widget data (user-specific and shared)
            const pattern = cacheKeys.widgetPattern(tenantId, widgetId);
            await this.cacheService.invalidatePattern(pattern);
            this.monitoring.trackEvent('widget.cache.invalidate', {
                tenantId,
                widgetId,
            });
        }
        catch (error) {
            this.handleCacheError('widget.invalidate', error, { tenantId, widgetId });
        }
    }
    // ============================================================================
    // Widget Data Caching (Hybrid Strategy)
    // ============================================================================
    /**
     * Get cached widget data (checks shared first, then user-specific)
     */
    async getCachedWidgetData(tenantId, widgetId, userId, queryParams) {
        try {
            const queryHash = hashQuery(JSON.stringify(queryParams));
            // Try shared cache first (more efficient)
            const sharedKey = cacheKeys.widgetDataShared(tenantId, widgetId, queryHash);
            const sharedData = await this.cacheService.get(sharedKey);
            if (sharedData) {
                this.trackCacheAccess('widgetData.shared', tenantId, true);
                return { ...sharedData, metadata: { ...sharedData.metadata, cacheHit: true } };
            }
            // Try user-specific cache
            const userKey = cacheKeys.widgetDataUser(tenantId, widgetId, userId, queryHash);
            const userData = await this.cacheService.get(userKey);
            if (userData) {
                this.trackCacheAccess('widgetData.user', tenantId, true);
                return { ...userData, metadata: { ...userData.metadata, cacheHit: true } };
            }
            this.trackCacheAccess('widgetData', tenantId, false);
            return null;
        }
        catch (error) {
            this.handleCacheError('widgetData.get', error, { tenantId, widgetId, userId });
            return null;
        }
    }
    /**
     * Cache widget data
     * @param isShared Whether this data can be shared across users
     */
    async cacheWidgetData(tenantId, widgetId, userId, queryParams, data, isShared = false) {
        try {
            const queryHash = hashQuery(JSON.stringify(queryParams));
            if (isShared) {
                const key = cacheKeys.widgetDataShared(tenantId, widgetId, queryHash);
                await this.cacheService.set(key, data, this.ttlConfig.widgetData);
            }
            else {
                const key = cacheKeys.widgetDataUser(tenantId, widgetId, userId, queryHash);
                await this.cacheService.set(key, data, this.ttlConfig.widgetData);
            }
            this.monitoring.trackEvent('widgetData.cache.set', {
                tenantId,
                widgetId,
                isShared,
            });
        }
        catch (error) {
            this.handleCacheError('widgetData.set', error, { tenantId, widgetId });
        }
    }
    /**
     * Invalidate all widget data for a tenant (when shards change)
     */
    async invalidateWidgetDataForTenant(tenantId) {
        try {
            // Invalidate all widget data patterns
            const pattern = `tenant:${tenantId}:widget:*:data:*`;
            const deleted = await this.cacheService.invalidatePattern(pattern);
            this.monitoring.trackEvent('widgetData.cache.invalidateTenant', {
                tenantId,
                deleted,
            });
        }
        catch (error) {
            this.handleCacheError('widgetData.invalidateTenant', error, { tenantId });
        }
    }
    // ============================================================================
    // Merged Dashboard Caching
    // ============================================================================
    /**
     * Get cached merged dashboard
     */
    async getCachedMergedDashboard(tenantId, userId, dashboardId) {
        try {
            const key = cacheKeys.mergedDashboard(tenantId, userId, dashboardId);
            const cached = await this.cacheService.get(key);
            this.trackCacheAccess('mergedDashboard', tenantId, cached !== null);
            return cached;
        }
        catch (error) {
            this.handleCacheError('mergedDashboard.get', error, { tenantId, userId, dashboardId });
            return null;
        }
    }
    /**
     * Cache merged dashboard
     */
    async cacheMergedDashboard(tenantId, userId, merged, dashboardId) {
        try {
            const key = cacheKeys.mergedDashboard(tenantId, userId, dashboardId);
            await this.cacheService.set(key, merged, this.ttlConfig.mergedDashboard);
            this.monitoring.trackEvent('mergedDashboard.cache.set', {
                tenantId,
                userId,
                dashboardId: dashboardId || 'default',
            });
        }
        catch (error) {
            this.handleCacheError('mergedDashboard.set', error, { tenantId, userId });
        }
    }
    /**
     * Invalidate merged dashboard cache for user
     */
    async invalidateMergedDashboard(tenantId, userId) {
        try {
            const pattern = `tenant:${tenantId}:merged:${userId}:*`;
            await this.cacheService.invalidatePattern(pattern);
            this.monitoring.trackEvent('mergedDashboard.cache.invalidate', {
                tenantId,
                userId,
            });
        }
        catch (error) {
            this.handleCacheError('mergedDashboard.invalidate', error, { tenantId, userId });
        }
    }
    // ============================================================================
    // User Overrides Caching
    // ============================================================================
    /**
     * Get cached user overrides
     */
    async getCachedUserOverrides(tenantId, userId, dashboardId) {
        try {
            const key = cacheKeys.userOverrides(tenantId, userId, dashboardId);
            const cached = await this.cacheService.get(key);
            this.trackCacheAccess('userOverrides', tenantId, cached !== null);
            return cached;
        }
        catch (error) {
            this.handleCacheError('userOverrides.get', error, { tenantId, userId, dashboardId });
            return null;
        }
    }
    /**
     * Cache user overrides
     */
    async cacheUserOverrides(tenantId, userId, dashboardId, overrides) {
        try {
            const key = cacheKeys.userOverrides(tenantId, userId, dashboardId);
            await this.cacheService.set(key, overrides, this.ttlConfig.userOverrides);
            this.monitoring.trackEvent('userOverrides.cache.set', {
                tenantId,
                userId,
                dashboardId,
            });
        }
        catch (error) {
            this.handleCacheError('userOverrides.set', error, { tenantId, userId, dashboardId });
        }
    }
    /**
     * Invalidate user overrides cache
     */
    async invalidateUserOverrides(tenantId, userId, dashboardId) {
        try {
            await this.cacheService.delete(cacheKeys.userOverrides(tenantId, userId, dashboardId));
            // Also invalidate merged dashboard since overrides affect it
            await this.invalidateMergedDashboard(tenantId, userId);
            this.monitoring.trackEvent('userOverrides.cache.invalidate', {
                tenantId,
                userId,
                dashboardId,
            });
        }
        catch (error) {
            this.handleCacheError('userOverrides.invalidate', error, { tenantId, userId, dashboardId });
        }
    }
    // ============================================================================
    // Configuration Caching
    // ============================================================================
    /**
     * Get cached tenant dashboard config
     */
    async getCachedTenantConfig(tenantId) {
        try {
            const key = cacheKeys.tenantDashboardConfig(tenantId);
            const cached = await this.cacheService.get(key);
            this.trackCacheAccess('tenantConfig', tenantId, cached !== null);
            return cached;
        }
        catch (error) {
            this.handleCacheError('tenantConfig.get', error, { tenantId });
            return null;
        }
    }
    /**
     * Cache tenant dashboard config
     */
    async cacheTenantConfig(config) {
        try {
            const key = cacheKeys.tenantDashboardConfig(config.tenantId);
            await this.cacheService.set(key, config, this.ttlConfig.tenantConfig);
            this.monitoring.trackEvent('tenantConfig.cache.set', {
                tenantId: config.tenantId,
            });
        }
        catch (error) {
            this.handleCacheError('tenantConfig.set', error, { tenantId: config.tenantId });
        }
    }
    /**
     * Invalidate tenant config cache
     */
    async invalidateTenantConfig(tenantId) {
        try {
            await this.cacheService.delete(cacheKeys.tenantDashboardConfig(tenantId));
            this.monitoring.trackEvent('tenantConfig.cache.invalidate', { tenantId });
        }
        catch (error) {
            this.handleCacheError('tenantConfig.invalidate', error, { tenantId });
        }
    }
    /**
     * Get cached fiscal year config
     */
    async getCachedFiscalYearConfig(tenantId) {
        try {
            const key = cacheKeys.fiscalYear(tenantId);
            const cached = await this.cacheService.get(key);
            this.trackCacheAccess('fiscalYear', tenantId, cached !== null);
            return cached;
        }
        catch (error) {
            this.handleCacheError('fiscalYear.get', error, { tenantId });
            return null;
        }
    }
    /**
     * Cache fiscal year config
     */
    async cacheFiscalYearConfig(config) {
        try {
            const key = cacheKeys.fiscalYear(config.tenantId);
            await this.cacheService.set(key, config, this.ttlConfig.fiscalYear);
            this.monitoring.trackEvent('fiscalYear.cache.set', {
                tenantId: config.tenantId,
            });
        }
        catch (error) {
            this.handleCacheError('fiscalYear.set', error, { tenantId: config.tenantId });
        }
    }
    /**
     * Invalidate fiscal year cache
     */
    async invalidateFiscalYearConfig(tenantId) {
        try {
            await this.cacheService.delete(cacheKeys.fiscalYear(tenantId));
            // Fiscal year affects date calculations in widget data
            await this.invalidateWidgetDataForTenant(tenantId);
            this.monitoring.trackEvent('fiscalYear.cache.invalidate', { tenantId });
        }
        catch (error) {
            this.handleCacheError('fiscalYear.invalidate', error, { tenantId });
        }
    }
    // ============================================================================
    // Bulk Operations
    // ============================================================================
    /**
     * Invalidate all dashboard caches for tenant
     */
    async invalidateAllDashboards(tenantId, publish = true) {
        await this.invalidateAllDashboardsInternal(tenantId);
        if (publish) {
            await this.cacheSubscriber.publishInvalidation(tenantId, 'dashboard');
        }
    }
    async invalidateAllDashboardsInternal(tenantId) {
        try {
            // Invalidate all dashboard-related keys
            const dashboardPattern = cacheKeys.allDashboardsPattern(tenantId);
            const widgetPattern = `tenant:${tenantId}:widget:*`;
            const mergedPattern = `tenant:${tenantId}:merged:*`;
            await Promise.all([
                this.cacheService.invalidatePattern(dashboardPattern),
                this.cacheService.invalidatePattern(widgetPattern),
                this.cacheService.invalidatePattern(mergedPattern),
            ]);
            this.monitoring.trackEvent('dashboard.cache.invalidateAll', { tenantId });
        }
        catch (error) {
            this.handleCacheError('dashboard.invalidateAll', error, { tenantId });
        }
    }
    /**
     * Warm cache for frequently accessed dashboards
     */
    async warmCache(tenantId, dashboards, widgetsMap) {
        try {
            const operations = [];
            for (const dashboard of dashboards) {
                operations.push(this.cacheDashboard(dashboard));
                const widgets = widgetsMap.get(dashboard.id);
                if (widgets) {
                    operations.push(this.cacheDashboardWidgets(tenantId, dashboard.id, widgets));
                    for (const widget of widgets) {
                        operations.push(this.cacheWidget(widget));
                    }
                }
            }
            await Promise.all(operations);
            this.monitoring.trackEvent('dashboard.cache.warm', {
                tenantId,
                dashboardCount: dashboards.length,
            });
        }
        catch (error) {
            this.handleCacheError('dashboard.warm', error, { tenantId });
        }
    }
    // ============================================================================
    // TTL Configuration
    // ============================================================================
    /**
     * Update TTL configuration (for admin)
     */
    updateTTLConfig(newConfig) {
        this.ttlConfig = { ...this.ttlConfig, ...newConfig };
        this.monitoring.trackEvent('dashboard.cache.configUpdate', {
            config: this.ttlConfig,
        });
    }
    /**
     * Get current TTL configuration
     */
    getTTLConfig() {
        return { ...this.ttlConfig };
    }
    // ============================================================================
    // Statistics
    // ============================================================================
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.cacheService.getStats();
    }
    // ============================================================================
    // Helpers
    // ============================================================================
    trackCacheAccess(resource, tenantId, hit) {
        this.monitoring.trackEvent(`dashboard.cache.${hit ? 'hit' : 'miss'}`, {
            resource,
            tenantId,
        });
    }
    handleCacheError(operation, error, context) {
        this.monitoring.trackException(error, {
            operation: `dashboard.cache.${operation}`,
            ...context,
        });
        // Don't throw - caching failures shouldn't break the application
    }
}
//# sourceMappingURL=dashboard-cache.service.js.map
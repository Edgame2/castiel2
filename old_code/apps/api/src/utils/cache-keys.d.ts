/**
 * Cache key builder utility with tenant isolation
 * Provides standardized key patterns for different resource types
 */
/**
 * Cache key patterns for different resource types
 */
export declare enum CacheKeyPattern {
    SHARD_STRUCTURED = "tenant:{tenantId}:shard:{shardId}:structured",
    USER_PROFILE = "tenant:{tenantId}:user:{userId}:profile",
    ACL_CHECK = "tenant:{tenantId}:acl:{userId}:{shardId}",
    VECTOR_SEARCH = "tenant:{tenantId}:vsearch:{queryHash}",
    SHARD_TYPE = "tenant:{tenantId}:shardtype:{shardTypeId}",
    ORGANIZATION = "tenant:{tenantId}:org:{orgId}",
    DASHBOARD = "tenant:{tenantId}:dashboard:{dashboardId}",
    DASHBOARD_WIDGETS = "tenant:{tenantId}:dashboard:{dashboardId}:widgets",
    WIDGET = "tenant:{tenantId}:widget:{widgetId}",
    WIDGET_DATA_USER = "tenant:{tenantId}:widget:{widgetId}:data:user:{userId}:{hash}",
    WIDGET_DATA_SHARED = "tenant:{tenantId}:widget:{widgetId}:data:shared:{hash}",
    MERGED_DASHBOARD = "tenant:{tenantId}:merged:{userId}:{dashboardId}",
    USER_OVERRIDES = "tenant:{tenantId}:user:{userId}:dashboard:{dashboardId}:overrides",
    TENANT_CONFIG = "tenant:{tenantId}:config:dashboard",
    FISCAL_YEAR = "tenant:{tenantId}:config:fiscalYear"
}
/**
 * TTL constants for different resource types (in seconds)
 */
export declare const CacheTTL: {
    readonly SHARD_STRUCTURED: number;
    readonly SHARD_STRUCTURED_MAX: number;
    readonly USER_PROFILE: number;
    readonly ACL_CHECK: number;
    readonly VECTOR_SEARCH: number;
    readonly SHARD_TYPE: number;
    readonly ORGANIZATION: number;
    readonly JWT_VALIDATION: number;
    readonly DASHBOARD: number;
    readonly DASHBOARD_WIDGETS: number;
    readonly WIDGET: number;
    readonly WIDGET_DATA: number;
    readonly MERGED_DASHBOARD: number;
    readonly USER_OVERRIDES: number;
    readonly TENANT_CONFIG: number;
    readonly FISCAL_YEAR: number;
};
/**
 * Cache key builder interface
 */
export interface CacheKeyBuilder {
    /**
     * Build cache key for shard structured data
     */
    shardStructured(tenantId: string, shardId: string): string;
    /**
     * Build cache key for user profile
     */
    userProfile(tenantId: string, userId: string): string;
    /**
     * Build cache key for ACL check result
     */
    aclCheck(tenantId: string, userId: string, shardId: string): string;
    /**
     * Build cache key for vector search result
     */
    vectorSearch(tenantId: string, queryHash: string): string;
    /**
     * Build cache key for shard type
     */
    shardType(tenantId: string, shardTypeId: string): string;
    /**
     * Build cache key for organization
     */
    organization(tenantId: string, orgId: string): string;
    /**
     * Build invalidation pattern for tenant (all keys)
     */
    tenantPattern(tenantId: string): string;
    /**
     * Build invalidation pattern for user (all user-related keys)
     */
    userPattern(tenantId: string, userId: string): string;
    /**
     * Build invalidation pattern for shard (all shard-related keys)
     */
    shardPattern(tenantId: string, shardId: string): string;
    /**
     * Build cache key for dashboard metadata
     */
    dashboard(tenantId: string, dashboardId: string): string;
    /**
     * Build cache key for dashboard widgets list
     */
    dashboardWidgets(tenantId: string, dashboardId: string): string;
    /**
     * Build cache key for widget config
     */
    widget(tenantId: string, widgetId: string): string;
    /**
     * Build cache key for user-specific widget data
     */
    widgetDataUser(tenantId: string, widgetId: string, userId: string, queryHash: string): string;
    /**
     * Build cache key for shared widget data
     */
    widgetDataShared(tenantId: string, widgetId: string, queryHash: string): string;
    /**
     * Build cache key for merged dashboard
     */
    mergedDashboard(tenantId: string, userId: string, dashboardId?: string): string;
    /**
     * Build cache key for user dashboard overrides
     */
    userOverrides(tenantId: string, userId: string, dashboardId: string): string;
    /**
     * Build cache key for tenant dashboard config
     */
    tenantDashboardConfig(tenantId: string): string;
    /**
     * Build cache key for tenant fiscal year config
     */
    fiscalYear(tenantId: string): string;
    /**
     * Build invalidation pattern for dashboard (all dashboard-related keys)
     */
    dashboardPattern(tenantId: string, dashboardId: string): string;
    /**
     * Build invalidation pattern for widget (all widget-related keys)
     */
    widgetPattern(tenantId: string, widgetId: string): string;
    /**
     * Build invalidation pattern for all dashboards in tenant
     */
    allDashboardsPattern(tenantId: string): string;
}
/**
 * Default cache key builder implementation
 */
export declare class DefaultCacheKeyBuilder implements CacheKeyBuilder {
    shardStructured(tenantId: string, shardId: string): string;
    userProfile(tenantId: string, userId: string): string;
    aclCheck(tenantId: string, userId: string, shardId: string): string;
    vectorSearch(tenantId: string, queryHash: string): string;
    shardType(tenantId: string, shardTypeId: string): string;
    organization(tenantId: string, orgId: string): string;
    tenantPattern(tenantId: string): string;
    userPattern(tenantId: string, userId: string): string;
    shardPattern(tenantId: string, shardId: string): string;
    dashboard(tenantId: string, dashboardId: string): string;
    dashboardWidgets(tenantId: string, dashboardId: string): string;
    widget(tenantId: string, widgetId: string): string;
    widgetDataUser(tenantId: string, widgetId: string, userId: string, queryHash: string): string;
    widgetDataShared(tenantId: string, widgetId: string, queryHash: string): string;
    mergedDashboard(tenantId: string, userId: string, dashboardId?: string): string;
    userOverrides(tenantId: string, userId: string, dashboardId: string): string;
    tenantDashboardConfig(tenantId: string): string;
    fiscalYear(tenantId: string): string;
    dashboardPattern(tenantId: string, dashboardId: string): string;
    widgetPattern(tenantId: string, widgetId: string): string;
    allDashboardsPattern(tenantId: string): string;
}
/**
 * Utility function to hash queries for cache keys
 * Uses a simple hash function for consistency
 */
export declare function hashQuery(query: string): string;
/**
 * Singleton instance of the default cache key builder
 */
export declare const cacheKeys: CacheKeyBuilder;
/**
 * Helper functions for common cache operations
 */
export declare const CacheHelpers: {
    /**
     * Get TTL for a specific resource type
     */
    getTTL(resourceType: keyof typeof CacheTTL): number;
    /**
     * Build a custom cache key with tenant isolation
     */
    buildKey(tenantId: string, ...parts: string[]): string;
    /**
     * Parse tenant ID from cache key
     */
    parseTenantId(key: string): string | null;
    /**
     * Validate cache key format
     */
    isValidKey(key: string): boolean;
};
//# sourceMappingURL=cache-keys.d.ts.map
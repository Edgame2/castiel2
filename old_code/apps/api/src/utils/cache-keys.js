/**
 * Cache key builder utility with tenant isolation
 * Provides standardized key patterns for different resource types
 */
/**
 * Cache key patterns for different resource types
 */
export var CacheKeyPattern;
(function (CacheKeyPattern) {
    CacheKeyPattern["SHARD_STRUCTURED"] = "tenant:{tenantId}:shard:{shardId}:structured";
    CacheKeyPattern["USER_PROFILE"] = "tenant:{tenantId}:user:{userId}:profile";
    CacheKeyPattern["ACL_CHECK"] = "tenant:{tenantId}:acl:{userId}:{shardId}";
    CacheKeyPattern["VECTOR_SEARCH"] = "tenant:{tenantId}:vsearch:{queryHash}";
    CacheKeyPattern["SHARD_TYPE"] = "tenant:{tenantId}:shardtype:{shardTypeId}";
    CacheKeyPattern["ORGANIZATION"] = "tenant:{tenantId}:org:{orgId}";
    // Dashboard cache keys
    CacheKeyPattern["DASHBOARD"] = "tenant:{tenantId}:dashboard:{dashboardId}";
    CacheKeyPattern["DASHBOARD_WIDGETS"] = "tenant:{tenantId}:dashboard:{dashboardId}:widgets";
    CacheKeyPattern["WIDGET"] = "tenant:{tenantId}:widget:{widgetId}";
    CacheKeyPattern["WIDGET_DATA_USER"] = "tenant:{tenantId}:widget:{widgetId}:data:user:{userId}:{hash}";
    CacheKeyPattern["WIDGET_DATA_SHARED"] = "tenant:{tenantId}:widget:{widgetId}:data:shared:{hash}";
    CacheKeyPattern["MERGED_DASHBOARD"] = "tenant:{tenantId}:merged:{userId}:{dashboardId}";
    CacheKeyPattern["USER_OVERRIDES"] = "tenant:{tenantId}:user:{userId}:dashboard:{dashboardId}:overrides";
    CacheKeyPattern["TENANT_CONFIG"] = "tenant:{tenantId}:config:dashboard";
    CacheKeyPattern["FISCAL_YEAR"] = "tenant:{tenantId}:config:fiscalYear";
})(CacheKeyPattern || (CacheKeyPattern = {}));
/**
 * TTL constants for different resource types (in seconds)
 */
export const CacheTTL = {
    SHARD_STRUCTURED: 15 * 60, // 15 minutes
    SHARD_STRUCTURED_MAX: 30 * 60, // 30 minutes
    USER_PROFILE: 60 * 60, // 1 hour
    ACL_CHECK: 10 * 60, // 10 minutes
    VECTOR_SEARCH: 30 * 60, // 30 minutes
    SHARD_TYPE: 2 * 60 * 60, // 2 hours (rarely changes)
    ORGANIZATION: 60 * 60, // 1 hour
    JWT_VALIDATION: 5 * 60, // 5 minutes
    // Dashboard TTLs (default 15 minutes, configurable)
    DASHBOARD: 15 * 60, // 15 minutes
    DASHBOARD_WIDGETS: 15 * 60, // 15 minutes
    WIDGET: 15 * 60, // 15 minutes
    WIDGET_DATA: 15 * 60, // 15 minutes (expensive queries)
    MERGED_DASHBOARD: 15 * 60, // 15 minutes
    USER_OVERRIDES: 30 * 60, // 30 minutes (changes rarely)
    TENANT_CONFIG: 60 * 60, // 1 hour (rarely changes)
    FISCAL_YEAR: 24 * 60 * 60, // 24 hours (changes very rarely)
};
/**
 * Default cache key builder implementation
 */
export class DefaultCacheKeyBuilder {
    shardStructured(tenantId, shardId) {
        return `tenant:${tenantId}:shard:${shardId}:structured`;
    }
    userProfile(tenantId, userId) {
        return `tenant:${tenantId}:user:${userId}:profile`;
    }
    aclCheck(tenantId, userId, shardId) {
        return `tenant:${tenantId}:acl:${userId}:${shardId}`;
    }
    vectorSearch(tenantId, queryHash) {
        return `tenant:${tenantId}:vsearch:${queryHash}`;
    }
    shardType(tenantId, shardTypeId) {
        return `tenant:${tenantId}:shardtype:${shardTypeId}`;
    }
    organization(tenantId, orgId) {
        return `tenant:${tenantId}:org:${orgId}`;
    }
    tenantPattern(tenantId) {
        return `tenant:${tenantId}:*`;
    }
    userPattern(tenantId, userId) {
        return `tenant:${tenantId}:user:${userId}:*`;
    }
    shardPattern(tenantId, shardId) {
        return `tenant:${tenantId}:shard:${shardId}:*`;
    }
    // Dashboard cache keys
    dashboard(tenantId, dashboardId) {
        return `tenant:${tenantId}:dashboard:${dashboardId}`;
    }
    dashboardWidgets(tenantId, dashboardId) {
        return `tenant:${tenantId}:dashboard:${dashboardId}:widgets`;
    }
    widget(tenantId, widgetId) {
        return `tenant:${tenantId}:widget:${widgetId}`;
    }
    widgetDataUser(tenantId, widgetId, userId, queryHash) {
        return `tenant:${tenantId}:widget:${widgetId}:data:user:${userId}:${queryHash}`;
    }
    widgetDataShared(tenantId, widgetId, queryHash) {
        return `tenant:${tenantId}:widget:${widgetId}:data:shared:${queryHash}`;
    }
    mergedDashboard(tenantId, userId, dashboardId) {
        if (dashboardId) {
            return `tenant:${tenantId}:merged:${userId}:${dashboardId}`;
        }
        return `tenant:${tenantId}:merged:${userId}:default`;
    }
    userOverrides(tenantId, userId, dashboardId) {
        return `tenant:${tenantId}:user:${userId}:dashboard:${dashboardId}:overrides`;
    }
    tenantDashboardConfig(tenantId) {
        return `tenant:${tenantId}:config:dashboard`;
    }
    fiscalYear(tenantId) {
        return `tenant:${tenantId}:config:fiscalYear`;
    }
    dashboardPattern(tenantId, dashboardId) {
        return `tenant:${tenantId}:dashboard:${dashboardId}:*`;
    }
    widgetPattern(tenantId, widgetId) {
        return `tenant:${tenantId}:widget:${widgetId}:*`;
    }
    allDashboardsPattern(tenantId) {
        return `tenant:${tenantId}:dashboard:*`;
    }
}
/**
 * Utility function to hash queries for cache keys
 * Uses a simple hash function for consistency
 */
export function hashQuery(query) {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
        const char = query.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}
/**
 * Singleton instance of the default cache key builder
 */
export const cacheKeys = new DefaultCacheKeyBuilder();
/**
 * Helper functions for common cache operations
 */
export const CacheHelpers = {
    /**
     * Get TTL for a specific resource type
     */
    getTTL(resourceType) {
        return CacheTTL[resourceType];
    },
    /**
     * Build a custom cache key with tenant isolation
     */
    buildKey(tenantId, ...parts) {
        return `tenant:${tenantId}:${parts.join(':')}`;
    },
    /**
     * Parse tenant ID from cache key
     */
    parseTenantId(key) {
        const match = key.match(/^tenant:([^:]+):/);
        return match ? match[1] : null;
    },
    /**
     * Validate cache key format
     */
    isValidKey(key) {
        return /^tenant:[^:]+:/.test(key);
    },
};
//# sourceMappingURL=cache-keys.js.map
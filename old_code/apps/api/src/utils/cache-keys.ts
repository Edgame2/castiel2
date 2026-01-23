/**
 * Cache key builder utility with tenant isolation
 * Provides standardized key patterns for different resource types
 */

/**
 * Cache key patterns for different resource types
 */
export enum CacheKeyPattern {
  SHARD_STRUCTURED = 'tenant:{tenantId}:shard:{shardId}:structured',
  USER_PROFILE = 'tenant:{tenantId}:user:{userId}:profile',
  ACL_CHECK = 'tenant:{tenantId}:acl:{userId}:{shardId}',
  VECTOR_SEARCH = 'tenant:{tenantId}:vsearch:{queryHash}',
  SHARD_TYPE = 'tenant:{tenantId}:shardtype:{shardTypeId}',
  ORGANIZATION = 'tenant:{tenantId}:org:{orgId}',
  // Dashboard cache keys
  DASHBOARD = 'tenant:{tenantId}:dashboard:{dashboardId}',
  DASHBOARD_WIDGETS = 'tenant:{tenantId}:dashboard:{dashboardId}:widgets',
  WIDGET = 'tenant:{tenantId}:widget:{widgetId}',
  WIDGET_DATA_USER = 'tenant:{tenantId}:widget:{widgetId}:data:user:{userId}:{hash}',
  WIDGET_DATA_SHARED = 'tenant:{tenantId}:widget:{widgetId}:data:shared:{hash}',
  MERGED_DASHBOARD = 'tenant:{tenantId}:merged:{userId}:{dashboardId}',
  USER_OVERRIDES = 'tenant:{tenantId}:user:{userId}:dashboard:{dashboardId}:overrides',
  TENANT_CONFIG = 'tenant:{tenantId}:config:dashboard',
  FISCAL_YEAR = 'tenant:{tenantId}:config:fiscalYear',
  // Adaptive Learning cache keys
  ADAPTIVE_WEIGHTS = 'learned_params:{tenantId}:weights:{contextKey}',
  ADAPTIVE_MODEL_SEL = 'learned_params:{tenantId}:model_sel:{contextKey}',
  ADAPTIVE_SIGNALS = 'learned_params:{tenantId}:signals:{contextKey}',
  ADAPTIVE_FEATURES = 'learned_params:{tenantId}:features:{contextKey}',
  ADAPTIVE_META = 'learned_params:{tenantId}:meta:{paramType}',
  ADAPTIVE_PERF = 'learned_params:{tenantId}:perf:{contextKey}:{window}',
  CONFLICT_RESOLUTION = 'conflict_resolution:{tenantId}:{contextKey}:{method1}:{method2}',
}

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
  // Adaptive Learning TTLs (event-based invalidation, 15-min fallback)
  ADAPTIVE_WEIGHTS: 15 * 60, // 15 minutes fallback TTL
  ADAPTIVE_MODEL_SEL: 15 * 60,
  ADAPTIVE_SIGNALS: 15 * 60,
  ADAPTIVE_FEATURES: 15 * 60,
  ADAPTIVE_META: 15 * 60,
  ADAPTIVE_PERF: 15 * 60,
  CONFLICT_RESOLUTION: 15 * 60, // 15 minutes fallback TTL
} as const;

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

  // Dashboard cache key methods
  
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
export class DefaultCacheKeyBuilder implements CacheKeyBuilder {
  shardStructured(tenantId: string, shardId: string): string {
    return `tenant:${tenantId}:shard:${shardId}:structured`;
  }

  userProfile(tenantId: string, userId: string): string {
    return `tenant:${tenantId}:user:${userId}:profile`;
  }

  aclCheck(tenantId: string, userId: string, shardId: string): string {
    return `tenant:${tenantId}:acl:${userId}:${shardId}`;
  }

  vectorSearch(tenantId: string, queryHash: string): string {
    return `tenant:${tenantId}:vsearch:${queryHash}`;
  }

  shardType(tenantId: string, shardTypeId: string): string {
    return `tenant:${tenantId}:shardtype:${shardTypeId}`;
  }

  organization(tenantId: string, orgId: string): string {
    return `tenant:${tenantId}:org:${orgId}`;
  }

  tenantPattern(tenantId: string): string {
    return `tenant:${tenantId}:*`;
  }

  userPattern(tenantId: string, userId: string): string {
    return `tenant:${tenantId}:user:${userId}:*`;
  }

  shardPattern(tenantId: string, shardId: string): string {
    return `tenant:${tenantId}:shard:${shardId}:*`;
  }

  // Dashboard cache keys

  dashboard(tenantId: string, dashboardId: string): string {
    return `tenant:${tenantId}:dashboard:${dashboardId}`;
  }

  dashboardWidgets(tenantId: string, dashboardId: string): string {
    return `tenant:${tenantId}:dashboard:${dashboardId}:widgets`;
  }

  widget(tenantId: string, widgetId: string): string {
    return `tenant:${tenantId}:widget:${widgetId}`;
  }

  widgetDataUser(tenantId: string, widgetId: string, userId: string, queryHash: string): string {
    return `tenant:${tenantId}:widget:${widgetId}:data:user:${userId}:${queryHash}`;
  }

  widgetDataShared(tenantId: string, widgetId: string, queryHash: string): string {
    return `tenant:${tenantId}:widget:${widgetId}:data:shared:${queryHash}`;
  }

  mergedDashboard(tenantId: string, userId: string, dashboardId?: string): string {
    if (dashboardId) {
      return `tenant:${tenantId}:merged:${userId}:${dashboardId}`;
    }
    return `tenant:${tenantId}:merged:${userId}:default`;
  }

  userOverrides(tenantId: string, userId: string, dashboardId: string): string {
    return `tenant:${tenantId}:user:${userId}:dashboard:${dashboardId}:overrides`;
  }

  tenantDashboardConfig(tenantId: string): string {
    return `tenant:${tenantId}:config:dashboard`;
  }

  fiscalYear(tenantId: string): string {
    return `tenant:${tenantId}:config:fiscalYear`;
  }

  dashboardPattern(tenantId: string, dashboardId: string): string {
    return `tenant:${tenantId}:dashboard:${dashboardId}:*`;
  }

  widgetPattern(tenantId: string, widgetId: string): string {
    return `tenant:${tenantId}:widget:${widgetId}:*`;
  }

  allDashboardsPattern(tenantId: string): string {
    return `tenant:${tenantId}:dashboard:*`;
  }
}

/**
 * Utility function to hash queries for cache keys
 * Uses a simple hash function for consistency
 */
export function hashQuery(query: string): string {
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
export const cacheKeys: CacheKeyBuilder = new DefaultCacheKeyBuilder();

/**
 * Helper functions for common cache operations
 */
export const CacheHelpers = {
  /**
   * Get TTL for a specific resource type
   */
  getTTL(resourceType: keyof typeof CacheTTL): number {
    return CacheTTL[resourceType];
  },

  /**
   * Build a custom cache key with tenant isolation
   */
  buildKey(tenantId: string, ...parts: string[]): string {
    return `tenant:${tenantId}:${parts.join(':')}`;
  },

  /**
   * Parse tenant ID from cache key
   */
  parseTenantId(key: string): string | null {
    const match = key.match(/^tenant:([^:]+):/);
    return match ? match[1] : null;
  },

  /**
   * Validate cache key format
   */
  isValidKey(key: string): boolean {
    return /^tenant:[^:]+:/.test(key);
  },
};

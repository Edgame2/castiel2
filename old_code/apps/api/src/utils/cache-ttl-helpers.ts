/**
 * Cache TTL Helpers
 * 
 * Provides utilities for managing cache TTLs with jitter and optimization
 */

import { CacheTTL } from './cache-keys.js';

/**
 * TTL jitter configuration
 * Adds randomness to TTLs to prevent thundering herd problems
 */
export interface TTLJitterConfig {
  /**
   * Percentage of jitter to apply (0-1)
   * 0.1 = ±10% variation
   */
  jitterPercent: number;
  
  /**
   * Minimum TTL in seconds (prevents negative or too-short TTLs)
   */
  minTTL?: number;
}

/**
 * Default jitter configuration
 */
const DEFAULT_JITTER_CONFIG: TTLJitterConfig = {
  jitterPercent: 0.1, // ±10% variation
  minTTL: 60, // Minimum 1 minute
};

/**
 * Apply jitter to a TTL value to prevent thundering herd
 * 
 * @param baseTTL Base TTL in seconds
 * @param config Jitter configuration
 * @returns TTL with jitter applied
 * 
 * @example
 * // Base TTL: 900 seconds (15 minutes)
 * // With 10% jitter: returns value between 810-990 seconds
 * const ttl = applyTTLJitter(900);
 */
export function applyTTLJitter(
  baseTTL: number,
  config: TTLJitterConfig = DEFAULT_JITTER_CONFIG
): number {
  const { jitterPercent, minTTL = 60 } = config;
  
  // Calculate jitter range
  const jitterAmount = baseTTL * jitterPercent;
  
  // Generate random jitter between -jitterAmount and +jitterAmount
  const jitter = (Math.random() * 2 - 1) * jitterAmount;
  
  // Apply jitter
  const ttlWithJitter = baseTTL + jitter;
  
  // Ensure minimum TTL
  return Math.max(ttlWithJitter, minTTL);
}

/**
 * Get optimized TTL for a resource type based on access patterns
 * 
 * @param resourceType Resource type
 * @param accessFrequency Access frequency (accesses per hour)
 * @param updateFrequency Update frequency (updates per hour)
 * @returns Optimized TTL in seconds
 */
export function getOptimizedTTL(
  resourceType: keyof typeof CacheTTL,
  accessFrequency: number = 1,
  updateFrequency: number = 0.1
): number {
  const baseTTL = CacheTTL[resourceType];
  
  // If resource is accessed frequently but updated rarely, increase TTL
  if (accessFrequency > 10 && updateFrequency < 0.5) {
    return Math.min(baseTTL * 1.5, baseTTL * 2); // Cap at 2x base TTL
  }
  
  // If resource is updated frequently, decrease TTL
  if (updateFrequency > 5) {
    return Math.max(baseTTL * 0.5, baseTTL * 0.75); // Reduce by 25-50%
  }
  
  // Default to base TTL
  return baseTTL;
}

/**
 * Get TTL with jitter for a resource type
 * 
 * @param resourceType Resource type
 * @param config Optional jitter configuration
 * @returns TTL with jitter applied
 */
export function getTTLWithJitter(
  resourceType: keyof typeof CacheTTL,
  config?: TTLJitterConfig
): number {
  const baseTTL = CacheTTL[resourceType];
  return applyTTLJitter(baseTTL, config);
}

/**
 * Cache TTL rationale documentation
 * Helps developers understand why each TTL was chosen
 */
export const TTL_RATIONALE: Record<keyof typeof CacheTTL, string> = {
  SHARD_STRUCTURED: '15 minutes - Balances freshness with performance. Shards are frequently read but updates are less common.',
  SHARD_STRUCTURED_MAX: '30 minutes - Maximum TTL for shard structured data. Used for rarely-updated shards.',
  USER_PROFILE: '1 hour - User profiles change infrequently. Reduces auth-broker calls while maintaining reasonable freshness.',
  ACL_CHECK: '10 minutes - Security-sensitive but frequently accessed. Short TTL ensures permission changes propagate quickly.',
  VECTOR_SEARCH: '30 minutes - Expensive similarity computations. Results are stable for similar queries.',
  SHARD_TYPE: '2 hours - Shard types rarely change. Long TTL reduces database load for frequently accessed schema definitions.',
  ORGANIZATION: '1 hour - Organization data changes infrequently. Balances freshness with performance.',
  JWT_VALIDATION: '5 minutes - Security-sensitive. Short TTL ensures token revocation is effective quickly.',
  DASHBOARD: '15 minutes - Dashboard data can change but not too frequently. Balances freshness with performance.',
  DASHBOARD_WIDGETS: '15 minutes - Widget lists change when dashboards are modified. Same as dashboard TTL.',
  WIDGET: '15 minutes - Widget configurations change when edited. Standard dashboard TTL.',
  WIDGET_DATA: '15 minutes - Widget data queries are expensive. Caching reduces database load.',
  MERGED_DASHBOARD: '15 minutes - Merged dashboards combine user overrides with base dashboard. Same TTL as dashboard.',
  USER_OVERRIDES: '30 minutes - User dashboard overrides change rarely. Longer TTL is acceptable.',
  TENANT_CONFIG: '1 hour - Tenant configuration changes infrequently. Longer TTL reduces database queries.',
  FISCAL_YEAR: '24 hours - Fiscal year configuration changes very rarely. Long TTL is appropriate.',
  ADAPTIVE_WEIGHTS: '15 minutes - Adaptive learning weights update based on usage. Event-based invalidation with fallback TTL.',
  ADAPTIVE_MODEL_SEL: '15 minutes - Model selection parameters update based on performance. Event-based invalidation.',
  ADAPTIVE_SIGNALS: '15 minutes - Learning signals update frequently. Event-based invalidation with short fallback.',
  ADAPTIVE_FEATURES: '15 minutes - Feature weights update based on usage patterns. Event-based invalidation.',
  ADAPTIVE_META: '15 minutes - Metadata about adaptive learning parameters. Event-based invalidation.',
  ADAPTIVE_PERF: '15 minutes - Performance metrics for adaptive learning. Event-based invalidation.',
  CONFLICT_RESOLUTION: '15 minutes - Conflict resolution parameters. Event-based invalidation with fallback TTL.',
};

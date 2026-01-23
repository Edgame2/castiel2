/**
 * ACL (Access Control List) Types
 * 
 * Comprehensive type system for access control management with caching support.
 * Supports both user-level and role-level permissions with inheritance.
 */

import { PermissionLevel } from './shard.types.js';
import type { UserRoleAssignment } from '@castiel/shared-types';

/**
 * ACL check result with cache metadata
 */
export interface ACLCheckResult {
  hasAccess: boolean;
  grantedPermissions: PermissionLevel[];
  effectivePermission: PermissionLevel | null;
  reason?: string;
  source: 'cache' | 'database' | 'inherited' | 'default';
  checkedAt: Date;
}

/**
 * ACL cache entry for Redis storage
 */
export interface ACLCacheEntry {
  userId: string;
  shardId: string;
  tenantId: string;
  permissions: PermissionLevel[];
  effectivePermission: PermissionLevel | null;
  source: 'database' | 'inherited' | 'default';
  cachedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
}

/**
 * ACL permission grant request
 */
export interface GrantPermissionInput {
  shardId: string;
  userId?: string;
  roleId?: string;
  permissions: PermissionLevel[];
  grantedBy: string;
}

/**
 * ACL permission revoke request
 */
export interface RevokePermissionInput {
  shardId: string;
  userId?: string;
  roleId?: string;
  permissions?: PermissionLevel[]; // If not specified, revoke all
  revokedBy: string;
}

/**
 * ACL batch check request for efficient bulk operations
 */
export interface ACLBatchCheckRequest {
  userId: string;
  tenantId: string;
  shardIds: string[];
  requiredPermission: PermissionLevel;
}

/**
 * ACL batch check result
 */
export interface ACLBatchCheckResult {
  userId: string;
  tenantId: string;
  results: Map<string, ACLCheckResult>; // shardId -> result
  checkedAt: Date;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * ACL update request for modifying shard permissions
 */
export interface UpdateACLInput {
  shardId: string;
  addEntries?: Array<{
    userId?: string;
    roleId?: string;
    permissions: PermissionLevel[];
  }>;
  removeEntries?: Array<{
    userId?: string;
    roleId?: string;
    permissions?: PermissionLevel[];
  }>;
  updatedBy: string;
}

/**
 * ACL inheritance configuration
 */
export interface ACLInheritanceConfig {
  enabled: boolean;
  inheritFromParent: boolean;
  maxDepth: number; // Maximum inheritance depth to prevent infinite loops
}

/**
 * ACL statistics for monitoring
 */
export interface ACLStats {
  totalChecks: number;
  cacheHits: number;
  cacheMisses: number;
  averageCheckDuration: number;
  invalidations: number;
}

/**
 * User's role information for permission resolution
 */
export interface UserRole {
  roleId: string;
  roleName: string;
  tenantId: string;
  permissions: string[]; // Generic permissions like 'shards:read', 'shards:write'
}

/**
 * Permission check context with all necessary information
 */
export interface PermissionCheckContext {
  userId: string;
  tenantId: string;
  shardId: string;
  requiredPermission: PermissionLevel;
  userRoles?: UserRoleAssignment[];
  checkInheritance?: boolean;
}

/**
 * ACL service interface for dependency injection
 */
export interface IACLService {
  /**
   * Check if user has required permission on a shard
   */
  checkPermission(context: PermissionCheckContext): Promise<ACLCheckResult>;

  /**
   * Batch check permissions for multiple shards (optimized)
   */
  batchCheckPermissions(request: ACLBatchCheckRequest): Promise<ACLBatchCheckResult>;

  /**
   * Grant permissions to a user or role
   */
  grantPermission(input: GrantPermissionInput): Promise<void>;

  /**
   * Revoke permissions from a user or role
   */
  revokePermission(input: RevokePermissionInput): Promise<void>;

  /**
   * Update ACL entries for a shard (add/remove in one operation)
   */
  updateACL(input: UpdateACLInput): Promise<void>;

  /**
   * Get all permissions for a user on a shard
   */
  getUserPermissions(userId: string, shardId: string, tenantId: string): Promise<PermissionLevel[]>;

  /**
   * Invalidate ACL cache for specific user/shard combination
   */
  invalidateCache(userId: string, shardId: string, tenantId: string): Promise<void>;

  /**
   * Invalidate all ACL cache entries for a user
   */
  invalidateUserCache(userId: string, tenantId: string): Promise<void>;

  /**
   * Invalidate all ACL cache entries for a shard
   */
  invalidateShardCache(shardId: string, tenantId: string): Promise<void>;

  /**
   * Get ACL statistics
   */
  getStats(): ACLStats;
}

/**
 * Helper function to check if permission level is sufficient
 */
export function hasPermissionLevel(
  userPermissions: PermissionLevel[],
  requiredPermission: PermissionLevel
): boolean {
  // Permission hierarchy: ADMIN > DELETE > WRITE > READ
  const hierarchy: Record<PermissionLevel, number> = {
    [PermissionLevel.READ]: 1,
    [PermissionLevel.WRITE]: 2,
    [PermissionLevel.DELETE]: 3,
    [PermissionLevel.ADMIN]: 4,
  };

  const requiredLevel = hierarchy[requiredPermission];
  const maxUserLevel = Math.max(
    ...userPermissions.map((p) => hierarchy[p] || 0)
  );

  return maxUserLevel >= requiredLevel;
}

/**
 * Helper function to get effective permission (highest level)
 */
export function getEffectivePermission(
  permissions: PermissionLevel[]
): PermissionLevel | null {
  if (permissions.length === 0) {return null;}

  const hierarchy: Record<PermissionLevel, number> = {
    [PermissionLevel.READ]: 1,
    [PermissionLevel.WRITE]: 2,
    [PermissionLevel.DELETE]: 3,
    [PermissionLevel.ADMIN]: 4,
  };

  // Find highest permission level
  let maxLevel = 0;
  let effectivePermission: PermissionLevel | null = null;

  for (const permission of permissions) {
    const level = hierarchy[permission] || 0;
    if (level > maxLevel) {
      maxLevel = level;
      effectivePermission = permission;
    }
  }

  return effectivePermission;
}

/**
 * Helper function to merge permission arrays (remove duplicates)
 */
export function mergePermissions(
  ...permissionArrays: PermissionLevel[][]
): PermissionLevel[] {
  const uniquePermissions = new Set<PermissionLevel>();

  for (const permissions of permissionArrays) {
    for (const permission of permissions) {
      uniquePermissions.add(permission);
    }
  }

  return Array.from(uniquePermissions);
}

/**
 * Default ACL cache TTL (10 minutes)
 */
export const ACL_CACHE_TTL_SECONDS = 10 * 60;

/**
 * Redis pub/sub channel for ACL invalidation
 */
export const ACL_INVALIDATION_CHANNEL = 'cache:invalidate:acl';

/**
 * ACL cache key builder
 */
export function buildACLCacheKey(
  tenantId: string,
  userId: string,
  shardId: string
): string {
  return `tenant:${tenantId}:acl:${userId}:${shardId}`;
}

/**
 * ACL cache pattern for bulk invalidation
 */
export function buildACLCachePattern(
  tenantId: string,
  userId?: string,
  shardId?: string
): string {
  if (userId && shardId) {
    return buildACLCacheKey(tenantId, userId, shardId);
  } else if (userId) {
    return `tenant:${tenantId}:acl:${userId}:*`;
  } else if (shardId) {
    return `tenant:${tenantId}:acl:*:${shardId}`;
  } else {
    return `tenant:${tenantId}:acl:*`;
  }
}

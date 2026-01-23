/**
 * Access Control List (ACL) Types
 * Permission and authorization types shared across services
 */

import { PermissionLevel } from './shard.js';

/**
 * ACL entry - defines who has what permissions on a resource
 */
export interface ACLEntry {
  id: string;
  tenantId: string;
  resourceId: string; // Usually shardId
  resourceType: 'shard' | 'shard-type' | 'organization' | 'tenant';
  userId?: string; // User-specific permission
  roleId?: string; // Role-based permission
  permissions: PermissionLevel[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * ACL cache entry for Redis
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
 * ACL check result
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
 * Grant permission input
 */
export interface GrantPermissionInput {
  shardId: string;
  userId?: string;
  roleId?: string;
  permissions: PermissionLevel[];
  grantedBy: string;
  expiresAt?: Date;
}

/**
 * Revoke permission input
 */
export interface RevokePermissionInput {
  shardId: string;
  userId?: string;
  roleId?: string;
  permissions?: PermissionLevel[]; // If not provided, revoke all
  revokedBy: string;
}

/**
 * ACL filter for queries
 */
export interface ACLFilter {
  tenantId: string;
  resourceId?: string;
  resourceType?: 'shard' | 'shard-type' | 'organization' | 'tenant';
  userId?: string;
  roleId?: string;
  permission?: PermissionLevel;
}

/**
 * Role definition
 */
export interface Role {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: PermissionLevel[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User role assignment
 */
export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  tenantId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
}

/**
 * ACL invalidation event
 */
export interface ACLInvalidationEvent {
  tenantId: string;
  pattern?: string;
  userId?: string;
  shardId?: string;
  resourceType?: string;
}

/**
 * ACL cache statistics
 */
export interface ACLCacheStats {
  hits: number;
  misses: number;
  invalidations: number;
  keyCount: number;
  memoryUsageBytes?: number;
}

/**
 * ACL cache configuration
 */
export const ACL_CACHE_TTL_SECONDS = 10 * 60; // 10 minutes
export const ACL_INVALIDATION_CHANNEL = 'cache:invalidate:acl';

/**
 * Helper functions for ACL cache keys
 */
export const buildACLCacheKey = (
  tenantId: string,
  userId: string,
  shardId: string
): string => {
  return `tenant:${tenantId}:acl:${userId}:${shardId}`;
};

export const buildACLCachePattern = (
  tenantId: string,
  userId?: string,
  shardId?: string
): string => {
  if (userId && shardId) {
    return buildACLCacheKey(tenantId, userId, shardId);
  } else if (userId) {
    return `tenant:${tenantId}:acl:${userId}:*`;
  } else if (shardId) {
    return `tenant:${tenantId}:acl:*:${shardId}`;
  } else {
    return `tenant:${tenantId}:acl:*`;
  }
};

/**
 * Permission level hierarchy
 * Used for determining effective permissions
 */
export const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  [PermissionLevel.READ]: 1,
  [PermissionLevel.WRITE]: 2,
  [PermissionLevel.ADMIN]: 3,
};

/**
 * Check if a permission level includes another
 * e.g., ADMIN includes WRITE and READ
 */
export const hasPermissionLevel = (
  userPermission: PermissionLevel,
  requiredPermission: PermissionLevel
): boolean => {
  return PERMISSION_HIERARCHY[userPermission] >= PERMISSION_HIERARCHY[requiredPermission];
};

/**
 * ACL (Access Control List) Types
 *
 * Comprehensive type system for access control management with caching support.
 * Supports both user-level and role-level permissions with inheritance.
 */
import { PermissionLevel } from './shard.types.js';
/**
 * Helper function to check if permission level is sufficient
 */
export function hasPermissionLevel(userPermissions, requiredPermission) {
    // Permission hierarchy: ADMIN > DELETE > WRITE > READ
    const hierarchy = {
        [PermissionLevel.READ]: 1,
        [PermissionLevel.WRITE]: 2,
        [PermissionLevel.DELETE]: 3,
        [PermissionLevel.ADMIN]: 4,
    };
    const requiredLevel = hierarchy[requiredPermission];
    const maxUserLevel = Math.max(...userPermissions.map((p) => hierarchy[p] || 0));
    return maxUserLevel >= requiredLevel;
}
/**
 * Helper function to get effective permission (highest level)
 */
export function getEffectivePermission(permissions) {
    if (permissions.length === 0) {
        return null;
    }
    const hierarchy = {
        [PermissionLevel.READ]: 1,
        [PermissionLevel.WRITE]: 2,
        [PermissionLevel.DELETE]: 3,
        [PermissionLevel.ADMIN]: 4,
    };
    // Find highest permission level
    let maxLevel = 0;
    let effectivePermission = null;
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
export function mergePermissions(...permissionArrays) {
    const uniquePermissions = new Set();
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
export function buildACLCacheKey(tenantId, userId, shardId) {
    return `tenant:${tenantId}:acl:${userId}:${shardId}`;
}
/**
 * ACL cache pattern for bulk invalidation
 */
export function buildACLCachePattern(tenantId, userId, shardId) {
    if (userId && shardId) {
        return buildACLCacheKey(tenantId, userId, shardId);
    }
    else if (userId) {
        return `tenant:${tenantId}:acl:${userId}:*`;
    }
    else if (shardId) {
        return `tenant:${tenantId}:acl:*:${shardId}`;
    }
    else {
        return `tenant:${tenantId}:acl:*`;
    }
}
//# sourceMappingURL=acl.types.js.map
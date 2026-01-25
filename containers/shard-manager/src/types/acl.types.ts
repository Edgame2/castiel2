/**
 * ACL (Access Control List) Types
 * Access control management with caching support
 */

import { PermissionLevel, ACLEntry } from './shard.types';

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
 * Permission check context
 */
export interface PermissionCheckContext {
  userId: string;
  tenantId: string;
  shardId: string;
  requiredPermission: PermissionLevel;
  userRoles?: string[]; // Role IDs
  checkInheritance?: boolean;
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
 * ACL update request
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
 * ACL batch check request
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
  results: Record<string, ACLCheckResult>; // shardId -> result
  checkedAt: Date;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * ACL statistics
 */
export interface ACLStats {
  totalChecks: number;
  cacheHits: number;
  cacheMisses: number;
  averageCheckDuration: number;
  invalidations: number;
}

/**
 * Check if permission level includes required permission
 */
export function hasPermissionLevel(
  grantedPermissions: PermissionLevel[],
  requiredPermission: PermissionLevel
): boolean {
  if (grantedPermissions.includes(PermissionLevel.ADMIN)) {
    return true;
  }

  if (requiredPermission === PermissionLevel.READ) {
    return grantedPermissions.includes(PermissionLevel.READ);
  }

  if (requiredPermission === PermissionLevel.WRITE) {
    return (
      grantedPermissions.includes(PermissionLevel.WRITE) ||
      grantedPermissions.includes(PermissionLevel.ADMIN)
    );
  }

  if (requiredPermission === PermissionLevel.DELETE) {
    return (
      grantedPermissions.includes(PermissionLevel.DELETE) ||
      grantedPermissions.includes(PermissionLevel.ADMIN)
    );
  }

  if (requiredPermission === PermissionLevel.ADMIN) {
    return grantedPermissions.includes(PermissionLevel.ADMIN);
  }

  return false;
}

/**
 * Get effective permission from list
 */
export function getEffectivePermission(
  permissions: PermissionLevel[]
): PermissionLevel | null {
  if (permissions.length === 0) {
    return null;
  }

  if (permissions.includes(PermissionLevel.ADMIN)) {
    return PermissionLevel.ADMIN;
  }

  if (permissions.includes(PermissionLevel.DELETE)) {
    return PermissionLevel.DELETE;
  }

  if (permissions.includes(PermissionLevel.WRITE)) {
    return PermissionLevel.WRITE;
  }

  if (permissions.includes(PermissionLevel.READ)) {
    return PermissionLevel.READ;
  }

  return null;
}

/**
 * Merge permissions from multiple sources
 */
export function mergePermissions(
  ...permissionLists: PermissionLevel[][]
): PermissionLevel[] {
  const allPermissions = new Set<PermissionLevel>();

  for (const permissions of permissionLists) {
    for (const permission of permissions) {
      allPermissions.add(permission);
    }
  }

  return Array.from(allPermissions);
}

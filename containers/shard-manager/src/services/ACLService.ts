/**
 * ACL Service
 * Access control service with inheritance and role-based permissions
 */

import { ShardService } from './ShardService';
import {
  ACLCheckResult,
  PermissionCheckContext,
  GrantPermissionInput,
  RevokePermissionInput,
  UpdateACLInput,
  ACLBatchCheckRequest,
  ACLBatchCheckResult,
  ACLStats,
  hasPermissionLevel,
  getEffectivePermission,
  mergePermissions,
} from '../types/acl.types';
import { Shard, ACLEntry, PermissionLevel } from '../types/shard.types';
import { log } from '@coder/shared/utils/logger';
import { NotFoundError, BadRequestError } from '@coder/shared/utils/errors';

export class ACLService {
  private stats: ACLStats = {
    totalChecks: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageCheckDuration: 0,
    invalidations: 0,
  };

  constructor(private readonly shardService: ShardService) {}

  /**
   * Check if user has required permission on a shard
   */
  async checkPermission(context: PermissionCheckContext): Promise<ACLCheckResult> {
    const startTime = Date.now();
    this.stats.totalChecks++;

    try {
      // Fetch shard from database
      const shard = await this.shardService.findById(context.shardId, context.tenantId);

      if (!shard) {
        return {
          hasAccess: false,
          grantedPermissions: [],
          effectivePermission: null,
          reason: 'Shard not found',
          source: 'database',
          checkedAt: new Date(),
        };
      }

      // Check direct user permissions from ACL
      const userPermissions = this.getUserPermissionsFromACL(shard, context.userId);

      // TODO: Add role-based permissions when role system is implemented
      // const rolePermissions = await this.getRolePermissions(context.userId, context.userRoles);

      // Merge all permissions
      const allPermissions = userPermissions;

      // Check inheritance if enabled
      let inheritedPermissions: PermissionLevel[] = [];
      if (context.checkInheritance && shard.parentShardId) {
        inheritedPermissions = await this.getInheritedPermissions(
          context.userId,
          shard.parentShardId,
          context.tenantId,
          context.userRoles,
          0
        );
      }

      const finalPermissions = mergePermissions(allPermissions, inheritedPermissions);
      const effectivePermission = getEffectivePermission(finalPermissions);
      const hasAccess = hasPermissionLevel(finalPermissions, context.requiredPermission);

      const duration = Date.now() - startTime;
      this.stats.averageCheckDuration =
        (this.stats.averageCheckDuration * (this.stats.totalChecks - 1) + duration) /
        this.stats.totalChecks;

      return {
        hasAccess,
        grantedPermissions: finalPermissions,
        effectivePermission,
        source: inheritedPermissions.length > 0 ? 'inherited' : 'database',
        checkedAt: new Date(),
      };
    } catch (error: any) {
      log.error('Failed to check permission', error, {
        service: 'shard-manager',
        userId: context.userId,
        shardId: context.shardId,
      });

      // Fail-safe: deny access on error
      return {
        hasAccess: false,
        grantedPermissions: [],
        effectivePermission: null,
        reason: 'Error checking permissions',
        source: 'database',
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Extract user permissions from shard ACL
   */
  private getUserPermissionsFromACL(shard: Shard, userId: string): PermissionLevel[] {
    const userEntry = shard.acl?.find(
      (entry) => entry.userId === userId && !entry.roleId
    );

    return userEntry?.permissions || [];
  }

  /**
   * Get inherited permissions from parent shard
   */
  private async getInheritedPermissions(
    userId: string,
    parentShardId: string,
    tenantId: string,
    userRoles?: string[],
    depth = 0
  ): Promise<PermissionLevel[]> {
    // Prevent infinite recursion
    if (depth >= 5) {
      log.warn('ACL inheritance max depth reached', {
        service: 'shard-manager',
        userId,
        parentShardId,
        tenantId,
        depth,
      });
      return [];
    }

    try {
      const parentShard = await this.shardService.findById(parentShardId, tenantId);
      if (!parentShard) {
        return [];
      }

      const parentPermissions = this.getUserPermissionsFromACL(parentShard, userId);

      // Recursively check parent's parent
      if (parentShard.parentShardId) {
        const ancestorPermissions = await this.getInheritedPermissions(
          userId,
          parentShard.parentShardId,
          tenantId,
          userRoles,
          depth + 1
        );
        return mergePermissions(parentPermissions, ancestorPermissions);
      }

      return parentPermissions;
    } catch (error: any) {
      log.error('Failed to get inherited permissions', error, {
        service: 'shard-manager',
        userId,
        parentShardId,
        depth,
      });
      return [];
    }
  }

  /**
   * Batch check permissions for multiple shards
   */
  async batchCheckPermissions(request: ACLBatchCheckRequest): Promise<ACLBatchCheckResult> {
    const startTime = Date.now();
    const results: Record<string, ACLCheckResult> = {};
    let cacheHits = 0;
    let cacheMisses = 0;

    try {
      // Process all shards
      for (const shardId of request.shardIds) {
        const result = await this.checkPermission({
          userId: request.userId,
          tenantId: request.tenantId,
          shardId,
          requiredPermission: request.requiredPermission,
        });

        results[shardId] = result;
        if (result.source === 'cache') {
          cacheHits++;
        } else {
          cacheMisses++;
        }
      }

      log.info('Batch permission check completed', {
        service: 'shard-manager',
        userId: request.userId,
        count: request.shardIds.length,
        cacheHits,
        cacheMisses,
        duration: Date.now() - startTime,
      });

      return {
        userId: request.userId,
        tenantId: request.tenantId,
        results,
        checkedAt: new Date(),
        cacheHits,
        cacheMisses,
      };
    } catch (error: any) {
      log.error('Failed to batch check permissions', error, {
        service: 'shard-manager',
        userId: request.userId,
        count: request.shardIds.length,
      });

      return {
        userId: request.userId,
        tenantId: request.tenantId,
        results: {},
        checkedAt: new Date(),
        cacheHits: 0,
        cacheMisses: request.shardIds.length,
      };
    }
  }

  /**
   * Grant permissions to a user or role
   */
  async grantPermission(input: GrantPermissionInput, tenantId: string): Promise<void> {
    try {
      const shard = await this.shardService.findById(input.shardId, tenantId);

      if (!shard) {
        throw new NotFoundError('Shard', input.shardId);
      }

      // Initialize ACL if not exists
      if (!shard.acl) {
        shard.acl = [];
      }

      // Find existing ACL entry
      const existingEntryIndex = shard.acl.findIndex(
        (entry) =>
          (input.userId && entry.userId === input.userId) ||
          (input.roleId && entry.roleId === input.roleId)
      );

      const newEntry: ACLEntry = {
        ...(input.userId && { userId: input.userId }),
        ...(input.roleId && { roleId: input.roleId }),
        permissions: input.permissions,
        grantedBy: input.grantedBy,
        grantedAt: new Date(),
      };

      if (existingEntryIndex >= 0) {
        // Merge permissions with existing entry
        const existing = shard.acl[existingEntryIndex];
        const mergedPermissions = mergePermissions(existing.permissions, input.permissions);
        shard.acl[existingEntryIndex] = {
          ...existing,
          permissions: mergedPermissions,
          grantedBy: input.grantedBy,
          grantedAt: new Date(),
        };
      } else {
        // Add new ACL entry
        shard.acl.push(newEntry);
      }

      // Update shard
      await this.shardService.update(input.shardId, tenantId, {
        acl: shard.acl,
      });

      log.info('Permission granted', {
        service: 'shard-manager',
        shardId: input.shardId,
        userId: input.userId,
        roleId: input.roleId,
      });
    } catch (error: any) {
      log.error('Failed to grant permission', error, {
        service: 'shard-manager',
        shardId: input.shardId,
      });
      throw error;
    }
  }

  /**
   * Revoke permissions from a user or role
   */
  async revokePermission(input: RevokePermissionInput, tenantId: string): Promise<void> {
    try {
      const shard = await this.shardService.findById(input.shardId, tenantId);

      if (!shard) {
        throw new NotFoundError('Shard', input.shardId);
      }

      if (!shard.acl || shard.acl.length === 0) {
        return; // No ACL to revoke from
      }

      // Find ACL entry
      const entryIndex = shard.acl.findIndex(
        (entry) =>
          (input.userId && entry.userId === input.userId) ||
          (input.roleId && entry.roleId === input.roleId)
      );

      if (entryIndex === -1) {
        return; // Entry not found
      }

      const entry = shard.acl[entryIndex];

      if (input.permissions && input.permissions.length > 0) {
        // Remove specific permissions
        entry.permissions = entry.permissions.filter(
          (p) => !input.permissions!.includes(p)
        );

        // Remove entry if no permissions left
        if (entry.permissions.length === 0) {
          shard.acl.splice(entryIndex, 1);
        }
      } else {
        // Remove entire entry
        shard.acl.splice(entryIndex, 1);
      }

      // Update shard
      await this.shardService.update(input.shardId, tenantId, {
        acl: shard.acl,
      });

      log.info('Permission revoked', {
        service: 'shard-manager',
        shardId: input.shardId,
        userId: input.userId,
        roleId: input.roleId,
      });
    } catch (error: any) {
      log.error('Failed to revoke permission', error, {
        service: 'shard-manager',
        shardId: input.shardId,
      });
      throw error;
    }
  }

  /**
   * Update ACL entries for a shard
   */
  async updateACL(input: UpdateACLInput, tenantId: string): Promise<void> {
    try {
      const shard = await this.shardService.findById(input.shardId, tenantId);

      if (!shard) {
        throw new NotFoundError('Shard', input.shardId);
      }

      // Initialize ACL if not exists
      if (!shard.acl) {
        shard.acl = [];
      }

      // Remove entries
      if (input.removeEntries && input.removeEntries.length > 0) {
        for (const removeEntry of input.removeEntries) {
          const entryIndex = shard.acl.findIndex(
            (entry) =>
              (removeEntry.userId && entry.userId === removeEntry.userId) ||
              (removeEntry.roleId && entry.roleId === removeEntry.roleId)
          );

          if (entryIndex >= 0) {
            const entry = shard.acl[entryIndex];
            if (removeEntry.permissions && removeEntry.permissions.length > 0) {
              // Remove specific permissions
              entry.permissions = entry.permissions.filter(
                (p) => !removeEntry.permissions!.includes(p)
              );
              if (entry.permissions.length === 0) {
                shard.acl.splice(entryIndex, 1);
              }
            } else {
              // Remove entire entry
              shard.acl.splice(entryIndex, 1);
            }
          }
        }
      }

      // Add entries
      if (input.addEntries && input.addEntries.length > 0) {
        for (const addEntry of input.addEntries) {
          const entryIndex = shard.acl.findIndex(
            (entry) =>
              (addEntry.userId && entry.userId === addEntry.userId) ||
              (addEntry.roleId && entry.roleId === addEntry.roleId)
          );

          const newEntry: ACLEntry = {
            ...(addEntry.userId && { userId: addEntry.userId }),
            ...(addEntry.roleId && { roleId: addEntry.roleId }),
            permissions: addEntry.permissions,
            grantedBy: input.updatedBy,
            grantedAt: new Date(),
          };

          if (entryIndex >= 0) {
            // Merge with existing
            const existing = shard.acl[entryIndex];
            const mergedPermissions = mergePermissions(existing.permissions, addEntry.permissions);
            shard.acl[entryIndex] = {
              ...existing,
              permissions: mergedPermissions,
              grantedBy: input.updatedBy,
              grantedAt: new Date(),
            };
          } else {
            shard.acl.push(newEntry);
          }
        }
      }

      // Update shard
      await this.shardService.update(input.shardId, tenantId, {
        acl: shard.acl,
      });

      log.info('ACL updated', {
        service: 'shard-manager',
        shardId: input.shardId,
      });
    } catch (error: any) {
      log.error('Failed to update ACL', error, {
        service: 'shard-manager',
        shardId: input.shardId,
      });
      throw error;
    }
  }

  /**
   * Get all permissions for a user on a shard
   */
  async getUserPermissions(
    userId: string,
    shardId: string,
    tenantId: string
  ): Promise<PermissionLevel[]> {
    const result = await this.checkPermission({
      userId,
      tenantId,
      shardId,
      requiredPermission: PermissionLevel.READ,
      checkInheritance: true,
    });

    return result.grantedPermissions;
  }

  /**
   * Get ACL statistics
   */
  getStats(): ACLStats {
    return { ...this.stats };
  }

  /**
   * Invalidate cache (placeholder for future cache implementation)
   */
  invalidateCache(shardId: string, tenantId: string): void {
    this.stats.invalidations++;
    log.info('ACL cache invalidated', {
      service: 'shard-manager',
      shardId,
      tenantId,
    });
  }
}

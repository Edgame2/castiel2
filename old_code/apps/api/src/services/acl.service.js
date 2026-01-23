/**
 * ACL Service
 *
 * Comprehensive access control service with caching, inheritance, and role-based permissions.
 * Integrates with Shard repository to enforce permissions on all data operations.
 */
import { hasPermissionLevel, getEffectivePermission, mergePermissions, } from '../types/acl.types.js';
export class ACLService {
    shardRepository;
    aclCacheService;
    monitoring;
    stats = {
        totalChecks: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalDuration: 0,
        invalidations: 0,
    };
    constructor(shardRepository, aclCacheService, monitoring) {
        this.shardRepository = shardRepository;
        this.aclCacheService = aclCacheService;
        this.monitoring = monitoring;
    }
    /**
     * Check if user has required permission on a shard
     */
    async checkPermission(context) {
        const startTime = Date.now();
        this.stats.totalChecks++;
        try {
            // Try cache first
            if (this.aclCacheService) {
                const cached = await this.aclCacheService.getCachedPermissions(context.userId, context.shardId, context.tenantId);
                if (cached) {
                    this.stats.cacheHits++;
                    this.stats.totalDuration += Date.now() - startTime;
                    const hasAccess = hasPermissionLevel(cached.permissions, context.requiredPermission);
                    this.monitoring.trackMetric('acl-check', 1, {
                        source: 'cache',
                        hasAccess,
                        duration: Date.now() - startTime,
                    });
                    return {
                        hasAccess,
                        grantedPermissions: cached.permissions,
                        effectivePermission: cached.effectivePermission,
                        source: 'cache',
                        checkedAt: new Date(),
                    };
                }
                this.stats.cacheMisses++;
            }
            // Cache miss - fetch from database
            const result = await this.checkPermissionFromDatabase(context);
            // Cache the result if caching is enabled
            if (this.aclCacheService && result.source !== 'cache') {
                const cacheEntry = {
                    userId: context.userId,
                    shardId: context.shardId,
                    tenantId: context.tenantId,
                    permissions: result.grantedPermissions,
                    effectivePermission: result.effectivePermission,
                    source: result.source,
                    cachedAt: Date.now(),
                    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
                };
                await this.aclCacheService.cachePermissions(cacheEntry);
            }
            this.stats.totalDuration += Date.now() - startTime;
            this.monitoring.trackMetric('acl-check', 1, {
                source: result.source,
                hasAccess: result.hasAccess,
                duration: Date.now() - startTime,
            });
            return result;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-check-permission',
                userId: context.userId,
                shardId: context.shardId,
                requiredPermission: context.requiredPermission,
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
     * Check permission from database (cache miss)
     */
    async checkPermissionFromDatabase(context) {
        try {
            // Fetch shard from database
            const shard = await this.shardRepository.findById(context.shardId, context.tenantId);
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
            let inheritedPermissions = [];
            if (context.checkInheritance && shard.parentShardId) {
                inheritedPermissions = await this.getInheritedPermissions(context.userId, shard.parentShardId, context.tenantId, context.userRoles);
            }
            const finalPermissions = mergePermissions(allPermissions, inheritedPermissions);
            const effectivePermission = getEffectivePermission(finalPermissions);
            const hasAccess = hasPermissionLevel(finalPermissions, context.requiredPermission);
            return {
                hasAccess,
                grantedPermissions: finalPermissions,
                effectivePermission,
                source: inheritedPermissions.length > 0 ? 'inherited' : 'database',
                checkedAt: new Date(),
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-check-permission-database',
                userId: context.userId,
                shardId: context.shardId,
            });
            return {
                hasAccess: false,
                grantedPermissions: [],
                effectivePermission: null,
                reason: 'Database error',
                source: 'database',
                checkedAt: new Date(),
            };
        }
    }
    /**
     * Extract user permissions from shard ACL
     */
    getUserPermissionsFromACL(shard, userId) {
        const userEntry = shard.acl?.find((entry) => entry.userId === userId && !entry.roleId);
        return userEntry?.permissions || [];
    }
    /**
     * Get inherited permissions from parent shard
     */
    async getInheritedPermissions(userId, parentShardId, tenantId, userRoles, depth = 0) {
        // Prevent infinite recursion
        if (depth >= 5) {
            this.monitoring.trackEvent('acl-inheritance-max-depth-reached', {
                userId,
                parentShardId,
                tenantId,
            });
            return [];
        }
        try {
            const parentShard = await this.shardRepository.findById(parentShardId, tenantId);
            if (!parentShard) {
                return [];
            }
            const parentPermissions = this.getUserPermissionsFromACL(parentShard, userId);
            // Recursively check parent's parent
            if (parentShard.parentShardId) {
                const ancestorPermissions = await this.getInheritedPermissions(userId, parentShard.parentShardId, tenantId, userRoles, depth + 1);
                return mergePermissions(parentPermissions, ancestorPermissions);
            }
            return parentPermissions;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-get-inherited-permissions',
                userId,
                parentShardId,
                depth,
            });
            return [];
        }
    }
    /**
     * Batch check permissions for multiple shards (optimized)
     */
    async batchCheckPermissions(request) {
        const startTime = Date.now();
        const results = new Map();
        let cacheHits = 0;
        let cacheMisses = 0;
        try {
            // Try to get cached results first
            let cachedResults = new Map();
            if (this.aclCacheService) {
                cachedResults = await this.aclCacheService.batchGetCachedPermissions(request.userId, request.shardIds, request.tenantId);
                cacheHits = cachedResults.size;
            }
            // Process cached results
            for (const [shardId, cached] of cachedResults) {
                const hasAccess = hasPermissionLevel(cached.permissions, request.requiredPermission);
                results.set(shardId, {
                    hasAccess,
                    grantedPermissions: cached.permissions,
                    effectivePermission: cached.effectivePermission,
                    source: 'cache',
                    checkedAt: new Date(),
                });
            }
            // Find shards that need DB lookup
            const uncachedShardIds = request.shardIds.filter((id) => !cachedResults.has(id));
            cacheMisses = uncachedShardIds.length;
            // Fetch uncached shards from database
            for (const shardId of uncachedShardIds) {
                const result = await this.checkPermission({
                    userId: request.userId,
                    tenantId: request.tenantId,
                    shardId,
                    requiredPermission: request.requiredPermission,
                });
                results.set(shardId, result);
            }
            this.monitoring.trackMetric('acl-batch-check', 1, {
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
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-batch-check-permissions',
                userId: request.userId,
                count: request.shardIds.length,
            });
            // Return empty results on error
            return {
                userId: request.userId,
                tenantId: request.tenantId,
                results: new Map(),
                checkedAt: new Date(),
                cacheHits: 0,
                cacheMisses: request.shardIds.length,
            };
        }
    }
    /**
     * Grant permissions to a user or role
     */
    async grantPermission(input) {
        const startTime = Date.now();
        try {
            const shard = await this.shardRepository.findById(input.shardId, ''); // tenantId will be resolved
            if (!shard) {
                throw new Error('Shard not found');
            }
            // Initialize ACL if not exists
            if (!shard.acl) {
                shard.acl = [];
            }
            // Find existing ACL entry
            const existingEntryIndex = shard.acl.findIndex((entry) => (input.userId && entry.userId === input.userId) ||
                (input.roleId && entry.roleId === input.roleId));
            const newEntry = {
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
            }
            else {
                // Add new ACL entry
                shard.acl.push(newEntry);
            }
            // Update shard in database
            await this.shardRepository.update(input.shardId, shard.tenantId, {
                acl: shard.acl,
            });
            // Invalidate cache
            if (this.aclCacheService && input.userId) {
                await this.aclCacheService.invalidateCache(input.userId, input.shardId, shard.tenantId);
            }
            this.monitoring.trackMetric('acl-grant-permission', 1, {
                duration: Date.now() - startTime,
                permissionsCount: input.permissions.length,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-grant-permission',
                shardId: input.shardId,
                userId: input.userId,
                roleId: input.roleId,
            });
            throw error;
        }
    }
    /**
     * Revoke permissions from a user or role
     */
    async revokePermission(input) {
        const startTime = Date.now();
        try {
            const shard = await this.shardRepository.findById(input.shardId, ''); // tenantId will be resolved
            if (!shard || !shard.acl) {
                throw new Error('Shard not found or has no ACL');
            }
            // Find ACL entry to revoke
            const entryIndex = shard.acl.findIndex((entry) => (input.userId && entry.userId === input.userId) ||
                (input.roleId && entry.roleId === input.roleId));
            if (entryIndex < 0) {
                // Entry not found - nothing to revoke
                return;
            }
            if (!input.permissions || input.permissions.length === 0) {
                // Revoke all permissions - remove entry
                shard.acl.splice(entryIndex, 1);
            }
            else {
                // Revoke specific permissions
                const entry = shard.acl[entryIndex];
                const remainingPermissions = entry.permissions.filter((p) => !input.permissions.includes(p));
                if (remainingPermissions.length === 0) {
                    // No permissions left - remove entry
                    shard.acl.splice(entryIndex, 1);
                }
                else {
                    // Update entry with remaining permissions
                    shard.acl[entryIndex] = {
                        ...entry,
                        permissions: remainingPermissions,
                    };
                }
            }
            // Update shard in database
            await this.shardRepository.update(input.shardId, shard.tenantId, {
                acl: shard.acl,
            });
            // Invalidate cache
            if (this.aclCacheService && input.userId) {
                await this.aclCacheService.invalidateCache(input.userId, input.shardId, shard.tenantId);
            }
            this.monitoring.trackMetric('acl-revoke-permission', 1, {
                duration: Date.now() - startTime,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-revoke-permission',
                shardId: input.shardId,
                userId: input.userId,
                roleId: input.roleId,
            });
            throw error;
        }
    }
    /**
     * Update ACL entries for a shard (add/remove in one operation)
     */
    async updateACL(input) {
        const startTime = Date.now();
        try {
            const shard = await this.shardRepository.findById(input.shardId, ''); // tenantId will be resolved
            if (!shard) {
                throw new Error('Shard not found');
            }
            // Initialize ACL if not exists
            if (!shard.acl) {
                shard.acl = [];
            }
            // Process additions
            if (input.addEntries) {
                for (const entry of input.addEntries) {
                    const existingIndex = shard.acl.findIndex((e) => (entry.userId && e.userId === entry.userId) ||
                        (entry.roleId && e.roleId === entry.roleId));
                    if (existingIndex >= 0) {
                        // Merge with existing
                        const existing = shard.acl[existingIndex];
                        shard.acl[existingIndex] = {
                            ...existing,
                            permissions: mergePermissions(existing.permissions, entry.permissions),
                            grantedBy: input.updatedBy,
                            grantedAt: new Date(),
                        };
                    }
                    else {
                        // Add new entry
                        shard.acl.push({
                            ...(entry.userId && { userId: entry.userId }),
                            ...(entry.roleId && { roleId: entry.roleId }),
                            permissions: entry.permissions,
                            grantedBy: input.updatedBy,
                            grantedAt: new Date(),
                        });
                    }
                }
            }
            // Process removals
            if (input.removeEntries) {
                for (const entry of input.removeEntries) {
                    const existingIndex = shard.acl.findIndex((e) => (entry.userId && e.userId === entry.userId) ||
                        (entry.roleId && e.roleId === entry.roleId));
                    if (existingIndex >= 0) {
                        if (!entry.permissions || entry.permissions.length === 0) {
                            // Remove entire entry
                            shard.acl.splice(existingIndex, 1);
                        }
                        else {
                            // Remove specific permissions
                            const existing = shard.acl[existingIndex];
                            const remainingPermissions = existing.permissions.filter((p) => !entry.permissions.includes(p));
                            if (remainingPermissions.length === 0) {
                                shard.acl.splice(existingIndex, 1);
                            }
                            else {
                                shard.acl[existingIndex] = {
                                    ...existing,
                                    permissions: remainingPermissions,
                                };
                            }
                        }
                    }
                }
            }
            // Update shard in database
            await this.shardRepository.update(input.shardId, shard.tenantId, {
                acl: shard.acl,
            });
            // Invalidate entire shard cache (all users affected)
            if (this.aclCacheService) {
                await this.aclCacheService.invalidateShardCache(input.shardId, shard.tenantId);
            }
            this.stats.invalidations++;
            this.monitoring.trackMetric('acl-update', 1, {
                duration: Date.now() - startTime,
                addCount: input.addEntries?.length || 0,
                removeCount: input.removeEntries?.length || 0,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-update',
                shardId: input.shardId,
            });
            throw error;
        }
    }
    /**
     * Get all permissions for a user on a shard
     */
    async getUserPermissions(userId, shardId, tenantId) {
        const startTime = Date.now();
        try {
            const shard = await this.shardRepository.findById(shardId, tenantId);
            if (!shard) {
                return [];
            }
            const permissions = this.getUserPermissionsFromACL(shard, userId);
            this.monitoring.trackMetric('acl-get-user-permissions', 1, {
                duration: Date.now() - startTime,
                permissionsCount: permissions.length,
            });
            return permissions;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-get-user-permissions',
                userId,
                shardId,
            });
            return [];
        }
    }
    /**
     * Invalidate ACL cache for specific user/shard combination
     */
    async invalidateCache(userId, shardId, tenantId) {
        if (!this.aclCacheService) {
            return;
        }
        try {
            await this.aclCacheService.invalidateCache(userId, shardId, tenantId);
            this.stats.invalidations++;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-invalidate-cache',
                userId,
                shardId,
            });
        }
    }
    /**
     * Invalidate all ACL cache entries for a user
     */
    async invalidateUserCache(userId, tenantId) {
        if (!this.aclCacheService) {
            return;
        }
        try {
            await this.aclCacheService.invalidateUserCache(userId, tenantId);
            this.stats.invalidations++;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-invalidate-user-cache',
                userId,
            });
        }
    }
    /**
     * Invalidate all ACL cache entries for a shard
     */
    async invalidateShardCache(shardId, tenantId) {
        if (!this.aclCacheService) {
            return;
        }
        try {
            await this.aclCacheService.invalidateShardCache(shardId, tenantId);
            this.stats.invalidations++;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-invalidate-shard-cache',
                shardId,
            });
        }
    }
    /**
     * Get ACL statistics
     */
    getStats() {
        const avgDuration = this.stats.totalChecks > 0 ? this.stats.totalDuration / this.stats.totalChecks : 0;
        return {
            totalChecks: this.stats.totalChecks,
            cacheHits: this.stats.cacheHits,
            cacheMisses: this.stats.cacheMisses,
            averageCheckDuration: avgDuration,
            invalidations: this.stats.invalidations,
        };
    }
}
//# sourceMappingURL=acl.service.js.map
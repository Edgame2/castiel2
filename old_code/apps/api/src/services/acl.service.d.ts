/**
 * ACL Service
 *
 * Comprehensive access control service with caching, inheritance, and role-based permissions.
 * Integrates with Shard repository to enforce permissions on all data operations.
 */
import { IACLService, ACLCheckResult, PermissionCheckContext, ACLBatchCheckRequest, ACLBatchCheckResult, GrantPermissionInput, RevokePermissionInput, UpdateACLInput, ACLStats } from '../types/acl.types.js';
import { PermissionLevel } from '../types/shard.types.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ACLCacheService } from './acl-cache.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
export declare class ACLService implements IACLService {
    private readonly shardRepository;
    private readonly aclCacheService;
    private readonly monitoring;
    private stats;
    constructor(shardRepository: ShardRepository, aclCacheService: ACLCacheService | null, monitoring: IMonitoringProvider);
    /**
     * Check if user has required permission on a shard
     */
    checkPermission(context: PermissionCheckContext): Promise<ACLCheckResult>;
    /**
     * Check permission from database (cache miss)
     */
    private checkPermissionFromDatabase;
    /**
     * Extract user permissions from shard ACL
     */
    private getUserPermissionsFromACL;
    /**
     * Get inherited permissions from parent shard
     */
    private getInheritedPermissions;
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
//# sourceMappingURL=acl.service.d.ts.map
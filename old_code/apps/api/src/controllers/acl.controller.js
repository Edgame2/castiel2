/**
 * ACL Controller
 *
 * REST API endpoints for managing access control lists on shards.
 * Provides endpoints to grant, revoke, update, and query permissions.
 */
import { PermissionLevel } from '../types/shard.types.js';
import { UserRole } from '@castiel/shared-types';
// Utility: normalize role names and check super admin across aliases
const SUPER_ADMIN_ALIASES = new Set([
    'super_admin',
    'super-admin',
    'superadmin',
    'global_admin',
    'global-admin',
]);
function isSuperAdminRole(roles) {
    if (!roles || roles.length === 0) {
        return false;
    }
    return roles.some((r) => {
        if (!r) {
            return false;
        }
        const raw = String(r);
        const lower = raw.toLowerCase();
        const underscored = lower.replace(/-/g, '_');
        return (SUPER_ADMIN_ALIASES.has(raw) ||
            SUPER_ADMIN_ALIASES.has(lower) ||
            SUPER_ADMIN_ALIASES.has(underscored));
    });
}
export class ACLController {
    aclService;
    monitoring;
    constructor(aclService, monitoring) {
        this.aclService = aclService;
        this.monitoring = monitoring;
    }
    /**
     * Grant permissions to a user or role
     * POST /api/v1/acl/grant
     */
    async grantPermission(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardId, userId, roleId, permissions } = request.body;
            // Validate input
            if (!shardId) {
                return reply.code(400).send({ error: 'shardId is required' });
            }
            if (!userId && !roleId) {
                return reply.code(400).send({ error: 'Either userId or roleId must be provided' });
            }
            if (!permissions || permissions.length === 0) {
                return reply.code(400).send({ error: 'At least one permission must be provided' });
            }
            // Validate permissions
            const validPermissions = Object.values(PermissionLevel);
            for (const permission of permissions) {
                if (!validPermissions.includes(permission)) {
                    return reply.code(400).send({ error: `Invalid permission: ${permission}` });
                }
            }
            // Check if user has ADMIN permission on the shard
            const checkResult = await this.aclService.checkPermission({
                userId: authRequest.user.id,
                tenantId: authRequest.user.tenantId,
                shardId,
                requiredPermission: PermissionLevel.ADMIN,
            });
            if (!checkResult.hasAccess) {
                return reply.code(403).send({ error: 'Insufficient permissions to grant access' });
            }
            // Grant permissions
            const input = {
                shardId,
                userId,
                roleId,
                permissions: permissions,
                grantedBy: authRequest.user.id,
            };
            await this.aclService.grantPermission(input);
            this.monitoring.trackMetric('acl-grant-permission-request', 1, {
                duration: Date.now() - startTime,
                permissionsCount: permissions.length,
            });
            return reply.code(200).send({
                success: true,
                message: 'Permissions granted successfully',
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-grant-permission-controller',
                shardId: request.body.shardId,
            });
            return reply.code(500).send({ error: 'Failed to grant permissions' });
        }
    }
    /**
     * Revoke permissions from a user or role
     * POST /api/v1/acl/revoke
     */
    async revokePermission(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardId, userId, roleId, permissions } = request.body;
            // Validate input
            if (!shardId) {
                return reply.code(400).send({ error: 'shardId is required' });
            }
            if (!userId && !roleId) {
                return reply.code(400).send({ error: 'Either userId or roleId must be provided' });
            }
            // Validate permissions if provided
            if (permissions) {
                const validPermissions = Object.values(PermissionLevel);
                for (const permission of permissions) {
                    if (!validPermissions.includes(permission)) {
                        return reply.code(400).send({ error: `Invalid permission: ${permission}` });
                    }
                }
            }
            // Check if user has ADMIN permission on the shard
            const checkResult = await this.aclService.checkPermission({
                userId: authRequest.user.id,
                tenantId: authRequest.user.tenantId,
                shardId,
                requiredPermission: PermissionLevel.ADMIN,
            });
            if (!checkResult.hasAccess) {
                return reply.code(403).send({ error: 'Insufficient permissions to revoke access' });
            }
            // Revoke permissions
            const input = {
                shardId,
                userId,
                roleId,
                permissions: permissions,
                revokedBy: authRequest.user.id,
            };
            await this.aclService.revokePermission(input);
            this.monitoring.trackMetric('acl-revoke-permission-request', 1, {
                duration: Date.now() - startTime,
                permissionsCount: permissions?.length || 0,
            });
            return reply.code(200).send({
                success: true,
                message: 'Permissions revoked successfully',
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-revoke-permission-controller',
                shardId: request.body.shardId,
            });
            return reply.code(500).send({ error: 'Failed to revoke permissions' });
        }
    }
    /**
     * Update ACL for a shard (add and remove in one operation)
     * PUT /api/v1/acl/:shardId
     */
    async updateACL(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardId } = request.params;
            const { addEntries, removeEntries } = request.body;
            // Validate input
            if (!addEntries && !removeEntries) {
                return reply.code(400).send({
                    error: 'Either addEntries or removeEntries must be provided',
                });
            }
            // Validate permissions in entries
            const validPermissions = Object.values(PermissionLevel);
            if (addEntries) {
                for (const entry of addEntries) {
                    if (!entry.userId && !entry.roleId) {
                        return reply.code(400).send({
                            error: 'Each entry must have either userId or roleId',
                        });
                    }
                    for (const permission of entry.permissions) {
                        if (!validPermissions.includes(permission)) {
                            return reply.code(400).send({ error: `Invalid permission: ${permission}` });
                        }
                    }
                }
            }
            if (removeEntries) {
                for (const entry of removeEntries) {
                    if (!entry.userId && !entry.roleId) {
                        return reply.code(400).send({
                            error: 'Each entry must have either userId or roleId',
                        });
                    }
                    if (entry.permissions) {
                        for (const permission of entry.permissions) {
                            if (!validPermissions.includes(permission)) {
                                return reply.code(400).send({ error: `Invalid permission: ${permission}` });
                            }
                        }
                    }
                }
            }
            // Check if user has ADMIN permission on the shard
            const checkResult = await this.aclService.checkPermission({
                userId: authRequest.user.id,
                tenantId: authRequest.user.tenantId,
                shardId,
                requiredPermission: PermissionLevel.ADMIN,
            });
            if (!checkResult.hasAccess) {
                return reply.code(403).send({ error: 'Insufficient permissions to update ACL' });
            }
            // Update ACL
            const input = {
                shardId,
                addEntries: addEntries,
                removeEntries: removeEntries,
                updatedBy: authRequest.user.id,
            };
            await this.aclService.updateACL(input);
            this.monitoring.trackMetric('acl-update-request', 1, {
                duration: Date.now() - startTime,
                addCount: addEntries?.length || 0,
                removeCount: removeEntries?.length || 0,
            });
            return reply.code(200).send({
                success: true,
                message: 'ACL updated successfully',
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-update-controller',
                shardId: request.params.shardId,
            });
            return reply.code(500).send({ error: 'Failed to update ACL' });
        }
    }
    /**
     * Get user permissions for a shard
     * GET /api/v1/acl/:shardId/permissions
     */
    async getUserPermissions(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardId } = request.params;
            const { userId } = request.query;
            // Use authenticated user's ID if not specified
            const targetUserId = userId || authRequest.user.id;
            // Get permissions
            const permissions = await this.aclService.getUserPermissions(targetUserId, shardId, authRequest.user.tenantId);
            this.monitoring.trackMetric('acl-get-user-permissions-request', 1, {
                duration: Date.now() - startTime,
                permissionsCount: permissions.length,
            });
            return reply.code(200).send({
                userId: targetUserId,
                shardId,
                permissions,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-get-user-permissions-controller',
                shardId: request.params.shardId,
            });
            return reply.code(500).send({ error: 'Failed to get permissions' });
        }
    }
    /**
     * Check if user has permission on a shard
     * POST /api/v1/acl/check
     */
    async checkPermission(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardId, userId, requiredPermission } = request.body;
            // Validate input
            if (!shardId || !requiredPermission) {
                return reply.code(400).send({ error: 'shardId and requiredPermission are required' });
            }
            // Validate permission
            const validPermissions = Object.values(PermissionLevel);
            if (!validPermissions.includes(requiredPermission)) {
                return reply.code(400).send({ error: `Invalid permission: ${requiredPermission}` });
            }
            // Use authenticated user's ID if not specified
            const targetUserId = userId || authRequest.user.id;
            // Check permission
            const context = {
                userId: targetUserId,
                tenantId: authRequest.user.tenantId,
                shardId,
                requiredPermission: requiredPermission,
            };
            const result = await this.aclService.checkPermission(context);
            this.monitoring.trackMetric('acl-check-permission-request', 1, {
                duration: Date.now() - startTime,
                hasAccess: result.hasAccess,
                source: result.source,
            });
            return reply.code(200).send(result);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-check-permission-controller',
                shardId: request.body.shardId,
            });
            return reply.code(500).send({ error: 'Failed to check permission' });
        }
    }
    /**
     * Batch check permissions for multiple shards
     * POST /api/v1/acl/batch-check
     */
    async batchCheckPermissions(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardIds, userId, requiredPermission } = request.body;
            // Validate input
            if (!shardIds || shardIds.length === 0) {
                return reply.code(400).send({ error: 'shardIds array is required and must not be empty' });
            }
            if (!requiredPermission) {
                return reply.code(400).send({ error: 'requiredPermission is required' });
            }
            // Validate permission
            const validPermissions = Object.values(PermissionLevel);
            if (!validPermissions.includes(requiredPermission)) {
                return reply.code(400).send({ error: `Invalid permission: ${requiredPermission}` });
            }
            // Use authenticated user's ID if not specified
            const targetUserId = userId || authRequest.user.id;
            // Batch check permissions
            const batchRequest = {
                userId: targetUserId,
                tenantId: authRequest.user.tenantId,
                shardIds,
                requiredPermission: requiredPermission,
            };
            const result = await this.aclService.batchCheckPermissions(batchRequest);
            // Convert Map to object for JSON serialization
            const resultsObj = {};
            result.results.forEach((value, key) => {
                resultsObj[key] = value;
            });
            this.monitoring.trackMetric('acl-batch-check-permission-request', 1, {
                duration: Date.now() - startTime,
                count: shardIds.length,
                cacheHits: result.cacheHits,
                cacheMisses: result.cacheMisses,
            });
            return reply.code(200).send({
                userId: result.userId,
                tenantId: result.tenantId,
                results: resultsObj,
                checkedAt: result.checkedAt,
                cacheHits: result.cacheHits,
                cacheMisses: result.cacheMisses,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-batch-check-permission-controller',
                count: request.body.shardIds?.length || 0,
            });
            return reply.code(500).send({ error: 'Failed to batch check permissions' });
        }
    }
    /**
     * Get ACL statistics (admin only)
     * GET /api/v1/acl/stats
     */
    async getStats(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            // Check if user is admin (ADMIN or SUPER_ADMIN role required)
            const userRoles = authRequest.user.roles || [];
            const isAdmin = isSuperAdminRole(userRoles) || userRoles.includes(UserRole.ADMIN);
            if (!isAdmin) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Admin role required to access ACL statistics',
                });
            }
            const stats = this.aclService.getStats();
            this.monitoring.trackMetric('acl-get-stats-request', 1, {
                duration: Date.now() - startTime,
            });
            return reply.code(200).send(stats);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-get-stats-controller',
            });
            return reply.code(500).send({ error: 'Failed to get stats' });
        }
    }
    /**
     * Invalidate ACL cache for a shard (admin only)
     * POST /api/v1/acl/:shardId/invalidate-cache
     */
    async invalidateShardCache(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardId } = request.params;
            // Check if user has ADMIN permission on the shard
            const checkResult = await this.aclService.checkPermission({
                userId: authRequest.user.id,
                tenantId: authRequest.user.tenantId,
                shardId,
                requiredPermission: PermissionLevel.ADMIN,
            });
            if (!checkResult.hasAccess) {
                return reply.code(403).send({ error: 'Insufficient permissions to invalidate cache' });
            }
            // Invalidate cache
            await this.aclService.invalidateShardCache(shardId, authRequest.user.tenantId);
            this.monitoring.trackMetric('acl-invalidate-shard-cache-request', 1, {
                duration: Date.now() - startTime,
            });
            return reply.code(200).send({
                success: true,
                message: 'Shard ACL cache invalidated successfully',
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-invalidate-shard-cache-controller',
                shardId: request.params.shardId,
            });
            return reply.code(500).send({ error: 'Failed to invalidate cache' });
        }
    }
}
//# sourceMappingURL=acl.controller.js.map
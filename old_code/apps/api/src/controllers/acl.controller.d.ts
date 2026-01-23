/**
 * ACL Controller
 *
 * REST API endpoints for managing access control lists on shards.
 * Provides endpoints to grant, revoke, update, and query permissions.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { ACLService } from '../services/acl.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
export declare class ACLController {
    private readonly aclService;
    private readonly monitoring;
    constructor(aclService: ACLService, monitoring: IMonitoringProvider);
    /**
     * Grant permissions to a user or role
     * POST /api/v1/acl/grant
     */
    grantPermission(request: FastifyRequest<{
        Body: {
            shardId: string;
            userId?: string;
            roleId?: string;
            permissions: string[];
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Revoke permissions from a user or role
     * POST /api/v1/acl/revoke
     */
    revokePermission(request: FastifyRequest<{
        Body: {
            shardId: string;
            userId?: string;
            roleId?: string;
            permissions?: string[];
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Update ACL for a shard (add and remove in one operation)
     * PUT /api/v1/acl/:shardId
     */
    updateACL(request: FastifyRequest<{
        Params: {
            shardId: string;
        };
        Body: {
            addEntries?: Array<{
                userId?: string;
                roleId?: string;
                permissions: string[];
            }>;
            removeEntries?: Array<{
                userId?: string;
                roleId?: string;
                permissions?: string[];
            }>;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Get user permissions for a shard
     * GET /api/v1/acl/:shardId/permissions
     */
    getUserPermissions(request: FastifyRequest<{
        Params: {
            shardId: string;
        };
        Querystring: {
            userId?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Check if user has permission on a shard
     * POST /api/v1/acl/check
     */
    checkPermission(request: FastifyRequest<{
        Body: {
            shardId: string;
            userId?: string;
            requiredPermission: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Batch check permissions for multiple shards
     * POST /api/v1/acl/batch-check
     */
    batchCheckPermissions(request: FastifyRequest<{
        Body: {
            shardIds: string[];
            userId?: string;
            requiredPermission: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * Get ACL statistics (admin only)
     * GET /api/v1/acl/stats
     */
    getStats(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Invalidate ACL cache for a shard (admin only)
     * POST /api/v1/acl/:shardId/invalidate-cache
     */
    invalidateShardCache(request: FastifyRequest<{
        Params: {
            shardId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=acl.controller.d.ts.map
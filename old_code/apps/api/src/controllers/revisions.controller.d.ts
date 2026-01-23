/**
 * Revisions Controller
 *
 * REST API endpoints for managing shard revisions.
 * Provides revision history, comparison, and revert functionality.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { RevisionRepository } from '../repositories/revision.repository.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardCacheService } from '../services/shard-cache.service.js';
import { ACLService } from '../services/acl.service.js';
export declare class RevisionsController {
    private readonly revisionRepository;
    private readonly shardRepository;
    private readonly shardCacheService;
    private readonly aclService;
    private readonly monitoring;
    constructor(revisionRepository: RevisionRepository, shardRepository: ShardRepository, shardCacheService: ShardCacheService | null, aclService: ACLService, monitoring: IMonitoringProvider);
    /**
     * GET /api/v1/shards/:shardId/revisions
     * List all revisions for a shard
     */
    listRevisions(request: FastifyRequest<{
        Params: {
            shardId: string;
        };
        Querystring: {
            changeType?: string;
            changedBy?: string;
            fromDate?: string;
            toDate?: string;
            limit?: string;
            continuationToken?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/shards/:shardId/revisions/:revisionNumber
     * Get a specific revision by number
     */
    getRevision(request: FastifyRequest<{
        Params: {
            shardId: string;
            revisionNumber: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/shards/:shardId/revisions/latest
     * Get the latest revision for a shard
     */
    getLatestRevision(request: FastifyRequest<{
        Params: {
            shardId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/shards/:shardId/revisions/compare
     * Compare two revisions
     */
    compareRevisions(request: FastifyRequest<{
        Params: {
            shardId: string;
        };
        Body: {
            fromRevisionNumber: number;
            toRevisionNumber: number;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/shards/:shardId/revert/:revisionNumber
     * Revert shard to a specific revision
     */
    revertToRevision(request: FastifyRequest<{
        Params: {
            shardId: string;
            revisionNumber: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/shards/:shardId/revisions/stats
     * Get revision statistics for a shard
     */
    getRevisionStats(request: FastifyRequest<{
        Params: {
            shardId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=revisions.controller.d.ts.map
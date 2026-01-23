import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardCacheService } from '../services/shard-cache.service.js';
import { QueueService } from '../services/queue.service.js';
import { ShardEventService } from '../services/shard-event.service.js';
import type { RiskEvaluationService } from '../services/risk-evaluation.service.js';
/**
 * Shards Controller
 * Handles all REST API operations for Shards with caching
 * Cache: Only structuredData (15-30 min TTL)
 */
export declare class ShardsController {
    private repository;
    private revisionRepository;
    private monitoring;
    private eventService?;
    private lazyMigrationService?;
    private shardTypeRepository;
    private riskEvaluationService?;
    private serverInstance?;
    constructor(monitoring: IMonitoringProvider, cacheService: ShardCacheService, eventService?: ShardEventService, enableLazyMigration?: boolean, serviceBusService?: QueueService, redactionService?: any, // Phase 2: RedactionService
    auditTrailService?: any, // Phase 2: AuditTrailService
    riskEvaluationService?: RiskEvaluationService, // Optional - for automatic risk evaluation
    serverInstance?: any);
    /**
     * Emit event and queue for webhooks (non-blocking)
     */
    private emitEvent;
    /**
     * Get RiskEvaluationService (lazy retrieval from server if not already available)
     */
    private getRiskEvaluationService;
    /**
     * Queue risk evaluation for opportunity shards (non-blocking)
     */
    private queueRiskEvaluationIfOpportunity;
    /**
     * Initialize repositories
     */
    initialize(): Promise<void>;
    /**
     * Helper to send error responses using ShardError
     */
    private sendError;
    /**
     * Helper to handle errors consistently
     */
    private handleError;
    /**
     * Helper to check if user has required permission
     */
    private hasPermission;
    /**
     * POST /api/v1/shards
     * Create a new shard with automatic caching
     */
    createShard: (req: FastifyRequest<{
        Body: any;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/shards
     * List shards with filtering and pagination
     */
    listShards: (req: FastifyRequest<{
        Querystring: any;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/shards/:id
     * Get a single shard with cache-aside pattern
     */
    getShard: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * PUT /api/v1/shards/:id
     * Full update with cache invalidation and revision creation
     */
    updateShard: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: any;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * PATCH /api/v1/shards/:id
     * Partial update with cache invalidation
     */
    patchShard: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: any;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * DELETE /api/v1/shards/:id
     * Soft delete with cache invalidation
     */
    deleteShard: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: any;
    }>, reply: FastifyReply) => Promise<void>;
}
//# sourceMappingURL=shards.controller.d.ts.map
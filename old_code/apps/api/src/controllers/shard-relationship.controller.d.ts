import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRelationshipService } from '../services/shard-relationship.service.js';
import { ShardRepository } from '../repositories/shard.repository.js';
/**
 * Shard Relationship Controller
 * Handles relationship management and graph traversal endpoints
 */
export declare class ShardRelationshipController {
    private relationshipService;
    private monitoring;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository);
    /**
     * Initialize the controller
     */
    initialize(): Promise<void>;
    /**
     * POST /api/v1/relationships
     * Create a new relationship
     */
    createRelationship: (req: FastifyRequest<{
        Body: {
            sourceShardId: string;
            targetShardId: string;
            relationshipType: string;
            label?: string;
            weight?: number;
            bidirectional?: boolean;
            metadata?: Record<string, any>;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/relationships/:id
     * Get relationship by ID
     */
    getRelationship: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * PUT /api/v1/relationships/:id
     * Update a relationship
     */
    updateRelationship: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: {
            label?: string;
            weight?: number;
            metadata?: Record<string, any>;
            order?: number;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * DELETE /api/v1/relationships/:id
     * Delete a relationship
     */
    deleteRelationship: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: {
            deleteInverse?: boolean;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/shards/:shardId/relationships
     * Get all relationships for a shard
     */
    getShardRelationships: (req: FastifyRequest<{
        Params: {
            shardId: string;
        };
        Querystring: {
            direction?: "outgoing" | "incoming" | "both";
            relationshipType?: string;
            limit?: number;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/shards/:shardId/related
     * Get related shards (with shard data)
     */
    getRelatedShards: (req: FastifyRequest<{
        Params: {
            shardId: string;
        };
        Querystring: {
            direction?: "outgoing" | "incoming" | "both";
            relationshipType?: string;
            targetShardTypeId?: string;
            limit?: number;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/shards/:shardId/relationships/summary
     * Get relationship summary for a shard
     */
    getRelationshipSummary: (req: FastifyRequest<{
        Params: {
            shardId: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/shards/:shardId/graph
     * Traverse relationship graph
     */
    traverseGraph: (req: FastifyRequest<{
        Params: {
            shardId: string;
        };
        Body: {
            maxDepth?: number;
            direction?: "outgoing" | "incoming" | "both";
            relationshipTypes?: string[];
            excludeShardTypes?: string[];
            includeShardTypes?: string[];
            maxNodes?: number;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/relationships/path
     * Find path between two shards
     */
    findPath: (req: FastifyRequest<{
        Body: {
            sourceShardId: string;
            targetShardId: string;
            maxDepth?: number;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/relationships/bulk
     * Bulk create relationships
     */
    bulkCreateRelationships: (req: FastifyRequest<{
        Body: {
            edges: Array<{
                sourceShardId: string;
                targetShardId: string;
                relationshipType: string;
                label?: string;
                weight?: number;
                metadata?: Record<string, any>;
            }>;
            options?: {
                skipInverseCreation?: boolean;
                onError?: "continue" | "abort";
            };
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/relationships
     * Query relationships
     */
    queryRelationships: (req: FastifyRequest<{
        Querystring: {
            sourceShardId?: string;
            targetShardId?: string;
            sourceShardTypeId?: string;
            targetShardTypeId?: string;
            relationshipType?: string;
            limit?: number;
            continuationToken?: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * Get the relationship service for external use
     */
    getService(): ShardRelationshipService;
}
//# sourceMappingURL=shard-relationship.controller.d.ts.map
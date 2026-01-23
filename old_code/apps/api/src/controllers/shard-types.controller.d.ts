import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { EnrichmentService } from '../services/enrichment.service.js';
import type { ShardRepository } from '../repositories/shard.repository.js';
/**
 * ShardTypes Controller
 * Handles all REST API operations for ShardTypes
 * NO CACHING - ShardTypes don't change frequently
 */
export declare class ShardTypesController {
    private repository;
    private monitoring;
    private enrichmentService?;
    private shardRepository?;
    constructor(monitoring: IMonitoringProvider, enrichmentService?: EnrichmentService, shardRepository?: ShardRepository);
    /**
     * Initialize repository
     */
    initialize(): Promise<void>;
    /**
     * POST /api/v1/shard-types
     * Create a new shard type
     */
    createShardType: (req: FastifyRequest<{
        Body: any;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/shard-types
     * List shard types with filtering and pagination
     */
    listShardTypes: (req: FastifyRequest<{
        Querystring: any;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/shard-types/:id
     * Get a single shard type by ID
     */
    getShardType: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Querystring: any;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * PUT /api/v1/shard-types/:id
     * Update a shard type
     */
    updateShardType: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: any;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * DELETE /api/v1/shard-types/:id
     * Soft delete a shard type
     */
    deleteShardType: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/shard-types/:id/children
     * Get all child types of a parent
     */
    getChildTypes: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/shard-types/:id/usage
     * Get usage statistics for a shard type
     */
    getUsageStats: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/shard-types/validate-schema
     * Validate a JSON schema
     */
    validateSchemaEndpoint: (req: FastifyRequest<{
        Body: any;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/shard-types/:id/clone
     * Clone a ShardType with customizations
     */
    cloneShardType: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: any;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/shard-types/:id/relationships
     * Get ShardType with resolved relationships
     */
    getWithRelationships: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/shard-types/:id/enrich
     * Manually trigger enrichment for a ShardType
     * Note: This is a placeholder - actual enrichment logic would be implemented separately
     */
    triggerEnrichment: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: any;
    }>, reply: FastifyReply) => Promise<void>;
}
//# sourceMappingURL=shard-types.controller.d.ts.map
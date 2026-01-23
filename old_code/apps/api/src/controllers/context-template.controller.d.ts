import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ContextTemplateService } from '../services/context-template.service.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from '../services/shard-relationship.service.js';
import { Redis } from 'ioredis';
/**
 * Context Template Controller
 * Handles AI context assembly and template management
 */
export declare class ContextTemplateController {
    private templateService;
    private monitoring;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, relationshipService: ShardRelationshipService, redis?: Redis);
    /**
     * POST /api/v1/ai/context
     * Assemble context for a shard using a template
     */
    assembleContext: (req: FastifyRequest<{
        Body: {
            shardId: string;
            templateId?: string;
            assistantId?: string;
            debug?: boolean;
            maxTokensOverride?: number;
            skipCache?: boolean;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/ai/templates
     * List available context templates
     */
    listTemplates: (req: FastifyRequest<{
        Querystring: {
            category?: string;
            applicableShardType?: string;
            includeSystem?: boolean;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/ai/templates/:id
     * Get a specific template
     */
    getTemplate: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/ai/templates/system
     * Get system template definitions
     */
    getSystemTemplates: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/ai/templates/select
     * Select the appropriate template for a shard
     */
    selectTemplate: (req: FastifyRequest<{
        Body: {
            shardId?: string;
            shardTypeName?: string;
            preferredTemplateId?: string;
            assistantId?: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * DELETE /api/v1/ai/context/cache/:shardId
     * Invalidate cached context for a shard
     */
    invalidateCache: (req: FastifyRequest<{
        Params: {
            shardId: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * Get the template service for external use
     */
    getService(): ContextTemplateService;
}
//# sourceMappingURL=context-template.controller.d.ts.map
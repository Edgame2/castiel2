/**
 * Shard Bulk Operations Controller
 *
 * HTTP handlers for bulk shard operations
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ShardRepository } from '../repositories/shard.repository.js';
import { ShardEventService } from '../services/shard-event.service.js';
import { ShardStatus } from '../types/shard.types.js';
interface BulkCreateInput {
    shards: Array<{
        shardTypeId: string;
        structuredData: Record<string, any>;
        unstructuredData?: Record<string, any>;
        metadata?: Record<string, any>;
        parentShardId?: string;
    }>;
    options?: {
        skipValidation?: boolean;
        skipEnrichment?: boolean;
        skipEvents?: boolean;
        transactional?: boolean;
        onError?: 'continue' | 'abort';
    };
}
interface BulkUpdateInput {
    updates: Array<{
        id: string;
        structuredData?: Record<string, any>;
        unstructuredData?: Record<string, any>;
        metadata?: Record<string, any>;
        status?: ShardStatus;
    }>;
    options?: {
        skipValidation?: boolean;
        createRevision?: boolean;
        skipEvents?: boolean;
        onError?: 'continue' | 'abort';
    };
}
interface BulkDeleteInput {
    shardIds: string[];
    options?: {
        hardDelete?: boolean;
        skipEvents?: boolean;
        onError?: 'continue' | 'abort';
    };
}
interface BulkRestoreInput {
    shardIds: string[];
    options?: {
        skipEvents?: boolean;
    };
}
interface BulkStatusChangeInput {
    shardIds: string[];
    status: ShardStatus;
    options?: {
        skipEvents?: boolean;
        onError?: 'continue' | 'abort';
    };
}
interface BulkTagOperationInput {
    shardIds: string[];
    operation: 'add' | 'remove' | 'set';
    tags: string[];
    options?: {
        skipEvents?: boolean;
        onError?: 'continue' | 'abort';
    };
}
interface BulkExportInput {
    shardIds?: string[];
    shardTypeId?: string;
    status?: ShardStatus;
    limit?: number;
    format?: 'json' | 'csv';
    includeMetadata?: boolean;
    fields?: string[];
}
/**
 * Shard Bulk Controller
 */
export declare class ShardBulkController {
    private readonly repository;
    private readonly eventService?;
    constructor(repository: ShardRepository, eventService?: ShardEventService | undefined);
    /**
     * POST /api/v1/shards/bulk
     * Bulk create shards
     */
    bulkCreate: (req: FastifyRequest<{
        Body: BulkCreateInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * PATCH /api/v1/shards/bulk
     * Bulk update shards
     */
    bulkUpdate: (req: FastifyRequest<{
        Body: BulkUpdateInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * DELETE /api/v1/shards/bulk
     * Bulk delete shards
     */
    bulkDelete: (req: FastifyRequest<{
        Body: BulkDeleteInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/shards/bulk/restore
     * Bulk restore soft-deleted shards
     */
    bulkRestore: (req: FastifyRequest<{
        Body: BulkRestoreInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/shards/:id/restore
     * Restore a single soft-deleted shard
     */
    restoreShard: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/shards/bulk/status
     * Bulk change status of shards (archive, unarchive, etc.)
     */
    bulkStatusChange: (req: FastifyRequest<{
        Body: BulkStatusChangeInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/shards/bulk/tags
     * Bulk add, remove, or set tags on shards
     */
    bulkTagOperation: (req: FastifyRequest<{
        Body: BulkTagOperationInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/shards/bulk/export
     * Export shards to JSON or CSV format
     */
    bulkExport: (req: FastifyRequest<{
        Body: BulkExportInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * Convert array of objects to CSV string
     */
    private convertToCSV;
}
export {};
//# sourceMappingURL=shard-bulk.controller.d.ts.map
import { IMonitoringProvider } from '@castiel/monitoring';
import { Shard, CreateShardInput, UpdateShardInput, ShardListOptions, ShardListResult, ShardStatus, PermissionCheckResult } from '../types/shard.types.js';
import type { ShardCacheService } from '../services/shard-cache.service.js';
import type { QueueService } from '../services/queue.service.js';
/**
 * Shard Repository
 * Handles all Cosmos DB operations for Shards
 */
type RedactionService = import('../services/redaction.service.js').RedactionService;
type AuditTrailService = import('../services/audit-trail.service.js').AuditTrailService;
export declare class ShardRepository {
    private readonly serviceBusService?;
    private client;
    private container;
    private monitoring;
    private cacheService?;
    private redactionService?;
    private auditTrailService?;
    constructor(monitoring: IMonitoringProvider, cacheService?: ShardCacheService, serviceBusService?: QueueService | undefined, redactionService?: RedactionService, auditTrailService?: AuditTrailService);
    /**
     * Initialize container with proper indexing and vector search
     */
    ensureContainer(): Promise<void>;
    /**
     * Create a new shard
     */
    create(input: CreateShardInput): Promise<Shard>;
    /**
     * Find shard by ID
     * Uses cache-aside pattern: check cache first, then database
     */
    findById(id: string, tenantId: string): Promise<Shard | null>;
    /**
     * Update shard
     */
    update(id: string, tenantId: string, input: UpdateShardInput): Promise<Shard | null>;
    /**
     * Soft delete shard
     * Sets status to DELETED and optionally sets TTL for automatic cleanup
     */
    delete(id: string, tenantId: string, hardDelete?: boolean): Promise<boolean>;
    /**
     * Restore a soft-deleted shard
     */
    restore(id: string, tenantId: string): Promise<Shard | null>;
    /**
     * List shards with filtering and pagination
     */
    list(options: ShardListOptions): Promise<ShardListResult>;
    /**
     * Check user permissions for a shard
     */
    checkPermission(shardId: string, tenantId: string, userId: string): Promise<PermissionCheckResult>;
    /**
     * Count Shards by tenant and optional ShardType
     */
    count(tenantId: string, shardTypeId?: string): Promise<number>;
    /**
     * Update vectors for a shard
     * Used by embedding generation service
     */
    updateVectors(shardId: string, tenantId: string, vectors: Shard['vectors']): Promise<void>;
    /**
     * Find shards by shard type
     * Used for bulk re-embedding operations
     */
    findByShardType(shardTypeId: string, tenantId: string, options?: {
        limit?: number;
        offset?: number;
        statusFilter?: ShardStatus[];
    }): Promise<Shard[]>;
    /**
     * Check if container is healthy
     */
    healthCheck(): Promise<boolean>;
}
export {};
//# sourceMappingURL=shard.repository.d.ts.map
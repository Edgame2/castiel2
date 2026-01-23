import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardEdge, CreateEdgeInput, UpdateEdgeInput, EdgeQueryOptions, EdgeQueryResult, RelationshipSummary } from '../types/shard-edge.types.js';
/**
 * Shard Edge Repository
 * Handles Cosmos DB operations for shard relationships
 */
export declare class ShardEdgeRepository {
    private client;
    private container;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Initialize container
     */
    ensureContainer(): Promise<void>;
    /**
     * Create an edge
     */
    create(input: CreateEdgeInput): Promise<ShardEdge>;
    /**
     * Find edge by ID
     */
    findById(id: string, tenantId: string): Promise<ShardEdge | undefined>;
    /**
     * Find edge between two shards
     */
    findBetween(tenantId: string, sourceShardId: string, targetShardId: string, relationshipType?: string): Promise<ShardEdge | undefined>;
    /**
     * Get outgoing edges from a shard
     */
    getOutgoing(tenantId: string, sourceShardId: string, options?: {
        relationshipType?: string;
        targetShardTypeId?: string;
        limit?: number;
        orderBy?: 'createdAt' | 'weight' | 'order';
    }): Promise<ShardEdge[]>;
    /**
     * Get incoming edges to a shard
     */
    getIncoming(tenantId: string, targetShardId: string, options?: {
        relationshipType?: string;
        sourceShardTypeId?: string;
        limit?: number;
        orderBy?: 'createdAt' | 'weight' | 'order';
    }): Promise<ShardEdge[]>;
    /**
     * Query edges with filters
     */
    query(options: EdgeQueryOptions): Promise<EdgeQueryResult>;
    /**
     * Update an edge
     */
    update(id: string, tenantId: string, input: UpdateEdgeInput): Promise<ShardEdge | null>;
    /**
     * Delete an edge
     */
    delete(id: string, tenantId: string, deleteInverse?: boolean): Promise<boolean>;
    /**
     * Delete all edges for a shard (when shard is deleted)
     */
    deleteAllForShard(tenantId: string, shardId: string): Promise<number>;
    /**
     * Get relationship summary for a shard
     */
    getRelationshipSummary(tenantId: string, shardId: string): Promise<RelationshipSummary>;
    /**
     * Check if edge exists
     */
    exists(tenantId: string, sourceShardId: string, targetShardId: string, relationshipType?: string): Promise<boolean>;
    /**
     * Count edges for a shard
     */
    countForShard(tenantId: string, shardId: string, direction?: 'outgoing' | 'incoming' | 'both'): Promise<number>;
}
//# sourceMappingURL=shard-edge.repository.d.ts.map
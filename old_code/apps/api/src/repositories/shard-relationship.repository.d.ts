/**
 * Shard Relationship Repository
 *
 * Handles Cosmos DB operations for shard relationships (knowledge graph edges)
 */
import type { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRelationship, CreateRelationshipInput, UpdateRelationshipInput, RelationshipQueryFilter, RelationshipDirection, GraphTraversalOptions, GraphTraversalResult, RelatedShardsResult } from '../types/shard-relationship.types.js';
import type { ShardRepository } from './shard.repository.js';
/**
 * Shard Relationship Repository
 */
export declare class ShardRelationshipRepository {
    private readonly monitoring;
    private readonly shardRepository?;
    private client;
    private container;
    constructor(monitoring: IMonitoringProvider, shardRepository?: ShardRepository | undefined);
    /**
     * Ensure container exists
     */
    ensureContainer(): Promise<void>;
    /**
     * Create a new relationship
     */
    create(tenantId: string, userId: string, input: CreateRelationshipInput): Promise<ShardRelationship>;
    /**
     * Find relationship by ID
     */
    findById(id: string, tenantId: string): Promise<ShardRelationship | null>;
    /**
     * Find relationship by source/target pair
     */
    findByPair(tenantId: string, sourceShardId: string, targetShardId: string, type?: string): Promise<ShardRelationship | null>;
    /**
     * Get relationships for a shard
     */
    getRelationshipsForShard(filter: RelationshipQueryFilter): Promise<ShardRelationship[]>;
    /**
     * Get related shards with shard data
     */
    getRelatedShards(tenantId: string, shardId: string, options?: {
        direction?: RelationshipDirection;
        types?: string[];
        limit?: number;
    }): Promise<RelatedShardsResult>;
    /**
     * Traverse the graph from a starting shard
     */
    traverseGraph(tenantId: string, options: GraphTraversalOptions): Promise<GraphTraversalResult>;
    /**
     * Update a relationship
     */
    update(id: string, tenantId: string, input: UpdateRelationshipInput): Promise<ShardRelationship | null>;
    /**
     * Delete a relationship
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * Delete all relationships for a shard (when shard is deleted)
     */
    deleteAllForShard(tenantId: string, shardId: string): Promise<number>;
    /**
     * Count relationships for a shard
     */
    countForShard(tenantId: string, shardId: string): Promise<number>;
}
//# sourceMappingURL=shard-relationship.repository.d.ts.map
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardEdgeRepository } from '../repositories/shard-edge.repository.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardEdge, CreateEdgeInput, UpdateEdgeInput, EdgeQueryOptions, EdgeQueryResult, RelationshipSummary, GraphData, GraphTraversalOptions, BulkEdgeInput, BulkEdgeResult } from '../types/shard-edge.types.js';
import { Shard } from '../types/shard.types.js';
/**
 * Shard Relationship Service
 * Handles relationship management and graph traversal
 */
export declare class ShardRelationshipService {
    private edgeRepository;
    private shardRepository;
    private monitoring;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository);
    /**
     * Initialize the service
     */
    initialize(): Promise<void>;
    /**
     * Create a relationship between two shards
     */
    createRelationship(input: CreateEdgeInput): Promise<ShardEdge>;
    /**
     * Update a relationship
     */
    updateRelationship(edgeId: string, tenantId: string, input: UpdateEdgeInput): Promise<ShardEdge | null>;
    /**
     * Delete a relationship
     */
    deleteRelationship(edgeId: string, tenantId: string, deleteInverse?: boolean): Promise<boolean>;
    /**
     * Delete relationship by source, target, and type
     */
    deleteRelationshipBetween(tenantId: string, sourceShardId: string, targetShardId: string, relationshipType?: string): Promise<boolean>;
    /**
     * Get all relationships for a shard
     */
    getRelationships(tenantId: string, shardId: string, direction?: 'outgoing' | 'incoming' | 'both', options?: {
        relationshipType?: string;
        limit?: number;
    }): Promise<ShardEdge[]>;
    /**
     * Get related shards (with shard data)
     */
    getRelatedShards(tenantId: string, shardId: string, direction?: 'outgoing' | 'incoming' | 'both', options?: {
        relationshipType?: string;
        targetShardTypeId?: string;
        limit?: number;
    }): Promise<Array<{
        edge: ShardEdge;
        shard: Shard;
    }>>;
    /**
     * Get relationship summary for a shard
     */
    getRelationshipSummary(tenantId: string, shardId: string): Promise<RelationshipSummary>;
    /**
     * Traverse relationship graph from a root shard
     */
    traverseGraph(options: GraphTraversalOptions): Promise<GraphData>;
    /**
     * Find path between two shards
     */
    findPath(tenantId: string, sourceShardId: string, targetShardId: string, maxDepth?: number): Promise<{
        found: boolean;
        path: ShardEdge[];
        depth: number;
    }>;
    /**
     * Bulk create relationships
     */
    bulkCreateRelationships(tenantId: string, input: BulkEdgeInput): Promise<BulkEdgeResult>;
    /**
     * Query edges
     */
    queryEdges(options: EdgeQueryOptions): Promise<EdgeQueryResult>;
    /**
     * Get edge by ID
     */
    getEdge(edgeId: string, tenantId: string): Promise<ShardEdge | undefined>;
    /**
     * Check if relationship exists
     */
    relationshipExists(tenantId: string, sourceShardId: string, targetShardId: string, relationshipType?: string): Promise<boolean>;
    /**
     * Delete all relationships when shard is deleted
     */
    onShardDeleted(tenantId: string, shardId: string): Promise<number>;
    /**
     * Get repository for direct access
     */
    getRepository(): ShardEdgeRepository;
}
//# sourceMappingURL=shard-relationship.service.d.ts.map
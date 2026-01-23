import { IMonitoringProvider } from '@castiel/monitoring';
import { Revision, CreateRevisionInput, RevisionListOptions, RevisionListResult, RevisionComparison, RevisionStats, RevisionRetentionPolicy } from '../types/revision.types.js';
/**
 * Revision Repository
 * Handles all Cosmos DB operations for Revisions
 * NO CACHING - Always fetch fresh from DB for data integrity
 */
export declare class RevisionRepository {
    private client;
    private container;
    private monitoring;
    private retentionPolicy;
    private compressionThreshold;
    constructor(monitoring: IMonitoringProvider, retentionPolicy?: RevisionRetentionPolicy, compressionThreshold?: number);
    /**
     * Initialize container with proper indexing and TTL
     */
    ensureContainer(): Promise<void>;
    /**
     * Compress data if it exceeds threshold
     */
    private compressData;
    /**
     * Decompress data if it was compressed
     */
    private decompressData;
    /**
     * Create a new revision
     */
    create(input: CreateRevisionInput): Promise<Revision>;
    /**
     * Find revision by ID
     */
    findById(id: string, tenantId: string): Promise<Revision | null>;
    /**
     * Find revision by shard ID and revision number
     */
    findByRevisionNumber(shardId: string, tenantId: string, revisionNumber: number): Promise<Revision | null>;
    /**
     * Get the next revision number for a shard
  
        if (error.code === 404) {
          this.monitoring.trackDependency(
            'cosmosdb.revision.findById',
            'CosmosDB',
            config.cosmosDb.endpoint,
            duration,
            true
          );
          return null;
        }
  
        this.monitoring.trackDependency(
          'cosmosdb.revision.findById',
          'CosmosDB',
          config.cosmosDb.endpoint,
          duration,
          false
        );
  
        this.monitoring.trackException(error as Error, {
          operation: 'revision.repository.findById',
          revisionId: id,
          tenantId,
        });
  
        throw error;
      }
    }
  
    /**
     * Get next revision number for a shard
     * Sequential per shard: 1, 2, 3, ...
     */
    getNextRevisionNumber(shardId: string, tenantId: string): Promise<number>;
    /**
     * Get latest revision for a shard
     */
    getLatestRevision(shardId: string, tenantId: string): Promise<Revision | null>;
    /**
     * List revisions with filtering and pagination
     */
    list(options: RevisionListOptions): Promise<RevisionListResult>;
    /**
     * Compare two revisions
     */
    compareRevisions(fromRevisionId: string, toRevisionId: string, tenantId: string): Promise<RevisionComparison | null>;
    /**
     * Simple diff algorithm
     * Can be replaced with a more sophisticated library like jsondiffpatch
     */
    private computeDiff;
    /**
     * Get revision statistics for a shard
     */
    getStats(shardId: string, tenantId: string): Promise<RevisionStats | null>;
    /**
     * Delete old revisions based on retention policy
     * (Typically run as a scheduled job)
     */
    cleanupOldRevisions(tenantId: string): Promise<number>;
    /**
     * Check if container is healthy
     */
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=revision.repository.d.ts.map
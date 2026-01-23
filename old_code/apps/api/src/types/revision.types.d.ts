/**
 * Revision Types
 * For tracking changes to Shards with full snapshots or deltas
 */
/**
 * Type of change made in a revision
 */
export declare enum ChangeType {
    CREATED = "CREATED",
    UPDATED = "UPDATED",
    DELETED = "DELETED",
    RESTORED = "RESTORED",
    MERGED = "MERGED",
    ENRICHED = "ENRICHED",// AI enrichment applied
    VECTOR_UPDATED = "VECTOR_UPDATED"
}
/**
 * Strategy for storing revision data
 */
export declare enum RevisionStorageStrategy {
    FULL_SNAPSHOT = "FULL_SNAPSHOT",// Store complete shard data
    DELTA = "DELTA"
}
/**
 * Delta change for a single field
 */
export interface FieldDelta {
    field: string;
    oldValue?: any;
    newValue?: any;
    operation: 'add' | 'remove' | 'replace';
}
/**
 * Delta data containing field-level changes
 */
export interface DeltaData {
    changes: FieldDelta[];
    summary: string;
}
/**
 * Full snapshot or delta of shard data
 */
export interface RevisionData {
    strategy: RevisionStorageStrategy;
    snapshot?: any;
    delta?: DeltaData;
    compressed?: boolean;
    compressedSize?: number;
    originalSize?: number;
}
/**
 * Metadata about the revision
 */
export interface RevisionMetadata {
    changeDescription?: string;
    changeReason?: string;
    ipAddress?: string;
    userAgent?: string;
    tags?: string[];
    customFields?: Record<string, any>;
}
/**
 * Revision document
 * Tracks all changes to a shard with full history
 */
export interface Revision {
    id: string;
    shardId: string;
    tenantId: string;
    revisionNumber: number;
    data: RevisionData;
    changeType: ChangeType;
    changedBy: string;
    timestamp: Date;
    metadata?: RevisionMetadata;
    ttl?: number;
    createdAt: Date;
}
/**
 * Input for creating a new revision
 */
export interface CreateRevisionInput {
    shardId: string;
    tenantId: string;
    revisionNumber: number;
    data: RevisionData;
    changeType: ChangeType;
    changedBy: string;
    metadata?: RevisionMetadata;
    ttl?: number;
}
/**
 * Filter options for querying revisions
 */
export interface RevisionQueryFilter {
    tenantId: string;
    shardId?: string;
    changeType?: ChangeType;
    changedBy?: string;
    timestampAfter?: Date;
    timestampBefore?: Date;
    revisionNumberMin?: number;
    revisionNumberMax?: number;
}
/**
 * Options for listing revisions
 */
export interface RevisionListOptions {
    filter: RevisionQueryFilter;
    limit?: number;
    continuationToken?: string;
    orderBy?: 'revisionNumber' | 'timestamp';
    orderDirection?: 'asc' | 'desc';
}
/**
 * Result of listing revisions
 */
export interface RevisionListResult {
    revisions: Revision[];
    continuationToken?: string;
    count: number;
}
/**
 * Comparison between two revisions
 */
export interface RevisionComparison {
    fromRevision: Revision;
    toRevision: Revision;
    changes: FieldDelta[];
    summary: string;
}
/**
 * Retention policy for revisions
 */
export interface RevisionRetentionPolicy {
    enabled: boolean;
    retentionDays: number;
    maxRevisionsPerShard?: number;
    keepMilestones?: boolean;
}
/**
 * Statistics about revisions for a shard
 */
export interface RevisionStats {
    shardId: string;
    tenantId: string;
    totalRevisions: number;
    firstRevisionDate: Date;
    lastRevisionDate: Date;
    totalStorageSize: number;
    averageRevisionSize: number;
    changeTypeBreakdown: Record<ChangeType, number>;
}
/**
 * Default retention policy
 * Keep revisions for 90 days, with TTL auto-deletion
 */
export declare const DEFAULT_RETENTION_POLICY: RevisionRetentionPolicy;
/**
 * Milestone change types that should be kept forever
 */
export declare const MILESTONE_CHANGE_TYPES: ChangeType[];
/**
 * Check if a change type is a milestone
 */
export declare function isMilestoneChangeType(changeType: ChangeType): boolean;
/**
 * Calculate TTL for a revision based on retention policy
 * Returns TTL in seconds, or undefined for no TTL
 */
export declare function calculateRevisionTTL(changeType: ChangeType, policy: RevisionRetentionPolicy): number | undefined;
/**
 * Compression utilities
 */
export interface CompressionResult {
    compressed: Buffer;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
}
/**
 * Default compression threshold
 * Only compress revisions larger than 10KB
 */
export declare const DEFAULT_COMPRESSION_THRESHOLD_BYTES: number;
//# sourceMappingURL=revision.types.d.ts.map
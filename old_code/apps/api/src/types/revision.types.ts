/**
 * Revision Types
 * For tracking changes to Shards with full snapshots or deltas
 */

/**
 * Type of change made in a revision
 */
export enum ChangeType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  RESTORED = 'RESTORED',
  MERGED = 'MERGED',
  ENRICHED = 'ENRICHED', // AI enrichment applied
  VECTOR_UPDATED = 'VECTOR_UPDATED', // Vector embeddings updated
}

/**
 * Strategy for storing revision data
 */
export enum RevisionStorageStrategy {
  FULL_SNAPSHOT = 'FULL_SNAPSHOT', // Store complete shard data
  DELTA = 'DELTA', // Store only changes (diff)
}

/**
 * Delta change for a single field
 */
export interface FieldDelta {
  field: string; // JSON path to the field (e.g., "structuredData.title")
  oldValue?: any; // Previous value (null if field was added)
  newValue?: any; // New value (null if field was removed)
  operation: 'add' | 'remove' | 'replace';
}

/**
 * Delta data containing field-level changes
 */
export interface DeltaData {
  changes: FieldDelta[];
  summary: string; // Human-readable summary of changes
}

/**
 * Full snapshot or delta of shard data
 */
export interface RevisionData {
  strategy: RevisionStorageStrategy;
  snapshot?: any; // Full shard data (if FULL_SNAPSHOT)
  delta?: DeltaData; // Field-level changes (if DELTA)
  compressed?: boolean; // Whether data is compressed
  compressedSize?: number; // Size after compression (bytes)
  originalSize?: number; // Size before compression (bytes)
}

/**
 * Metadata about the revision
 */
export interface RevisionMetadata {
  changeDescription?: string; // User-provided description
  changeReason?: string; // Reason for the change
  ipAddress?: string; // IP address of the change
  userAgent?: string; // User agent string
  tags?: string[]; // Tags for categorization
  customFields?: Record<string, any>; // Extensible metadata
}

/**
 * Revision document
 * Tracks all changes to a shard with full history
 */
export interface Revision {
  id: string; // Unique revision ID
  shardId: string; // ID of the shard this revision belongs to
  tenantId: string; // Partition key - tenant isolation
  revisionNumber: number; // Sequential number per shard (1, 2, 3, ...)
  data: RevisionData; // Full snapshot or delta
  changeType: ChangeType; // Type of change
  changedBy: string; // User ID who made the change
  timestamp: Date; // When the change was made
  metadata?: RevisionMetadata; // Additional metadata
  ttl?: number; // Time-to-live in seconds (for auto-deletion)
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
  ttl?: number; // Optional TTL in seconds
}

/**
 * Filter options for querying revisions
 */
export interface RevisionQueryFilter {
  tenantId: string;
  shardId?: string; // Filter by specific shard
  changeType?: ChangeType; // Filter by change type
  changedBy?: string; // Filter by user
  timestampAfter?: Date; // Changes after this date
  timestampBefore?: Date; // Changes before this date
  revisionNumberMin?: number; // Minimum revision number
  revisionNumberMax?: number; // Maximum revision number
}

/**
 * Options for listing revisions
 */
export interface RevisionListOptions {
  filter: RevisionQueryFilter;
  limit?: number; // Max results per page (default: 50)
  continuationToken?: string; // For pagination
  orderBy?: 'revisionNumber' | 'timestamp'; // Order by field (default: revisionNumber)
  orderDirection?: 'asc' | 'desc'; // Order direction (default: desc)
}

/**
 * Result of listing revisions
 */
export interface RevisionListResult {
  revisions: Revision[];
  continuationToken?: string; // Token for next page
  count: number; // Number of results in this page
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
  retentionDays: number; // Number of days to keep revisions
  maxRevisionsPerShard?: number; // Max revisions per shard (optional)
  keepMilestones?: boolean; // Keep milestone revisions (CREATED, MERGED) forever
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
  totalStorageSize: number; // Total storage used (bytes)
  averageRevisionSize: number; // Average size per revision (bytes)
  changeTypeBreakdown: Record<ChangeType, number>; // Count by change type
}

/**
 * Default retention policy
 * Keep revisions for 90 days, with TTL auto-deletion
 */
export const DEFAULT_RETENTION_POLICY: RevisionRetentionPolicy = {
  enabled: true,
  retentionDays: 90,
  maxRevisionsPerShard: undefined, // No limit
  keepMilestones: true, // Keep CREATED, MERGED revisions forever
};

/**
 * Milestone change types that should be kept forever
 */
export const MILESTONE_CHANGE_TYPES: ChangeType[] = [
  ChangeType.CREATED,
  ChangeType.MERGED,
  ChangeType.RESTORED,
];

/**
 * Check if a change type is a milestone
 */
export function isMilestoneChangeType(changeType: ChangeType): boolean {
  return MILESTONE_CHANGE_TYPES.includes(changeType);
}

/**
 * Calculate TTL for a revision based on retention policy
 * Returns TTL in seconds, or undefined for no TTL
 */
export function calculateRevisionTTL(
  changeType: ChangeType,
  policy: RevisionRetentionPolicy
): number | undefined {
  if (!policy.enabled) {
    return undefined; // No TTL if retention disabled
  }

  // Keep milestone revisions forever
  if (policy.keepMilestones && isMilestoneChangeType(changeType)) {
    return undefined; // No TTL
  }

  // Convert retention days to seconds
  return policy.retentionDays * 24 * 60 * 60;
}

/**
 * Compression utilities
 */
export interface CompressionResult {
  compressed: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // compressedSize / originalSize
}

/**
 * Default compression threshold
 * Only compress revisions larger than 10KB
 */
export const DEFAULT_COMPRESSION_THRESHOLD_BYTES = 10 * 1024; // 10KB

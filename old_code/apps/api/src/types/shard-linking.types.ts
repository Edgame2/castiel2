/**
 * Shard Linking Types
 * Defines structures for enhanced shard linking with relationship types and batch operations
 */

export enum RelationshipType {
  /** Reference document or knowledge base */
  REFERENCE_DOCUMENT = 'REFERENCE_DOCUMENT',

  /** Blocking task that must be completed first */
  BLOCKING_TASK = 'BLOCKING_TASK',

  /** Blocked by another task */
  BLOCKED_BY = 'BLOCKED_BY',

  /** Related task with dependency */
  DEPENDS_ON = 'DEPENDS_ON',

  /** This task is depended on by another */
  DEPENDENCY_FOR = 'DEPENDENCY_FOR',

  /** Contains sub-tasks or related items */
  CONTAINS = 'CONTAINS',

  /** Related context or background information */
  RELATED_CONTEXT = 'RELATED_CONTEXT',

  /** Links to external resource or reference */
  EXTERNAL_LINK = 'EXTERNAL_LINK',

  /** Parent item for hierarchical relationships */
  PARENT_OF = 'PARENT_OF',

  /** Child item in hierarchy */
  CHILD_OF = 'CHILD_OF',

  /** Associated with (generic relationship) */
  ASSOCIATED_WITH = 'ASSOCIATED_WITH',

  /** Duplicates or conflicts with */
  CONFLICTS_WITH = 'CONFLICTS_WITH',

  /** Implementation detail or spec for */
  IMPLEMENTS = 'IMPLEMENTS',

  /** Risk or issue for this */
  RISK_FOR = 'RISK_FOR',

  /** Mitigation for risk */
  MITIGATES = 'MITIGATES',

  /** Evidence or support for claim */
  EVIDENCE_FOR = 'EVIDENCE_FOR',

  /** Impact analysis or outcome of */
  IMPACTS = 'IMPACTS',

  /** Custom user-defined relationship */
  CUSTOM = 'CUSTOM',
}

/**
 * Shard link representing connection between two shards
 * Stored in project-shard-links container
 */
export interface ShardLink {
  /** Unique link identifier */
  id: string;

  /** Tenant ID for isolation */
  tenantId: string;

  /** Project ID this link belongs to */
  projectId: string;

  /** Source shard ID */
  fromShardId: string;

  /** Source shard name (denormalized) */
  fromShardName?: string;

  /** Source shard type (denormalized) */
  fromShardType?: string;

  /** Target shard ID */
  toShardId: string;

  /** Target shard name (denormalized) */
  toShardName?: string;

  /** Target shard type (denormalized) */
  toShardType?: string;

  /** Relationship type between shards */
  relationshipType: RelationshipType;

  /** Custom relationship label (if type = CUSTOM) */
  customLabel?: string;

  /** Description of the relationship */
  description?: string;

  /** Strength of relationship (0-1, default 1.0) */
  strength: number;

  /** User who created the link */
  createdBy: string;

  /** When link was created */
  createdAt: Date;

  /** Link updated timestamp */
  updatedAt: Date;

  /** Last user to modify link */
  updatedBy: string;

  /** Is link active (soft delete support) */
  isActive: boolean;

  /** Whether link is bidirectional (both directions have same meaning) */
  isBidirectional: boolean;

  /** Priority/importance (1 = highest) for ordering */
  priority?: number;

  /** Whether AI recommendations led to this link */
  fromRecommendation?: boolean;

  /** Recommendation score if from recommendation */
  recommendationScore?: number;

  /** Tags for categorization */
  tags?: string[];

  /** Metadata for analytics and AI */
  metadata?: {
    /** How often this link is traversed/viewed */
    accessCount?: number;

    /** Last time link was accessed */
    lastAccessedAt?: Date;

    /** User feedback on link usefulness (0-5) */
    userRating?: number;

    /** Whether AI should suggest this link */
    aiSuggestable?: boolean;

    /** Context tokens needed for this link */
    contextTokens?: number;
  };

  /** TTL for automatic cleanup if needed */
  ttl?: number;

  /** Cosmos DB system properties */
  _ts?: number;
  _rid?: string;
  _self?: string;
  _etag?: string;
}

/**
 * Create link input DTO
 */
export interface CreateLinkInput {
  /** Source shard ID */
  fromShardId: string;

  /** Target shard ID */
  toShardId: string;

  /** Relationship type */
  relationshipType: RelationshipType;

  /** Custom label if type = CUSTOM */
  customLabel?: string;

  /** Description */
  description?: string;

  /** Link strength (0-1) */
  strength?: number;

  /** Is bidirectional */
  isBidirectional?: boolean;

  /** Priority */
  priority?: number;

  /** Tags */
  tags?: string[];
}

/**
 * Update link input DTO
 */
export interface UpdateLinkInput {
  /** Relationship type */
  relationshipType?: RelationshipType;

  /** Custom label */
  customLabel?: string;

  /** Description */
  description?: string;

  /** Strength */
  strength?: number;

  /** Priority */
  priority?: number;

  /** Tags */
  tags?: string[];

  /** Is bidirectional */
  isBidirectional?: boolean;
}

/**
 * Bulk linking operation input
 */
export interface BulkLinkInput {
  /** Project ID */
  projectId: string;

  /** Links to create */
  links: CreateLinkInput[];

  /** Whether to validate all shards exist before linking */
  validateShards?: boolean;

  /** Whether to create reverse links for bidirectional */
  autoCreateReverse?: boolean;
}

/**
 * Bulk linking result
 */
export interface BulkLinkResult {
  /** Number of links created */
  createdCount: number;

  /** Number of failures */
  failureCount: number;

  /** Created link IDs */
  linkIds: string[];

  /** Failed links with reasons */
  failures: Array<{
    index: number;
    fromShardId: string;
    toShardId: string;
    error: string;
  }>;

  /** Operation timestamp */
  timestamp: Date;
}

/**
 * Multi-project bulk link operation
 * Link shards across multiple projects
 */
export interface MultiProjectBulkLinkInput {
  /** Links to create (projectId included in each link) */
  links: Array<
    CreateLinkInput & {
      projectId: string;
    }
  >;

  /** Whether to create reverse links */
  autoCreateReverse?: boolean;
}

/**
 * Shard with its links (for detail view)
 */
export interface ShardWithLinks {
  /** Shard ID */
  shardId: string;

  /** Shard name */
  shardName: string;

  /** Shard type */
  shardType: string;

  /** Outgoing links (from this shard) */
  outgoingLinks: Array<{
    link: ShardLink;
    targetShard: {
      id: string;
      name: string;
      type: string;
    };
  }>;

  /** Incoming links (to this shard) */
  incomingLinks: Array<{
    link: ShardLink;
    sourceShard: {
      id: string;
      name: string;
      type: string;
    };
  }>;

  /** Total link count */
  linkCount: number;

  /** Related shards through various relationships */
  relatedShards: Array<{
    shardId: string;
    shardName: string;
    relationshipTypes: RelationshipType[];
    distance: number; // Hops from original shard
  }>;
}

/**
 * Link filtering options
 */
export interface LinkFilterOptions {
  /** Filter by relationship type(s) */
  relationshipTypes?: RelationshipType[];

  /** Filter by source shard */
  fromShardId?: string;

  /** Filter by target shard */
  toShardId?: string;

  /** Filter by strength range */
  strengthRange?: { min: number; max: number };

  /** Filter by tag */
  tags?: string[];

  /** Only bidirectional links */
  onlyBidirectional?: boolean;

  /** Only from recommendations */
  onlyFromRecommendations?: boolean;

  /** Search in description */
  searchText?: string;

  /** Date range */
  createdAfter?: Date;
  createdBefore?: Date;

  /** Created by user ID */
  createdBy?: string;
}

/**
 * Link query parameters with pagination
 */
export interface LinkQueryParams extends LinkFilterOptions {
  /** Page number */
  page?: number;

  /** Limit per page */
  limit?: number;

  /** Sort field */
  sortBy?: 'createdAt' | 'strength' | 'priority' | 'accessCount';

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Paginated link results
 */
export interface LinkPage {
  /** Link records */
  items: ShardLink[];

  /** Total count */
  totalCount: number;

  /** Current page */
  pageNumber: number;

  /** Total pages */
  totalPages: number;

  /** Page size */
  pageSize: number;

  /** Has more pages */
  hasMore: boolean;
}

/**
 * Link statistics
 */
export interface LinkStatistics {
  /** Total links in project */
  totalLinks: number;

  /** Links by relationship type */
  byRelationshipType: Record<RelationshipType, number>;

  /** Bidirectional vs unidirectional */
  bidirectionalCount: number;
  unidirectionalCount: number;

  /** Average link strength */
  averageStrength: number;

  /** Most linked shards */
  mostLinkedShards: Array<{
    shardId: string;
    shardName: string;
    linkCount: number;
    direction: 'in' | 'out' | 'both';
  }>;

  /** Average link creation time (days) */
  avgLinksPerDay?: number;

  /** Links from recommendations */
  recommendationLinksCount: number;

  /** Manual links */
  manualLinksCount: number;

  /** Link quality score (0-100) based on usage */
  qualityScore?: number;
}

/**
 * Link validation result
 */
export interface LinkValidationResult {
  /** Is valid */
  isValid: boolean;

  /** Validation errors */
  errors: Array<{
    field: string;
    message: string;
  }>;

  /** Warnings */
  warnings?: Array<{
    field: string;
    message: string;
  }>;

  /** Suggested relationship types if not specified */
  suggestedRelationshipTypes?: RelationshipType[];
}

/**
 * Link suggestion based on shards
 */
export interface LinkSuggestion {
  /** Source shard ID */
  fromShardId: string;

  /** Target shard ID */
  toShardId: string;

  /** Suggested relationship type */
  relationshipType: RelationshipType;

  /** Confidence score (0-1) */
  confidenceScore: number;

  /** Why this link is suggested */
  reason: string;

  /** Would this be bidirectional */
  suggestedBidirectional: boolean;

  /** Estimated strength */
  suggestedStrength: number;
}

/**
 * Link with context for AI operations
 */
export interface ShardLinkContext {
  /** Link ID */
  linkId: string;

  /** From shard full content/excerpt */
  fromShardContent: string;

  /** To shard full content/excerpt */
  toShardContent: string;

  /** Relationship type */
  relationshipType: RelationshipType;

  /** Link description */
  description?: string;

  /** Context length in tokens */
  contextTokens: number;

  /** Whether to include in AI context */
  includeInContext: boolean;

  /** Priority for inclusion (1 = highest) */
  priority: number;
}

/**
 * Batch operation audit for linking
 */
export interface LinkOperationAudit {
  /** Operation ID */
  operationId: string;

  /** Operation type: 'create' | 'update' | 'delete' | 'bulk' */
  operationType: string;

  /** Project ID(s) affected */
  projectIds: string[];

  /** Tenant ID */
  tenantId: string;

  /** Initiated by user */
  initiatedBy: string;

  /** Number of links affected */
  linkCount: number;

  /** Timestamp */
  timestamp: Date;

  /** Status: 'completed' | 'failed' | 'partial' */
  status: 'completed' | 'failed' | 'partial';

  /** Success/failure counts */
  successCount?: number;
  failureCount?: number;

  /** Operation details */
  details?: Record<string, any>;
}

/**
 * Link impact analysis
 */
export interface LinkImpactAnalysis {
  /** Shards affected by removing this link */
  affectedShards: string[];

  /** Dependent operations that would be affected */
  dependentOperations: Array<{
    type: string;
    id: string;
    description: string;
  }>;

  /** Risk level: 'low' | 'medium' | 'high' | 'critical' */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  /** Recommendations for removal */
  recommendations: string[];

  /** Alternative links that could replace this one */
  alternatives?: ShardLink[];
}

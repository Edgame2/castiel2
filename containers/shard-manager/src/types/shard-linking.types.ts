/**
 * Shard Linking Types
 * Enhanced shard linking with project-specific relationships
 */

export enum LinkRelationshipType {
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
  relationshipType: LinkRelationshipType;
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
  };
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
  relationshipType: LinkRelationshipType;
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
  relationshipType?: LinkRelationshipType;
  /** Custom label */
  customLabel?: string;
  /** Description */
  description?: string;
  /** Link strength */
  strength?: number;
  /** Is bidirectional */
  isBidirectional?: boolean;
  /** Priority */
  priority?: number;
  /** Tags */
  tags?: string[];
}

/**
 * Bulk link operation input
 */
export interface BulkLinkInput {
  /** Project ID */
  projectId: string;
  /** Links to create */
  links: CreateLinkInput[];
}

/**
 * Bulk link operation result
 */
export interface BulkLinkResult {
  /** Number of links created */
  createdCount: number;
  /** Number of failures */
  failureCount: number;
  /** IDs of created links */
  linkIds: string[];
  /** Failures with details */
  failures: Array<{
    index: number;
    fromShardId: string;
    toShardId: string;
    error: string;
  }>;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Link filter options
 */
export interface LinkFilterOptions {
  /** Filter by relationship type */
  relationshipType?: LinkRelationshipType;
  /** Filter by source shard ID */
  fromShardId?: string;
  /** Filter by target shard ID */
  toShardId?: string;
  /** Filter by tags */
  tags?: string[];
  /** Include inactive links */
  includeInactive?: boolean;
  /** Limit results */
  limit?: number;
}

/**
 * Link validation result
 */
export interface LinkValidationResult {
  /** Is link valid */
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
}

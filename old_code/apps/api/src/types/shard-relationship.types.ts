/**
 * Shard Relationship Types
 * 
 * Types for managing relationships between shards (knowledge graph)
 */

/**
 * Relationship type enum
 */
export enum RelationshipType {
  REFERENCES = 'references',       // A references B
  RELATED_TO = 'relatedTo',       // A is related to B
  PART_OF = 'partOf',             // A is part of B
  CONTAINS = 'contains',          // A contains B
  PRECEDES = 'precedes',          // A comes before B
  FOLLOWS = 'follows',            // A comes after B
  DERIVED_FROM = 'derivedFrom',   // A was derived from B
  SIMILAR_TO = 'similarTo',       // A is similar to B
  OPPOSITE_OF = 'oppositeOf',     // A is opposite of B
  DEPENDS_ON = 'dependsOn',       // A depends on B
  MENTIONS = 'mentions',          // A mentions B
  TAGS = 'tags',                  // A tags B
  LINKS_TO = 'linksTo',           // A links to B (generic)
  CUSTOM = 'custom',              // Custom relationship
}

/**
 * Relationship direction
 */
export enum RelationshipDirection {
  OUTGOING = 'outgoing',  // From source to target
  INCOMING = 'incoming',  // From target to source
  BOTH = 'both',          // Bidirectional
}

/**
 * Relationship strength/confidence
 */
export interface RelationshipStrength {
  value: number;          // 0-1 score
  source: 'manual' | 'ai' | 'import' | 'inferred';
  confidence?: number;    // AI confidence score
}

/**
 * Shard relationship document
 */
export interface ShardRelationship {
  id: string;
  tenantId: string;       // Partition key

  // Relationship endpoints
  sourceShardId: string;
  targetShardId: string;

  // Relationship type
  type: RelationshipType;
  customType?: string;    // For CUSTOM type

  // Directionality
  bidirectional: boolean;

  // Metadata
  label?: string;         // Human-readable label
  description?: string;
  strength?: RelationshipStrength;
  properties?: Record<string, any>;

  // Denormalized data for graph queries
  sourceShardTypeId?: string;
  targetShardTypeId?: string;

  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;

  // Cosmos DB system fields
  _etag?: string;
}

/**
 * Create relationship input
 */
export interface CreateRelationshipInput {
  sourceShardId: string;
  targetShardId: string;
  type: RelationshipType;
  customType?: string;
  bidirectional?: boolean;
  label?: string;
  description?: string;
  strength?: RelationshipStrength;
  properties?: Record<string, any>;
}

/**
 * Update relationship input
 */
export interface UpdateRelationshipInput {
  label?: string;
  description?: string;
  strength?: RelationshipStrength;
  properties?: Record<string, any>;
}

/**
 * Relationship query filters
 */
export interface RelationshipQueryFilter {
  tenantId: string;
  shardId?: string;       // Get relationships for a specific shard
  direction?: RelationshipDirection;
  types?: RelationshipType[];
  sourceShardTypeId?: string;
  targetShardTypeId?: string;
  minStrength?: number;
}

/**
 * Graph traversal options
 */
export interface GraphTraversalOptions {
  startShardId: string;
  direction: RelationshipDirection;
  maxDepth: number;
  relationshipTypes?: RelationshipType[];
  includeShardData?: boolean;
  limitPerLevel?: number;
}

/**
 * Graph node in traversal result
 */
export interface GraphNode {
  shardId: string;
  shardTypeId: string;
  structuredData?: Record<string, any>;
  depth: number;
}

/**
 * Graph edge in traversal result
 */
export interface GraphEdge {
  relationshipId: string;
  sourceShardId: string;
  targetShardId: string;
  type: RelationshipType;
  label?: string;
  strength?: number;
}

/**
 * Graph traversal result
 */
export interface GraphTraversalResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalNodes: number;
  totalEdges: number;
  truncated: boolean;
}

/**
 * Related shards query result
 */
export interface RelatedShardsResult {
  relationships: ShardRelationship[];
  shards: Array<{
    id: string;
    shardTypeId: string;
    structuredData: Record<string, any>;
    relationship: {
      id: string;
      type: RelationshipType;
      direction: 'incoming' | 'outgoing';
      strength?: number;
    };
  }>;
  total: number;
}

/**
 * Bulk relationship input
 */
export interface BulkRelationshipInput {
  relationships: CreateRelationshipInput[];
  options?: {
    skipExisting?: boolean;
    onError?: 'continue' | 'abort';
  };
}

/**
 * Bulk relationship result
 */
export interface BulkRelationshipResult {
  success: boolean;
  created: number;
  skipped: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

/**
 * Relationship suggestion from AI
 */
export interface RelationshipSuggestion {
  sourceShardId: string;
  targetShardId: string;
  type: RelationshipType;
  confidence: number;
  reasoning: string;
  bidirectional: boolean;
}


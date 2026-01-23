/**
 * Context Template Types
 * Types for c_contextTemplate ShardType
 */

// ============================================
// Template Scope
// ============================================

export type TemplateScope = 'system' | 'tenant' | 'user';

export type TemplateCategory =
  | 'summary'
  | 'analysis'
  | 'comparison'
  | 'extraction'
  | 'generation'
  | 'custom';

// ============================================
// Source Selection
// ============================================

export interface SourceSelection {
  // Primary source
  primary: {
    shardTypeId: string;
    fields: FieldSelection[];
    required: boolean;
  };

  // Related sources via relationships
  relationships: RelationshipSource[];

  // RAG retrieval
  rag?: RAGConfiguration;
}

export interface FieldSelection {
  fieldPath: string; // e.g., 'structuredData.status'
  alias?: string; // Rename in output
  required?: boolean;
  transform?: FieldTransform;
  // Backward compatibility properties
  include?: string[]; // Legacy whitelist (use fieldPath instead)
  exclude?: string[]; // Legacy blacklist
}

export interface FieldTransform {
  type: 'truncate' | 'summarize' | 'extract' | 'format';

  // For truncate
  maxLength?: number;

  // For summarize
  targetLength?: number;

  // For extract
  pattern?: string;

  // For format
  template?: string;
}

export interface RelationshipSource {
  // Which relationship to traverse
  relationshipType: string; // e.g., 'belongs_to', 'references'
  direction: 'outgoing' | 'incoming' | 'both';

  // Target shard types
  targetShardTypeIds?: string[]; // Filter by type

  // What to include
  fields: FieldSelection[];

  // Traversal limits
  depth?: number; // Max traversal depth
  limit?: number; // Max shards per relationship

  // Ordering
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };

  // Filtering
  filters?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
    value: unknown;
  }[];
}

// ============================================
// RAG Configuration
// ============================================

export interface RAGConfiguration {
  enabled: boolean;

  // Query strategy
  queryStrategy: 'user_query' | 'generated' | 'both';
  maxQueries?: number;

  // Chunk retrieval
  maxChunks: number;
  minScore: number;

  // Source filtering
  shardTypeIds?: string[]; // Limit to types
  excludeShardIds?: string[]; // Exclude specific

  // Recency
  preferRecent?: boolean;
  maxAge?: number; // Days

  // Diversity
  diversityPenalty?: number; // 0-1
}

// ============================================
// Token Limits
// ============================================

export interface TokenLimits {
  // Overall limit
  maxTotalTokens: number;

  // Per-section limits
  primaryTokens?: number;
  relatedTokens?: number;
  ragTokens?: number;

  // Priority when truncating
  truncationPriority: ('rag' | 'related' | 'primary')[];
}

// ============================================
// Output Configuration
// ============================================

export interface OutputConfiguration {
  format: 'structured' | 'narrative' | 'list' | 'table';

  // Ordering
  ordering?: {
    sections: string[]; // Section order
    withinSection?: {
      field: string;
      direction: 'asc' | 'desc';
    };
  };

  // Grouping
  groupBy?: string; // Group by field

  // Separators
  sectionSeparator?: string;
  itemSeparator?: string;

  // Headers
  includeHeaders?: boolean;
  headerTemplate?: string;
}

// ============================================
// Context Template Structured Data
// ============================================

export interface ContextTemplateStructuredData {
  // Identity
  name: string;
  description?: string;
  category: TemplateCategory;
  scope: TemplateScope;

  // Source selection
  sources: SourceSelection;

  // Token limits
  limits: TokenLimits;

  // Output
  output: OutputConfiguration;

  // Metadata
  isDefault: boolean;
  isActive: boolean;

  // Usage tracking
  usageCount?: number;
  lastUsedAt?: Date;

  // Tags
  tags?: string[];

  // Versioning
  version?: number;

  // Backward compatibility properties (for old template structure)
  // These are deprecated but kept for compatibility with existing code
  cacheTTLSeconds?: number;
  includeSelf?: boolean;
  fieldSelection?: Record<string, FieldSelection[]>;
  selfFields?: string[];
  relationships?: RelationshipSource[]; // Alias for sources.relationships
  rag?: RAGConfiguration; // Alias for sources.rag
  maxTokens?: number; // Alias for limits.maxTotalTokens
  format?: ContextFormat; // Alias for output.format
}

// ============================================
// Built-in Templates
// ============================================

export const SYSTEM_TEMPLATES = {
  // Project templates
  PROJECT_OVERVIEW: 'tpl_project_overview',
  PROJECT_RISKS: 'tpl_project_risks',
  PROJECT_ACTIVITY: 'tpl_project_activity',

  // Company templates
  COMPANY_PROFILE: 'tpl_company_profile',
  COMPANY_RELATIONSHIPS: 'tpl_company_relationships',

  // Document templates
  DOCUMENT_SUMMARY: 'tpl_document_summary',
  DOCUMENT_EXTRACT: 'tpl_document_extract',

  // General templates
  SHARD_SUMMARY: 'tpl_shard_summary',
  COMPARISON: 'tpl_comparison',
  TIMELINE: 'tpl_timeline',
} as const;

export type SystemTemplateId = typeof SYSTEM_TEMPLATES[keyof typeof SYSTEM_TEMPLATES];

// ============================================
// Template API Types
// ============================================

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: TemplateCategory;
  sources: SourceSelection;
  limits: TokenLimits;
  output?: OutputConfiguration;
  tags?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  sources?: Partial<SourceSelection>;
  limits?: Partial<TokenLimits>;
  output?: Partial<OutputConfiguration>;
  isActive?: boolean;
  tags?: string[];
}

export interface TemplateQueryOptions {
  category?: TemplateCategory;
  scope?: TemplateScope;
  search?: string;
  tags?: string[];
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================
// Template Selection Options
// ============================================

export interface TemplateSelectionOptions {
  /** User-specified template ID (takes highest precedence) */
  preferredTemplateId?: string;
  /** Assistant ID to find linked templates */
  assistantId?: string;
  /** Shard type name for template matching */
  shardTypeName?: string;
  /** Insight type for intent-based template selection */
  insightType?: string;
  /** Scope mode (global vs project) for template selection */
  scopeMode?: 'global' | 'project';
  /** Query text for LLM-based query understanding (optional, for future enhancement) */
  query?: string;
}

// ============================================
// Context Assembly Options
// ============================================

export interface ContextAssemblyOptions {
  /** Specific template ID to use */
  templateId?: string;
  /** Assistant ID for template selection */
  assistantId?: string;
  /** Skip cache lookup */
  skipCache?: boolean;
  /** Include debug information */
  debug?: boolean;
  /** Override max tokens from template */
  maxTokensOverride?: number;
  /** Query text for RAG retrieval */
  query?: string;
  /** User ID for ACL permission checks */
  userId?: string;
}

// ============================================
// Context Assembly Types
// ============================================

/** Alias for RelationshipSource (for backward compatibility) */
export type RelationshipConfig = RelationshipSource;

/** Alias for FieldSelection (for backward compatibility) */
export type FieldConfig = FieldSelection;

/** Format options for context output */
export type ContextFormat = 'structured' | 'narrative' | 'list' | 'table' | 'json' | 'minimal' | 'prose';

/** Metadata about context assembly */
export interface AssemblyMetadata {
  totalShards: number;
  tokenEstimate: number;
  truncated: boolean;
  cachedUntil?: Date;
  executionTimeMs?: number;
  /** RAG chunks count (for backward compatibility) */
  ragChunksCount?: number;
  /** RAG tokens count (for backward compatibility) */
  ragTokens?: number;
}

/** Debug information for context assembly */
export interface AssemblyDebugInfo {
  relationshipsTraversed: Record<string, {
    found: number;
    included: number;
    filtered: number;
  }>;
  fieldsSelected: Record<string, string[]>;
  tokenBreakdown: Record<string, number>;
  executionTimeMs: number;
}

/** Assembled context result */
export interface AssembledContext {
  templateId: string;
  templateName: string;
  self: Record<string, unknown> | null;
  related: Record<string, Array<Record<string, unknown>>>;
  metadata: AssemblyMetadata;
  formatted?: string;
}

/** Result of context assembly operation */
export interface ContextAssemblyResult {
  success: boolean;
  context: AssembledContext | null;
  error?: string;
  debug?: AssemblyDebugInfo;
}

// ============================================
// Template Resolution
// ============================================

export interface TemplateResolutionContext {
  shardTypeId: string;
  insightType: string;
  userPreference?: string;
  tenantId: string;
}

export interface ResolvedTemplate {
  template: ContextTemplateStructuredData;
  source: 'user' | 'tenant' | 'system';
  score: number;
}

// ============================================
// Template Execution
// ============================================

export interface TemplateExecutionResult {
  templateId: string;
  templateName: string;

  // Assembled data
  primary: {
    shardId: string;
    shardName: string;
    data: Record<string, unknown>;
    tokenCount: number;
  };

  related: {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    relationshipType: string;
    data: Record<string, unknown>;
    tokenCount: number;
  }[];

  rag: {
    shardId: string;
    shardName: string;
    content: string;
    score: number;
    tokenCount: number;
  }[];

  // Formatted output
  formattedContext: string;

  // Metrics
  metrics: {
    totalTokens: number;
    primaryTokens: number;
    relatedTokens: number;
    ragTokens: number;
    sourceCount: number;
    truncated: boolean;
  };

  // Timing
  executionTimeMs: number;
}

// ============================================
// Default Template Configurations
// ============================================

export const DEFAULT_TOKEN_LIMITS: TokenLimits = {
  maxTotalTokens: 8000,
  primaryTokens: 2000,
  relatedTokens: 3000,
  ragTokens: 3000,
  truncationPriority: ['rag', 'related', 'primary'],
};

export const DEFAULT_OUTPUT_CONFIG: OutputConfiguration = {
  format: 'structured',
  includeHeaders: true,
  sectionSeparator: '\n---\n',
  itemSeparator: '\n',
};

export const DEFAULT_RAG_CONFIG: RAGConfiguration = {
  enabled: true,
  queryStrategy: 'both',
  maxQueries: 3,
  maxChunks: 10,
  minScore: 0.7,
  preferRecent: true,
  maxAge: 365,
  diversityPenalty: 0.1,
};

/**
 * Context Template Types
 * Types for context template management
 */

export type TemplateScope = 'system' | 'tenant' | 'user';

export type TemplateCategory =
  | 'summary'
  | 'analysis'
  | 'comparison'
  | 'extraction'
  | 'generation'
  | 'custom';

export interface FieldSelection {
  fieldPath: string;
  alias?: string;
  required?: boolean;
  transform?: FieldTransform;
  include?: string[];
  exclude?: string[];
}

export interface FieldTransform {
  type: 'truncate' | 'summarize' | 'extract' | 'format';
  maxLength?: number;
  targetLength?: number;
  pattern?: string;
  template?: string;
}

export interface RelationshipSource {
  relationshipType: string;
  direction: 'outgoing' | 'incoming' | 'both';
  targetShardTypeIds?: string[];
  fields: FieldSelection[];
  depth?: number;
  limit?: number;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  filters?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
    value: unknown;
  }[];
}

export interface SourceSelection {
  primary: {
    shardTypeId: string;
    fields: FieldSelection[];
    required: boolean;
  };
  relationships: RelationshipSource[];
  rag?: RAGConfiguration;
}

export interface RAGConfiguration {
  enabled: boolean;
  queryStrategy: 'user_query' | 'generated' | 'both';
  maxQueries?: number;
  maxChunks: number;
  minScore: number;
  shardTypeIds?: string[];
  excludeShardIds?: string[];
  preferRecent?: boolean;
  maxAge?: number;
  diversityPenalty?: number;
}

export interface TokenLimits {
  maxTotalTokens: number;
  primaryTokens?: number;
  relatedTokens?: number;
  ragTokens?: number;
  truncationPriority: ('rag' | 'related' | 'primary')[];
}

export interface OutputConfiguration {
  format: 'structured' | 'narrative' | 'list' | 'table';
  ordering?: {
    sections: string[];
    withinSection?: {
      field: string;
      direction: 'asc' | 'desc';
    };
  };
  groupBy?: string;
  sectionSeparator?: string;
  itemSeparator?: string;
  includeHeaders?: boolean;
  headerTemplate?: string;
}

export interface ContextTemplateStructuredData {
  name: string;
  description?: string;
  category: TemplateCategory;
  scope: TemplateScope;
  sources: SourceSelection;
  limits: TokenLimits;
  output: OutputConfiguration;
  isDefault: boolean;
  isActive: boolean;
  usageCount?: number;
  lastUsedAt?: Date;
  tags?: string[];
  version?: number;
  // Backward compatibility
  cacheTTLSeconds?: number;
  includeSelf?: boolean;
  fieldSelection?: Record<string, FieldSelection[]>;
  selfFields?: string[];
  relationships?: RelationshipSource[];
  rag?: RAGConfiguration;
  maxTokens?: number;
  format?: string;
}

export interface TemplateSelectionOptions {
  preferredTemplateId?: string;
  assistantId?: string;
  shardTypeName?: string;
  insightType?: string;
  scopeMode?: 'global' | 'project';
  query?: string;
}

export interface ContextAssemblyOptions {
  templateId?: string;
  assistantId?: string;
  maxTokensOverride?: number;
  skipCache?: boolean;
  debug?: boolean;
  userId?: string;
  query?: string;
}

export interface ContextAssemblyResult {
  success: boolean;
  context?: any;
  error?: string;
  debug?: any;
}

export const SYSTEM_TEMPLATES = {
  PROJECT_OVERVIEW: 'tpl_project_overview',
  PROJECT_RISKS: 'tpl_project_risks',
  PROJECT_ACTIVITY: 'tpl_project_activity',
  COMPANY_PROFILE: 'tpl_company_profile',
  COMPANY_RELATIONSHIPS: 'tpl_company_relationships',
  DOCUMENT_SUMMARY: 'tpl_document_summary',
  DOCUMENT_EXTRACT: 'tpl_document_extract',
  SHARD_SUMMARY: 'tpl_shard_summary',
  COMPARISON: 'tpl_comparison',
  TIMELINE: 'tpl_timeline',
} as const;

export type SystemTemplateId = typeof SYSTEM_TEMPLATES[keyof typeof SYSTEM_TEMPLATES];

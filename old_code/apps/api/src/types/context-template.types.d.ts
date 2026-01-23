/**
 * Context Template Types
 * Types for c_contextTemplate ShardType
 */
export type TemplateScope = 'system' | 'tenant' | 'user';
export type TemplateCategory = 'summary' | 'analysis' | 'comparison' | 'extraction' | 'generation' | 'custom';
export interface SourceSelection {
    primary: {
        shardTypeId: string;
        fields: FieldSelection[];
        required: boolean;
    };
    relationships: RelationshipSource[];
    rag?: RAGConfiguration;
}
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
    cacheTTLSeconds?: number;
    includeSelf?: boolean;
    fieldSelection?: Record<string, FieldSelection[]>;
    selfFields?: string[];
    relationships?: RelationshipSource[];
    rag?: RAGConfiguration;
    maxTokens?: number;
    format?: ContextFormat;
}
export declare const SYSTEM_TEMPLATES: {
    readonly PROJECT_OVERVIEW: "tpl_project_overview";
    readonly PROJECT_RISKS: "tpl_project_risks";
    readonly PROJECT_ACTIVITY: "tpl_project_activity";
    readonly COMPANY_PROFILE: "tpl_company_profile";
    readonly COMPANY_RELATIONSHIPS: "tpl_company_relationships";
    readonly DOCUMENT_SUMMARY: "tpl_document_summary";
    readonly DOCUMENT_EXTRACT: "tpl_document_extract";
    readonly SHARD_SUMMARY: "tpl_shard_summary";
    readonly COMPARISON: "tpl_comparison";
    readonly TIMELINE: "tpl_timeline";
};
export type SystemTemplateId = typeof SYSTEM_TEMPLATES[keyof typeof SYSTEM_TEMPLATES];
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
}
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
export interface TemplateExecutionResult {
    templateId: string;
    templateName: string;
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
    formattedContext: string;
    metrics: {
        totalTokens: number;
        primaryTokens: number;
        relatedTokens: number;
        ragTokens: number;
        sourceCount: number;
        truncated: boolean;
    };
    executionTimeMs: number;
}
export declare const DEFAULT_TOKEN_LIMITS: TokenLimits;
export declare const DEFAULT_OUTPUT_CONFIG: OutputConfiguration;
export declare const DEFAULT_RAG_CONFIG: RAGConfiguration;
//# sourceMappingURL=context-template.types.d.ts.map
/**
 * Context Template Types
 * Types for c_contextTemplate ShardType
 */
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
};
// ============================================
// Default Template Configurations
// ============================================
export const DEFAULT_TOKEN_LIMITS = {
    maxTotalTokens: 8000,
    primaryTokens: 2000,
    relatedTokens: 3000,
    ragTokens: 3000,
    truncationPriority: ['rag', 'related', 'primary'],
};
export const DEFAULT_OUTPUT_CONFIG = {
    format: 'structured',
    includeHeaders: true,
    sectionSeparator: '\n---\n',
    itemSeparator: '\n',
};
export const DEFAULT_RAG_CONFIG = {
    enabled: true,
    queryStrategy: 'both',
    maxQueries: 3,
    maxChunks: 10,
    minScore: 0.7,
    preferRecent: true,
    maxAge: 365,
    diversityPenalty: 0.1,
};
//# sourceMappingURL=context-template.types.js.map
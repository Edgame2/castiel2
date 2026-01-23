/**
 * Project Template Types
 * Defines structures for project templates with industry-specific configurations
 * Supports super admin template management and user instantiation
 */
export declare enum TemplateCategory {
    SALES = "SALES",
    PRODUCT_LAUNCH = "PRODUCT_LAUNCH",
    MARKETING = "MARKETING",
    ENGINEERING = "ENGINEERING",
    OPERATIONS = "OPERATIONS",
    HR = "HR",
    FINANCE = "FINANCE",
    LEGAL = "LEGAL",
    CUSTOM = "CUSTOM"
}
/**
 * Pre-configured linked shard for template
 * Defines shards that should be linked when template is instantiated
 */
export interface TemplateLinkedShard {
    /** Display name for this shard link in template context */
    name: string;
    /** Shard query/filter (e.g., type, tags, search text) */
    shardQuery: {
        type?: string;
        tags?: string[];
        searchText?: string;
    };
    /** Suggested relationship type for this link */
    relationshipType: string;
    /** Priority order for linking (1 = highest) */
    priority: number;
    /** Optional description of why this shard should be linked */
    description?: string;
    /** Whether shard is required or optional */
    isRequired: boolean;
}
/**
 * Pre-configured AI chat question for template
 */
export interface TemplateAIChatQuestion {
    /** Question ID from ai-chat-catalog or custom text */
    questionId?: string;
    /** Custom question text (if not referencing catalog) */
    customQuestion?: string;
    /** Category for organization */
    category: string;
    /** Order in suggested questions list */
    order: number;
    /** Whether question should be suggested by default */
    isSuggested: boolean;
    /** Estimated context size for this question (in tokens) */
    estimatedContextSize?: number;
}
/**
 * Base project template stored in system
 * Managed by super admins, instantiated by users
 */
export interface ProjectTemplate {
    /** Unique template identifier */
    id: string;
    /** Tenant ID (system templates have tenantId = 'system') */
    tenantId: string;
    /** Template name (e.g., "Sales Deal Tracker") */
    name: string;
    /** Detailed description */
    description: string;
    /** Template category */
    category: TemplateCategory;
    /** Icon/image URL for gallery display */
    iconUrl?: string;
    /** Short overview (one-liner) */
    overview?: string;
    /** Long-form description for details view */
    detailedDescription?: string;
    /** Industry/use-case tags */
    tags: string[];
    /** Pre-configured linked shards */
    linkedShards: TemplateLinkedShard[];
    /** Pre-configured AI chat questions */
    aiChatQuestions: TemplateAIChatQuestion[];
    /** Default project configuration overrides */
    projectConfigDefaults?: {
        maxLinkedShards?: number;
        chatTokenLimit?: number;
        excludedShardTypes?: string[];
    };
    /** Template version for updates */
    version: number;
    /** Template created timestamp */
    createdAt: Date;
    /** Template last updated */
    updatedAt: Date;
    /** Creator user ID (super admin) */
    createdBy: string;
    /** Last updated by user ID */
    updatedBy: string;
    /** Is template active/available for use */
    isActive: boolean;
    /** Whether template is public (available to all tenants) or private */
    isPublic: boolean;
    /** Usage count across all tenants */
    usageCount: number;
    /** Average rating from users (0-5) */
    averageRating?: number;
    /** Total ratings received */
    ratingCount?: number;
    /** Which tenants have access (if not public) */
    allowedTenants?: string[];
    /** Preview/demo project ID for template showcase */
    demoProjectId?: string;
    /** Suggested for which project roles */
    suggestedForRoles?: string[];
    /** Metadata for analytics */
    metadata?: {
        estimatedSetupTime?: number;
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
        industry?: string;
        teamSize?: string;
    };
    /** Cosmos DB system properties */
    _rid?: string;
    _self?: string;
    _etag?: string;
}
/**
 * Template instance created when user instantiates a template
 * Tracks which templates are used in which projects
 */
export interface TemplateInstance {
    /** Unique instance identifier */
    id: string;
    /** Tenant ID */
    tenantId: string;
    /** Project ID created from this template */
    projectId: string;
    /** Template ID that was used */
    templateId: string;
    /** Template name at time of instantiation (snapshot) */
    templateName: string;
    /** Template version used */
    templateVersion: number;
    /** Who instantiated the template */
    createdBy: string;
    /** When template was instantiated */
    createdAt: Date;
    /** Customizations applied during instantiation */
    customizations?: {
        /** Shards selected for linking (subset of template suggestions) */
        selectedShardIds?: string[];
        /** Questions selected for chat (subset of template suggestions) */
        selectedQuestionIds?: string[];
        /** Custom additional shards added */
        additionalShards?: string[];
        /** Configuration overrides */
        configOverrides?: Record<string, any>;
    };
    /** Whether project setup is complete (all suggested actions done) */
    isSetupComplete: boolean;
    /** Checklist of setup items */
    setupChecklist?: Array<{
        id: string;
        title: string;
        description?: string;
        isCompleted: boolean;
        completedAt?: Date;
    }>;
    /** How much of setup is complete (0-100%) */
    setupProgress?: number;
}
/**
 * Template gallery item for display
 */
export interface TemplateGalleryItem {
    /** Template ID */
    id: string;
    /** Template name */
    name: string;
    /** Short overview */
    overview?: string;
    /** Icon URL */
    iconUrl?: string;
    /** Category */
    category: TemplateCategory;
    /** Tags */
    tags: string[];
    /** Average rating */
    rating?: number;
    /** Usage count */
    usageCount: number;
    /** Is recently added */
    isNew?: boolean;
    /** Is trending */
    isTrending?: boolean;
    /** Suggested for user (based on tenant config) */
    isSuggested?: boolean;
}
/**
 * Template preview for detail view
 */
export interface TemplatePreview {
    /** Template ID */
    id: string;
    /** Template name */
    name: string;
    /** Full description */
    description: string;
    /** Detailed description */
    detailedDescription?: string;
    /** Category */
    category: TemplateCategory;
    /** Tags */
    tags: string[];
    /** Estimated setup time */
    estimatedSetupTime?: number;
    /** Difficulty level */
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    /** Shards that will be linked */
    linkedShardsPreview: Array<{
        name: string;
        type?: string;
        relationshipType: string;
    }>;
    /** AI questions included */
    questionsPreview: string[];
    /** Configuration that will be applied */
    configPreview: Record<string, any>;
    /** Demo project URL (if available) */
    demoProjectUrl?: string;
    /** Ratings and reviews */
    ratings: {
        average?: number;
        count: number;
        distribution: Record<number, number>;
    };
    /** Similar templates */
    similarTemplates: TemplateGalleryItem[];
}
/**
 * Input DTO for creating template
 */
export interface CreateTemplateInput {
    /** Template name */
    name: string;
    /** Description */
    description: string;
    /** Category */
    category: TemplateCategory;
    /** Tags */
    tags: string[];
    /** Linked shards config */
    linkedShards?: TemplateLinkedShard[];
    /** AI chat questions */
    aiChatQuestions?: TemplateAIChatQuestion[];
    /** Default config */
    projectConfigDefaults?: Record<string, any>;
    /** Is public */
    isPublic: boolean;
    /** Allowed tenants (if not public) */
    allowedTenants?: string[];
    /** Icon URL */
    iconUrl?: string;
    /** Overview */
    overview?: string;
    /** Detailed description */
    detailedDescription?: string;
    /** Metadata */
    metadata?: Record<string, any>;
}
/**
 * Input DTO for updating template
 */
export interface UpdateTemplateInput {
    /** Template name */
    name?: string;
    /** Description */
    description?: string;
    /** Category */
    category?: TemplateCategory;
    /** Tags */
    tags?: string[];
    /** Linked shards config */
    linkedShards?: TemplateLinkedShard[];
    /** AI chat questions */
    aiChatQuestions?: TemplateAIChatQuestion[];
    /** Default config */
    projectConfigDefaults?: Record<string, any>;
    /** Is public */
    isPublic?: boolean;
    /** Allowed tenants */
    allowedTenants?: string[];
    /** Icon URL */
    iconUrl?: string;
    /** Is active */
    isActive?: boolean;
    /** Metadata */
    metadata?: Record<string, any>;
}
/**
 * Input DTO for instantiating template
 */
export interface InstantiateTemplateInput {
    /** New project name */
    projectName: string;
    /** New project description */
    projectDescription?: string;
    /** Shards to actually link (subset of template suggestions) */
    selectedShardIds?: string[];
    /** Questions to enable (subset of template suggestions) */
    selectedQuestionIds?: string[];
    /** Additional shards to link beyond template suggestions */
    additionalShards?: string[];
    /** Configuration overrides */
    configOverrides?: Record<string, any>;
    /** Optional custom owner ID */
    ownerId?: string;
}
/**
 * Template usage statistics
 */
export interface TemplateUsageStats {
    /** Template ID */
    templateId: string;
    /** Template name */
    templateName: string;
    /** Total instantiations */
    totalInstantiations: number;
    /** Instantiations by tenant */
    instantiationsByTenant: Record<string, number>;
    /** Average setup completion time (minutes) */
    avgSetupTime?: number;
    /** Setup completion rate (%) */
    setupCompletionRate?: number;
    /** Average rating */
    averageRating?: number;
    /** Top rated by users */
    isTopRated?: boolean;
    /** Trending (high recent usage) */
    isTrending?: boolean;
    /** Last instantiation date */
    lastInstantiationDate?: Date;
    /** Active instances (projects created from this template) */
    activeInstanceCount: number;
}
/**
 * Template recommendation input
 */
export interface TemplateRecommendationParams {
    /** User's role */
    userRole?: string;
    /** Tenant category/industry */
    tenantIndustry?: string;
    /** Team size estimate */
    teamSize?: string;
    /** Project type preference */
    projectType?: string;
    /** Excluded categories */
    excludeCategories?: TemplateCategory[];
    /** Max recommendations */
    limit?: number;
}
/**
 * Template query parameters
 */
export interface TemplateQueryParams {
    /** Filter by category */
    category?: TemplateCategory;
    /** Filter by tags (AND operation) */
    tags?: string[];
    /** Search by name/description */
    searchText?: string;
    /** Filter by difficulty */
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    /** Only active templates */
    onlyActive?: boolean;
    /** Only public or allowed for tenant */
    tenantId?: string;
    /** Pagination */
    page?: number;
    limit?: number;
    /** Sorting */
    sortBy?: 'name' | 'usageCount' | 'rating' | 'createdAt' | 'trending';
    sortDirection?: 'asc' | 'desc';
}
/**
 * Batch template instantiation for multiple projects
 */
export interface BatchInstantiateInput {
    /** Template ID to use for all */
    templateId: string;
    /** Number of projects to create */
    count: number;
    /** Project name template (use {n} for number, {uuid} for unique ID) */
    projectNameTemplate: string;
    /** Configuration overrides for all */
    configOverrides?: Record<string, any>;
    /** Optional owner IDs (if count > 1, will cycle through) */
    ownerIds?: string[];
}
/**
 * Batch instantiation result
 */
export interface BatchInstantiateResult {
    /** Operation ID for tracking */
    operationId: string;
    /** Number of projects created */
    createdCount: number;
    /** Number of failures */
    failureCount: number;
    /** Created project IDs */
    projectIds: string[];
    /** Failed projects with reasons */
    failures: Array<{
        index: number;
        projectName: string;
        error: string;
    }>;
    /** Operation timestamp */
    timestamp: Date;
}
//# sourceMappingURL=project-template.types.d.ts.map
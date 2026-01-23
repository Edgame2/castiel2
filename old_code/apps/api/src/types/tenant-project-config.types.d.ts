/**
 * Tenant Project Configuration Types
 * Defines configuration options for project management per tenant
 */
export interface RecommendationConfig {
    /** Similarity threshold for showing recommendations (0-1, default 0.7) */
    similarityThreshold: number;
    /** Weight for recency in scoring (0-2, default 1) */
    recencyWeight: number;
    /** Weight for vector similarity in hybrid ranking (0-100, %) */
    vectorWeight: number;
    /** Weight for collaborative filtering in hybrid ranking (0-100, %) */
    collaborativeWeight: number;
    /** Weight for temporal factors in hybrid ranking (0-100, %) */
    temporalWeight: number;
    /** Maximum recommendations to show (1-50, default 10) */
    maxRecommendations: number;
    /** Cache TTL in minutes (default 30) */
    cacheTtlMinutes: number;
}
export interface ProjectRoleDefaults {
    /** Default permissions for Manager role */
    manager: string[];
    /** Default permissions for Contributor role */
    contributor: string[];
    /** Default permissions for Viewer role */
    viewer: string[];
}
export interface TenantProjectSettings {
    tenantId: string;
    /** Maximum shards that can be linked to a single project (default 100) */
    maxLinkedShards: number;
    /** Shard types that cannot be linked to projects (e.g., 'c_internal_note') */
    excludedShardTypes: string[];
    /** Maximum tokens for project context assembly (default 8000) */
    chatTokenLimit: number;
    /** Strategy for context truncation: 'drop_lowest', 'summarize', 'sample' (default 'drop_lowest') */
    contextTruncationStrategy: 'drop_lowest' | 'summarize' | 'sample';
    /** Enable role-based sharing (share with department/team) */
    roleBasedSharingEnabled: boolean;
    /** Default project roles configuration */
    projectRoles: ProjectRoleDefaults;
    /** Recommendation algorithm configuration */
    recommendationConfig: RecommendationConfig;
    /** Enable activity feed tracking */
    activityFeedEnabled: boolean;
    /** Activity feed retention days (default 30, max 365) */
    activityFeedRetentionDays: number;
    /** Enable project templates */
    templatesEnabled: boolean;
    /** Enable project versioning */
    versioningEnabled: boolean;
    /** Max versions to keep per project (default 50) */
    maxVersionsPerProject: number;
    /** Version retention days (default 90) */
    versionRetentionDays: number;
    /** Enable cross-project analytics */
    analyticsEnabled: boolean;
    /** Enable cost tracking per project */
    costTrackingEnabled: boolean;
    /** Default notification channels */
    defaultNotificationChannels: ('email' | 'in_app' | 'slack' | 'teams')[];
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
}
export interface SystemProjectSettings {
    id: string;
    defaultMaxLinkedShards: number;
    maxLinkedShardsLimit: number;
    defaultChatTokenLimit: number;
    maxChatTokenLimit: number;
    minChatTokenLimit: number;
    defaultRecommendationConfig: RecommendationConfig;
    defaultActivityFeedRetentionDays: number;
    defaultVersionRetentionDays: number;
    defaultMaxVersionsPerProject: number;
    performanceMonitoringEnabled: boolean;
    anomalyDetectionStdDevThreshold: number;
    updatedAt: Date;
    updatedBy: string;
}
export interface ProjectChatQuestion {
    id: string;
    question: string;
    description: string;
    category: string;
    estimatedTokens: number;
    isActive: boolean;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    version: number;
}
export interface TenantChatCatalog {
    tenantId: string;
    /** IDs of questions enabled for this tenant */
    enabledQuestionIds: string[];
    /** Custom questions created by tenant */
    customQuestions: ProjectChatQuestion[];
    updatedAt: Date;
    updatedBy: string;
}
export interface PerformanceMetrics {
    id: string;
    tenantId: string;
    projectId?: string;
    timestamp: Date;
    recommendationLatencyMs?: number;
    recommendationCount?: number;
    recommendationHitRate?: number;
    contextAssemblyLatencyMs?: number;
    contextTokensUsed?: number;
    contextTruncationOccurred?: boolean;
    linkedShardsInContext?: number;
    vectorSearchLatencyMs?: number;
    vectorSearchResultCount?: number;
    aiResponseTimeMs?: number;
    aiTokensUsed?: number;
    aiCostEstimate?: number;
    linkingOperationTimeMs?: number;
    linkedShardsAdded?: number;
    apiCallCount?: number;
    apiErrorCount?: number;
    aggregationWindow?: 'realtime' | '1h' | '1d';
}
export interface CreateTenantProjectSettingsInput {
    maxLinkedShards?: number;
    excludedShardTypes?: string[];
    chatTokenLimit?: number;
    roleBasedSharingEnabled?: boolean;
    recommendationConfig?: Partial<RecommendationConfig>;
    activityFeedRetentionDays?: number;
    versionRetentionDays?: number;
}
export interface UpdateTenantProjectSettingsInput {
    maxLinkedShards?: number;
    excludedShardTypes?: string[];
    chatTokenLimit?: number;
    contextTruncationStrategy?: 'drop_lowest' | 'summarize' | 'sample';
    roleBasedSharingEnabled?: boolean;
    projectRoles?: Partial<ProjectRoleDefaults>;
    recommendationConfig?: Partial<RecommendationConfig>;
    activityFeedRetentionDays?: number;
    versionRetentionDays?: number;
    maxVersionsPerProject?: number;
    analyticsEnabled?: boolean;
    costTrackingEnabled?: boolean;
    defaultNotificationChannels?: ('email' | 'in_app' | 'slack' | 'teams')[];
}
//# sourceMappingURL=tenant-project-config.types.d.ts.map
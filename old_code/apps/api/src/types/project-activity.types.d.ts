/**
 * Project Activity Tracking Types
 * Defines structures for comprehensive activity trail logging across projects
 * Supports filtering, pagination, and audit trail leverage
 */
export declare enum ProjectActivityType {
    PROJECT_CREATED = "PROJECT_CREATED",
    PROJECT_UPDATED = "PROJECT_UPDATED",
    PROJECT_DELETED = "PROJECT_DELETED",
    PROJECT_SHARED = "PROJECT_SHARED",
    PROJECT_UNSHARED = "PROJECT_UNSHARED",
    PROJECT_OWNERSHIP_TRANSFERRED = "PROJECT_OWNERSHIP_TRANSFERRED",
    SHARD_LINKED = "SHARD_LINKED",
    SHARD_UNLINKED = "SHARD_UNLINKED",
    SHARD_RELATIONSHIP_CHANGED = "SHARD_RELATIONSHIP_CHANGED",
    AI_CHAT_INITIATED = "AI_CHAT_INITIATED",
    AI_CHAT_COMPLETED = "AI_CHAT_COMPLETED",
    RECOMMENDATION_GENERATED = "RECOMMENDATION_GENERATED",
    RECOMMENDATION_ACCEPTED = "RECOMMENDATION_ACCEPTED",
    RECOMMENDATION_DISMISSED = "RECOMMENDATION_DISMISSED",
    COLLABORATOR_ADDED = "COLLABORATOR_ADDED",
    COLLABORATOR_ROLE_CHANGED = "COLLABORATOR_ROLE_CHANGED",
    COLLABORATOR_REMOVED = "COLLABORATOR_REMOVED",
    TEMPLATE_USED = "TEMPLATE_USED",
    VERSION_SNAPSHOT_CREATED = "VERSION_SNAPSHOT_CREATED",
    VERSION_SNAPSHOT_RESTORED = "VERSION_SNAPSHOT_RESTORED",
    CUSTOM_QUESTION_ADDED = "CUSTOM_QUESTION_ADDED",
    CUSTOM_QUESTION_REMOVED = "CUSTOM_QUESTION_REMOVED",
    ACTIVITY_EXPORTED = "ACTIVITY_EXPORTED"
}
export declare enum ActivitySeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
/**
 * Core project activity record stored in project-activities container
 * Partitioned by tenantId for tenant isolation
 */
export interface ProjectActivity {
    /** Unique activity identifier (UUID) */
    id: string;
    /** Tenant ID for multi-tenancy isolation */
    tenantId: string;
    /** Project ID this activity belongs to */
    projectId: string;
    /** Type of activity (enum defining 20+ activity types) */
    type: ProjectActivityType;
    /** Actor user ID (who performed the action) */
    actorUserId: string;
    /** Actor display name cached for quick reference */
    actorDisplayName: string;
    /** Affected user ID (if action targets a specific user) */
    affectedUserId?: string;
    /** Affected user display name */
    affectedUserDisplayName?: string;
    /** Activity description in readable format */
    description: string;
    /** Severity level: low (routine), medium (sharing/role changes), high (deletion/transfer), critical (bulk operations) */
    severity: ActivitySeverity;
    /** Details object with type-specific information (polymorphic based on activityType) */
    details: {
        sharedWith?: string;
        sharedWithRole?: string;
        bulkShareCount?: number;
        shardId?: string;
        shardName?: string;
        linkedToShardId?: string;
        linkedToShardName?: string;
        relationshipType?: string;
        previousRelationshipType?: string;
        bulkLinkCount?: number;
        chatSessionId?: string;
        question?: string;
        tokensUsed?: number;
        contextSize?: number;
        truncatedContextSize?: number;
        responseTime?: number;
        recommendationId?: string;
        recommendedShardId?: string;
        recommendedShardName?: string;
        recommendationScore?: number;
        confidenceScore?: number;
        previousRole?: string;
        newRole?: string;
        templateId?: string;
        templateName?: string;
        instanceCount?: number;
        snapshotId?: string;
        snapshotLabel?: string;
        snapshotDescription?: string;
        restoredFromVersion?: number;
        questionId?: string;
        questionText?: string;
        exportFormat?: 'csv' | 'json' | 'pdf';
        exportRecordCount?: number;
        [key: string]: any;
    };
    /** IP address of request source (for security audit) */
    ipAddress?: string;
    /** User agent for device tracking */
    userAgent?: string;
    /** Timestamp when activity occurred */
    timestamp: Date;
    /** TTL in seconds for automatic cleanup (default: 90 days = 7776000) */
    ttl?: number;
    /** Index for sorting and range queries */
    _ts?: number;
    /** Cosmos DB system properties */
    _rid?: string;
    _self?: string;
    _etag?: string;
}
/**
 * Activity filtering options for queries
 */
export interface ActivityFilterOptions {
    /** Filter by activity type(s) */
    types?: ProjectActivityType[];
    /** Filter by severity level(s) */
    severity?: ActivitySeverity[];
    /** Filter by actor user ID */
    actorUserId?: string;
    /** Filter by affected user ID */
    affectedUserId?: string;
    /** Date range start (ISO string) */
    startDate?: string;
    /** Date range end (ISO string) */
    endDate?: string;
    /** Search text in description */
    searchText?: string;
    /** Related shard ID for shard operations filtering */
    relatedShardId?: string;
    /** Related collaborator ID for sharing operations */
    relatedCollaboratorId?: string;
}
/**
 * Activity query parameters with pagination and sorting
 */
export interface ActivityQueryParams extends ActivityFilterOptions {
    /** Page number (1-indexed) */
    page?: number;
    /** Items per page */
    limit?: number;
    /** Sort field: timestamp (default), severity, type */
    sortBy?: 'timestamp' | 'severity' | 'type';
    /** Sort direction: desc (default) or asc */
    sortDirection?: 'asc' | 'desc';
}
/**
 * Paginated activity response
 */
export interface ActivityPage {
    /** Activity records for current page */
    items: ProjectActivity[];
    /** Total number of activities matching filter */
    totalCount: number;
    /** Current page number (1-indexed) */
    pageNumber: number;
    /** Total pages available */
    totalPages: number;
    /** Items per page */
    pageSize: number;
    /** Whether more pages exist */
    hasMore: boolean;
}
/**
 * Activity statistics for dashboard/analytics
 */
export interface ActivityStatistics {
    /** Total activities in time range */
    totalActivities: number;
    /** Activities by type */
    byType: Record<ProjectActivityType, number>;
    /** Activities by severity */
    bySeverity: Record<ActivitySeverity, number>;
    /** Most active users */
    topActors: Array<{
        userId: string;
        displayName: string;
        activityCount: number;
    }>;
    /** Most frequently affected users/resources */
    topAffected: Array<{
        userId?: string;
        displayName?: string;
        shardId?: string;
        shardName?: string;
        affectedCount: number;
    }>;
    /** Daily activity trends */
    dailyTrend: Array<{
        date: string;
        count: number;
    }>;
    /** Peak activity hour (0-23) */
    peakActivityHour?: number;
}
/**
 * Activity export format for reports/audits
 */
export interface ActivityExport {
    /** Export format */
    format: 'csv' | 'json' | 'pdf';
    /** Exported data (content varies by format) */
    data: string;
    /** MIME type for response */
    mimeType: string;
    /** Suggested filename */
    filename: string;
    /** Generation timestamp */
    generatedAt: Date;
    /** Number of records exported */
    recordCount: number;
}
/**
 * Input DTO for creating activities (internal use)
 * Services should use this to log activities
 */
export interface CreateActivityInput {
    /** Project ID */
    projectId: string;
    /** Activity type */
    type: ProjectActivityType;
    /** Actor user ID */
    actorUserId: string;
    /** Actor display name */
    actorDisplayName: string;
    /** Activity description */
    description: string;
    /** Severity level */
    severity: ActivitySeverity;
    /** Type-specific details */
    details: Record<string, any>;
    /** Affected user ID (optional) */
    affectedUserId?: string;
    /** Affected user display name (optional) */
    affectedUserDisplayName?: string;
    /** IP address (optional, provided by middleware) */
    ipAddress?: string;
    /** User agent (optional, provided by middleware) */
    userAgent?: string;
}
/**
 * Activity statistics query parameters
 */
export interface ActivityStatsParams {
    /** Days to look back (default: 30) */
    days?: number;
    /** Start date (ISO string) alternative to days */
    startDate?: string;
    /** End date (ISO string) */
    endDate?: string;
    /** Filter by activity types */
    types?: ProjectActivityType[];
}
/**
 * Bulk activity creation for batch logging
 * Used when multiple related activities occur
 */
export interface BulkActivityInput {
    /** Project ID for all activities */
    projectId: string;
    /** Array of activities to create */
    activities: CreateActivityInput[];
    /** Optional transaction ID to link activities */
    transactionId?: string;
}
/**
 * Activity retention policy configuration
 */
export interface ActivityRetentionPolicy {
    /** Default TTL in seconds (90 days = 7776000) */
    defaultTtlSeconds: number;
    /** TTL overrides by activity type */
    typeOverrides: Record<ProjectActivityType, number>;
    /** TTL overrides by severity */
    severityOverrides: Record<ActivitySeverity, number>;
    /** Whether to archive to cold storage before deletion */
    archiveBeforeDeletion: boolean;
    /** Archive storage location */
    archiveLocation?: string;
    /** Super admin overrides for retention */
    adminOverrides?: Record<string, number>;
}
/**
 * Activity summary for timeline display
 */
export interface ActivitySummary {
    /** Activity ID */
    id: string;
    /** Activity type */
    type: ProjectActivityType;
    /** Description */
    description: string;
    /** Severity badge */
    severity: ActivitySeverity;
    /** Actor info */
    actor: {
        userId: string;
        displayName: string;
        avatar?: string;
    };
    /** Relative timestamp (e.g., "2 hours ago") */
    relativeTime: string;
    /** Absolute timestamp */
    timestamp: Date;
    /** Related resource info for quick preview */
    relatedResource?: {
        type: 'shard' | 'collaborator' | 'version' | 'template';
        id: string;
        name: string;
    };
}
//# sourceMappingURL=project-activity.types.d.ts.map
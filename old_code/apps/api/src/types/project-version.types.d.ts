/**
 * Project Versioning & History Types
 * Version snapshots, change tracking, and rollback support
 */
/**
 * Version status
 */
export declare enum VersionStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    ARCHIVED = "archived",
    ROLLBACK = "rollback"
}
/**
 * Change types
 */
export declare enum ChangeType {
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
    MOVE = "move",
    RESTORE = "restore",
    MERGE = "merge",
    SPLIT = "split"
}
/**
 * Conflict resolution strategies
 */
export declare enum ConflictStrategy {
    KEEP_MINE = "keep_mine",
    KEEP_THEIRS = "keep_theirs",
    MERGE = "merge",
    MANUAL = "manual"
}
/**
 * Version severity (for importance/priority)
 */
export declare enum VersionSeverity {
    MINOR = "minor",
    MAJOR = "major",
    BREAKING = "breaking"
}
/**
 * Change delta detail
 */
export interface ChangeDelta {
    field: string;
    oldValue?: any;
    newValue?: any;
    oldValueType?: string;
    newValueType?: string;
    changeType: ChangeType;
}
/**
 * Detailed change record
 */
export interface DetailedChange {
    entityId: string;
    entityType: string;
    entityName?: string;
    changeType: ChangeType;
    deltas: ChangeDelta[];
    changedBy: string;
    changedByEmail: string;
    changedByName: string;
    timestamp: Date;
    reason?: string;
}
/**
 * Project version snapshot
 */
export interface ProjectVersion {
    id: string;
    tenantId: string;
    projectId: string;
    versionNumber: number;
    versionName: string;
    description?: string;
    status: VersionStatus;
    severity: VersionSeverity;
    content: {
        projectMetadata: Record<string, any>;
        shards: any[];
        links: any[];
        collaborators: any[];
        settings: Record<string, any>;
    };
    changes: DetailedChange[];
    changeSummary: {
        shardsCreated: number;
        shardsUpdated: number;
        shardsDeleted: number;
        linksCreated: number;
        linksModified: number;
        linksRemoved: number;
        collaboratorsAdded: number;
        collaboratorsRemoved: number;
        totalChanges: number;
    };
    author: {
        userId: string;
        email: string;
        name: string;
    };
    createdAt: Date;
    publishedAt?: Date;
    archivedAt?: Date;
    parentVersionId?: string;
    childVersionIds?: string[];
    rollbackOf?: string;
    rollbackTargetId?: string;
    tags?: string[];
    releaseNotes?: string;
    compatibility?: {
        breakingChanges?: string[];
        deprecations?: string[];
        migrations?: string[];
    };
    metrics?: {
        totalShards: number;
        totalLinks: number;
        projectSize: number;
        contentHash: string;
    };
    ttl?: number;
}
/**
 * Version comparison result
 */
export interface VersionComparison {
    version1Id: string;
    version2Id: string;
    version1Number: number;
    version2Number: number;
    differences: {
        category: 'metadata' | 'content' | 'settings' | 'collaborators';
        changes: ChangeDelta[];
    }[];
    conflictingChanges?: {
        entityId: string;
        entityType: string;
        deltaInV1: ChangeDelta;
        deltaInV2: ChangeDelta;
    }[];
    statisticalDifferences: {
        addedShards: number;
        modifiedShards: number;
        deletedShards: number;
        addedLinks: number;
        modifiedLinks: number;
        deletedLinks: number;
        similarityScore: number;
    };
    timeline: {
        timeBetween: number;
        changeRate: number;
    };
}
/**
 * Version history timeline entry
 */
export interface VersionHistoryEntry {
    versionId: string;
    versionNumber: number;
    versionName: string;
    author: {
        userId: string;
        name: string;
    };
    timestamp: Date;
    changeCount: number;
    status: VersionStatus;
    tags?: string[];
    description?: string;
    iconUrl?: string;
}
/**
 * Rollback request
 */
export interface RollbackRequest {
    sourceVersionId: string;
    targetVersionId?: string;
    rollbackPartially?: boolean;
    partialEntities?: {
        entityId: string;
        entityType: string;
    }[];
    reason?: string;
    skipNotification?: boolean;
}
/**
 * Rollback result
 */
export interface RollbackResult {
    newVersionId: string;
    newVersionNumber: number;
    previousVersionId: string;
    rollbackTimestamp: Date;
    changesReverted: number;
    partialRollback: boolean;
    affectedEntities: {
        entityId: string;
        entityType: string;
        entityName: string;
        restoreStatus: 'success' | 'partial' | 'failed';
    }[];
}
/**
 * Version branching (for collaborative editing)
 */
export interface VersionBranch {
    id: string;
    tenantId: string;
    projectId: string;
    basedOnVersionId: string;
    branchName: string;
    createdBy: {
        userId: string;
        email: string;
        name: string;
    };
    createdAt: Date;
    lastModified: Date;
    latestVersionNumber: number;
    isActive: boolean;
    mergeStatus?: 'pending' | 'in_progress' | 'completed' | 'conflict';
    mergeConflicts?: {
        entityId: string;
        conflict: DetailedChange[];
    }[];
}
/**
 * Merge request
 */
export interface MergeRequest {
    id: string;
    tenantId: string;
    projectId: string;
    sourceBranch: string;
    targetBranch: string;
    sourceVersionId: string;
    targetVersionId: string;
    title: string;
    description?: string;
    status: 'open' | 'approved' | 'rejected' | 'merged' | 'closed';
    createdBy: {
        userId: string;
        email: string;
        name: string;
    };
    reviewers?: {
        userId: string;
        name: string;
        status: 'pending' | 'approved' | 'requested_changes';
        comment?: string;
    }[];
    conflicts?: {
        entityId: string;
        type: string;
        strategy: ConflictStrategy;
    }[];
    createdAt: Date;
    mergedAt?: Date;
    ttl?: number;
}
/**
 * Change history filter
 */
export interface ChangeHistoryFilter {
    startDate?: Date;
    endDate?: Date;
    changeTypes?: ChangeType[];
    authorId?: string;
    entityType?: string;
    entityId?: string;
    minSeverity?: VersionSeverity;
    searchTerm?: string;
}
/**
 * Change history response
 */
export interface ChangeHistoryResponse {
    changes: DetailedChange[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    hasMore: boolean;
}
/**
 * Version statistics
 */
export interface VersionStatistics {
    projectId: string;
    totalVersions: number;
    activeVersion: number;
    archivedVersions: number;
    draftVersions: number;
    averageChangePerVersion: number;
    mostActiveContributors: {
        userId: string;
        name: string;
        versionCount: number;
        changeCount: number;
    }[];
    changeTypeDistribution: {
        [key in ChangeType]?: number;
    };
    timelineData: {
        date: Date;
        versionCount: number;
        changeCount: number;
        avgSize: number;
    }[];
}
/**
 * Version tag
 */
export interface VersionTag {
    id: string;
    tenantId: string;
    projectId: string;
    versionId: string;
    tagName: string;
    tagType: 'milestone' | 'release' | 'checkpoint' | 'custom';
    description?: string;
    createdBy: string;
    createdAt: Date;
    releaseDate?: Date;
    ttl?: number;
}
/**
 * Revision snapshot (minimal)
 */
export interface RevisionSnapshot {
    id: string;
    versionId: string;
    entityId: string;
    entityType: string;
    beforeValue: any;
    afterValue: any;
    changedAt: Date;
    changedBy: string;
}
/**
 * Version publish request
 */
export interface PublishVersionRequest {
    versionId: string;
    releaseNotes?: string;
    tags?: string[];
    notifyCollaborators?: boolean;
    archivePrevious?: boolean;
}
/**
 * Version publish response
 */
export interface PublishVersionResponse {
    versionId: string;
    versionNumber: number;
    publishedAt: Date;
    previousVersionId?: string;
    notificationsQueued: number;
}
/**
 * Archive request
 */
export interface ArchiveVersionRequest {
    versionId: string;
    reason?: string;
    keepSnapshot?: boolean;
}
/**
 * Content diff viewer configuration
 */
export interface DiffViewerConfig {
    format: 'unified' | 'split' | 'inline';
    ignoreWhitespace: boolean;
    contextLines: number;
    highlightChanges: boolean;
    showMetadata: boolean;
}
/**
 * Version export format
 */
export interface VersionExportRequest {
    versionId: string;
    format: 'json' | 'csv' | 'markdown' | 'pdf';
    includeHistory: boolean;
    includeMetadata: boolean;
    includeComments?: boolean;
}
/**
 * Version import request
 */
export interface VersionImportRequest {
    projectId: string;
    sourceFile: Buffer;
    format: 'json' | 'csv';
    importAsNewVersion?: boolean;
    mergeStrategy?: ConflictStrategy;
}
/**
 * Lock management (prevent concurrent edits)
 */
export interface VersionLock {
    id: string;
    versionId: string;
    lockedBy: {
        userId: string;
        name: string;
        sessionId: string;
    };
    lockedAt: Date;
    expiresAt: Date;
    isActive: boolean;
    autoRelease?: boolean;
}
/**
 * Version recovery item (for deleted versions)
 */
export interface RecoveryItem {
    id: string;
    tenantId: string;
    projectId: string;
    versionId: string;
    deletedAt: Date;
    deletedBy: string;
    recoveryDeadline: Date;
    content: any;
    reason?: string;
    ttl?: number;
}
//# sourceMappingURL=project-version.types.d.ts.map
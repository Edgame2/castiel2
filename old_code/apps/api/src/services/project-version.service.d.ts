/**
 * Project Versioning Service
 * Version snapshots, change tracking, rollback, and merge functionality
 */
import { ProjectVersion, VersionComparison, VersionHistoryEntry, RollbackRequest, RollbackResult, VersionStatistics, PublishVersionRequest, PublishVersionResponse } from '../types/project-version.types';
import { CosmosDBService } from './cosmos-db.service';
import { CacheService } from './cache.service';
import { ProjectActivityService } from './project-activity.service';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { ShardLinkingService } from './shard-linking.service';
export declare class ProjectVersionService {
    private cosmosDB;
    private cache;
    private activityService;
    private performanceMonitoring;
    private shardLinking;
    private readonly logger;
    private readonly VERSION_CACHE_TTL;
    private readonly STATS_CACHE_TTL;
    constructor(cosmosDB: CosmosDBService, cache: CacheService, activityService: ProjectActivityService, performanceMonitoring: PerformanceMonitoringService, shardLinking: ShardLinkingService);
    /**
     * Create new project version
     */
    createVersion(tenantId: string, projectId: string, versionName: string, description: string, userId: string, userEmail: string, userName: string): Promise<ProjectVersion>;
    /**
     * Get version by ID
     */
    getVersion(tenantId: string, versionId: string): Promise<ProjectVersion>;
    /**
     * Get version history
     */
    getVersionHistory(tenantId: string, projectId: string, limit?: number, offset?: number): Promise<{
        entries: VersionHistoryEntry[];
        total: number;
    }>;
    /**
     * Compare two versions
     */
    compareVersions(tenantId: string, version1Id: string, version2Id: string): Promise<VersionComparison>;
    /**
     * Rollback to previous version
     */
    rollback(tenantId: string, projectId: string, request: RollbackRequest, userId: string): Promise<RollbackResult>;
    /**
     * Publish version
     */
    publishVersion(tenantId: string, request: PublishVersionRequest, userId: string): Promise<PublishVersionResponse>;
    /**
     * Get version statistics
     */
    getStatistics(tenantId: string, projectId: string): Promise<VersionStatistics>;
    /**
     * Helper: Calculate changes between versions
     */
    private calculateChanges;
    /**
     * Helper: Summarize changes
     */
    private summarizeChanges;
    /**
     * Helper: Calculate content hash
     */
    private calculateContentHash;
    /**
     * Helper: Determine version severity
     */
    private determineSeverity;
    /**
     * Helper: Get previous version
     */
    private getPreviousVersion;
    /**
     * Helper: Restore content
     */
    private restoreContent;
    /**
     * Helper: Detect differences
     */
    private detectDifferences;
    /**
     * Helper: Compare arrays
     */
    private compareArrays;
    /**
     * Helper: Get top contributors
     */
    private getTopContributors;
    /**
     * Helper: Get change type distribution
     */
    private getChangeTypeDistribution;
    /**
     * Helper: Get timeline data
     */
    private getTimelineData;
    /**
     * Helper: Invalidate cache
     */
    private invalidateVersionCache;
    /**
     * Helper: Log activity
     */
    private logActivity;
}
//# sourceMappingURL=project-version.service.d.ts.map
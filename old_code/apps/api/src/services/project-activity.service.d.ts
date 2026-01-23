/**
 * Project Activity Service
 * Manages activity logging, filtering, querying, and export
 * Supports comprehensive audit trail with TTL-based cleanup
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import type { Redis } from 'ioredis';
import { ProjectActivity, ActivityFilterOptions, ActivityQueryParams, ActivityPage, ActivityStatistics, ActivityExport, CreateActivityInput, BulkActivityInput, ActivitySummary, ActivityStatsParams } from '../types/project-activity.types';
export declare class ProjectActivityService {
    private readonly ACTIVITY_CACHE_TTL;
    private readonly STATS_CACHE_TTL;
    private client;
    private database;
    private activitiesContainer;
    private monitoring;
    private shardRepository;
    private redis?;
    private cleanupIntervalId?;
    private readonly DEFAULT_RETENTION_POLICY;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, redis?: Redis);
    /**
     * Log a single project activity
     */
    logActivity(tenantId: string, input: CreateActivityInput): Promise<ProjectActivity>;
    /**
     * Log multiple activities in bulk
     */
    logActivitiesBulk(tenantId: string, input: BulkActivityInput): Promise<ProjectActivity[]>;
    /**
     * Query activities with filters and pagination
     */
    getActivities(tenantId: string, projectId: string, params?: ActivityQueryParams): Promise<ActivityPage>;
    /**
     * Get recent activities for a project (cached)
     */
    getRecentActivities(tenantId: string, projectId: string, limit?: number): Promise<ActivitySummary[]>;
    /**
     * Get activity statistics
     */
    getStatistics(tenantId: string, projectId: string, params?: ActivityStatsParams): Promise<ActivityStatistics>;
    /**
     * Export activities to various formats
     */
    exportActivities(tenantId: string, projectId: string, format: 'csv' | 'json' | 'pdf', filters?: ActivityFilterOptions): Promise<ActivityExport>;
    /**
     * Delete activities older than retention policy
     * Called periodically by scheduler
     */
    cleanupOldActivities(tenantId?: string): Promise<number>;
    /**
     * Helper: Calculate TTL based on activity type and severity
     */
    private calculateTTL;
    /**
     * Helper: Get relative time string
     */
    private getRelativeTime;
    /**
     * Helper: Extract related resource from activity details
     */
    private extractRelatedResource;
    /**
     * Helper: Export as CSV
     */
    private exportAsCSV;
    /**
     * Helper: Export as PDF (simplified)
     * In production, would use proper PDF library like pdfkit or puppeteer
     */
    private exportAsPDF;
    /**
     * Schedule periodic cleanup of expired activities
     */
    private scheduleCleanup;
    /**
     * Cleanup method for graceful shutdown
     */
    shutdown(): void;
}
//# sourceMappingURL=project-activity.service.d.ts.map
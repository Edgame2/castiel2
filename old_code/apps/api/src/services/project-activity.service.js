/**
 * Project Activity Service
 * Manages activity logging, filtering, querying, and export
 * Supports comprehensive audit trail with TTL-based cleanup
 */
import { CosmosClient } from '@azure/cosmos';
import { SeverityLevel } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { ProjectActivityType, ActivitySeverity, } from '../types/project-activity.types';
import { v4 as uuidv4 } from 'uuid';
export class ProjectActivityService {
    ACTIVITY_CACHE_TTL = 300; // 5 minutes for recent activities
    STATS_CACHE_TTL = 3600; // 1 hour for statistics
    client;
    database;
    activitiesContainer;
    monitoring;
    shardRepository;
    redis;
    cleanupIntervalId; // Track cleanup interval for shutdown
    // Default retention policy: 90 days (7776000 seconds)
    DEFAULT_RETENTION_POLICY = {
        defaultTtlSeconds: 7776000,
        typeOverrides: {
            [ProjectActivityType.PROJECT_DELETED]: 31536000, // Keep for 1 year
            [ProjectActivityType.PROJECT_OWNERSHIP_TRANSFERRED]: 31536000,
            [ProjectActivityType.VERSION_SNAPSHOT_CREATED]: 31536000,
        },
        severityOverrides: {
            [ActivitySeverity.CRITICAL]: 31536000, // Keep critical events 1 year
            [ActivitySeverity.HIGH]: 15552000, // Keep high-severity 6 months
            [ActivitySeverity.MEDIUM]: 7776000, // Keep medium 90 days (default)
            [ActivitySeverity.LOW]: 2592000, // Keep low 30 days
        },
        archiveBeforeDeletion: false,
    };
    constructor(monitoring, shardRepository, redis) {
        this.monitoring = monitoring;
        this.shardRepository = shardRepository;
        this.redis = redis;
        // Initialize Cosmos client with optimized connection policy
        const connectionPolicy = {
            connectionMode: 'Direct', // Best performance
            requestTimeout: 30000, // 30 seconds
            enableEndpointDiscovery: true, // For multi-region
            retryOptions: {
                maxRetryAttemptCount: 9,
                fixedRetryIntervalInMilliseconds: 0, // Exponential backoff
                maxWaitTimeInSeconds: 30,
            },
        };
        this.client = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
            connectionPolicy,
        });
        this.database = this.client.database(config.cosmosDb.databaseId);
        this.activitiesContainer = this.database.container('project-activities');
        // Schedule cleanup of expired activities
        this.scheduleCleanup();
    }
    /**
     * Log a single project activity
     */
    async logActivity(tenantId, input) {
        try {
            // Validate input
            if (!input.projectId || !input.type || !input.actorUserId) {
                throw new Error('projectId, type, and actorUserId are required');
            }
            // Calculate TTL based on severity and type
            const ttl = this.calculateTTL(input.type, input.severity);
            const activity = {
                id: uuidv4(),
                tenantId,
                projectId: input.projectId,
                type: input.type,
                actorUserId: input.actorUserId,
                actorDisplayName: input.actorDisplayName,
                description: input.description,
                severity: input.severity,
                details: input.details || {},
                affectedUserId: input.affectedUserId,
                affectedUserDisplayName: input.affectedUserDisplayName,
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
                timestamp: new Date(),
                ttl,
            };
            // Save to database
            await this.activitiesContainer.items.upsert(activity);
            // Invalidate recent activity cache
            if (this.redis) {
                await this.redis.del(`recent-activities:${input.projectId}`);
            }
            this.monitoring.trackEvent('project-activity.logged', {
                activityId: activity.id,
                type: input.type,
                projectId: input.projectId,
                actorUserId: input.actorUserId,
            });
            return activity;
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'project-activity.logActivity' });
            throw error;
        }
    }
    /**
     * Log multiple activities in bulk
     */
    async logActivitiesBulk(tenantId, input) {
        try {
            const activities = [];
            for (const activityInput of input.activities) {
                const activity = await this.logActivity(tenantId, activityInput);
                activities.push(activity);
            }
            this.monitoring.trackEvent('project-activity.bulkLogged', {
                count: activities.length,
                transactionId: input.transactionId,
            });
            return activities;
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'project-activity.logActivitiesBulk' });
            throw error;
        }
    }
    /**
     * Query activities with filters and pagination
     */
    async getActivities(tenantId, projectId, params = {}) {
        try {
            // Build query based on filters
            let query = `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId AND c.projectId = @projectId
      `;
            const parameters = [
                { name: '@tenantId', value: tenantId },
                { name: '@projectId', value: projectId },
            ];
            // Apply type filter
            if (params.types && params.types.length > 0) {
                query += ` AND c.type IN (${params.types.map((_, i) => `@type${i}`).join(',')})`;
                params.types.forEach((type, i) => {
                    parameters.push({ name: `@type${i}`, value: type });
                });
            }
            // Apply severity filter
            if (params.severity && params.severity.length > 0) {
                query += ` AND c.severity IN (${params.severity.map((_, i) => `@sev${i}`).join(',')})`;
                params.severity.forEach((sev, i) => {
                    parameters.push({ name: `@sev${i}`, value: sev });
                });
            }
            // Apply actor filter
            if (params.actorUserId) {
                query += ` AND c.actorUserId = @actorUserId`;
                parameters.push({ name: '@actorUserId', value: params.actorUserId });
            }
            // Apply affected user filter
            if (params.affectedUserId) {
                query += ` AND c.affectedUserId = @affectedUserId`;
                parameters.push({ name: '@affectedUserId', value: params.affectedUserId });
            }
            // Apply date range filter
            if (params.startDate) {
                query += ` AND c.timestamp >= @startDate`;
                parameters.push({ name: '@startDate', value: new Date(params.startDate) });
            }
            if (params.endDate) {
                query += ` AND c.timestamp <= @endDate`;
                parameters.push({ name: '@endDate', value: new Date(params.endDate) });
            }
            // Apply search filter
            if (params.searchText) {
                query += ` AND CONTAINS(c.description, @searchText)`;
                parameters.push({ name: '@searchText', value: params.searchText });
            }
            // Apply shard filter
            if (params.relatedShardId) {
                query += ` AND c.details.shardId = @shardId`;
                parameters.push({ name: '@shardId', value: params.relatedShardId });
            }
            // Apply sorting
            const sortField = params.sortBy === 'severity' ? 'c.severity' : params.sortBy === 'type' ? 'c.type' : 'c.timestamp';
            const sortDirection = params.sortDirection === 'asc' ? 'ASC' : 'DESC';
            query += ` ORDER BY ${sortField} ${sortDirection}`;
            // Execute query to get total count
            const countQuery = {
                query: query + ` OFFSET 0 LIMIT 999999`,
                parameters,
            };
            const { resources: totalActivities } = await this.activitiesContainer.items
                .query(countQuery)
                .fetchAll();
            // Apply pagination
            const page = params.page || 1;
            const limit = params.limit || 20;
            const offset = (page - 1) * limit;
            const paginatedQuery = {
                query: query + ` OFFSET @offset LIMIT @limit`,
                parameters: [
                    ...parameters,
                    { name: '@offset', value: offset },
                    { name: '@limit', value: limit },
                ],
            };
            const { resources: activities } = await this.activitiesContainer.items
                .query(paginatedQuery)
                .fetchAll();
            const totalCount = totalActivities.length;
            const totalPages = Math.ceil(totalCount / limit);
            return {
                items: activities,
                totalCount,
                pageNumber: page,
                totalPages,
                pageSize: limit,
                hasMore: page < totalPages,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'project-activity.getActivities' });
            throw error;
        }
    }
    /**
     * Get recent activities for a project (cached)
     */
    async getRecentActivities(tenantId, projectId, limit = 10) {
        try {
            const cacheKey = `recent-activities:${projectId}`;
            if (this.redis) {
                try {
                    const cached = await this.redis.get(cacheKey);
                    if (cached) {
                        try {
                            return JSON.parse(cached);
                        }
                        catch (parseError) {
                            this.monitoring.trackException(parseError instanceof Error ? parseError : new Error(String(parseError)), {
                                operation: 'project-activity.parse-cache',
                                projectId,
                            });
                        }
                    }
                }
                catch (redisError) {
                    // Redis error - continue without cache, don't fail the request
                    this.monitoring.trackException(redisError instanceof Error ? redisError : new Error(String(redisError)), {
                        operation: 'project-activity.redis-get',
                        projectId,
                    });
                }
            }
            const page = await this.getActivities(tenantId, projectId, {
                limit,
                sortBy: 'timestamp',
                sortDirection: 'desc',
            });
            const summaries = page.items.map((activity) => ({
                id: activity.id,
                type: activity.type,
                description: activity.description,
                severity: activity.severity,
                actor: {
                    userId: activity.actorUserId,
                    displayName: activity.actorDisplayName,
                },
                relativeTime: this.getRelativeTime(activity.timestamp),
                timestamp: activity.timestamp,
                relatedResource: this.extractRelatedResource(activity),
            }));
            if (this.redis) {
                try {
                    await this.redis.setex(cacheKey, this.ACTIVITY_CACHE_TTL, JSON.stringify(summaries));
                }
                catch (redisError) {
                    // Redis error - log but don't fail the request
                    this.monitoring.trackException(redisError instanceof Error ? redisError : new Error(String(redisError)), {
                        operation: 'project-activity.redis-setex',
                        projectId,
                    });
                }
            }
            return summaries;
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'project-activity.getRecentActivities' });
            return [];
        }
    }
    /**
     * Get activity statistics
     */
    async getStatistics(tenantId, projectId, params = {}) {
        try {
            const cacheKey = `activity-stats:${projectId}`;
            if (this.redis) {
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            }
            // Determine date range
            const endDate = params.endDate ? new Date(params.endDate) : new Date();
            const startDate = params.startDate
                ? new Date(params.startDate)
                : new Date(endDate.getTime() - (params.days ?? 30) * 24 * 60 * 60 * 1000);
            // Query all activities in range
            const page = await this.getActivities(tenantId, projectId, {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                limit: 999999,
            });
            const activities = page.items;
            // Calculate statistics
            const byType = {};
            const bySeverity = {};
            const topActorsMap = new Map();
            const topAffectedMap = new Map();
            const dailyTrend = new Map();
            // Initialize counts
            Object.values(ProjectActivityType).forEach((type) => {
                byType[type] = 0;
            });
            Object.values(ActivitySeverity).forEach((sev) => {
                bySeverity[sev] = 0;
            });
            let peakActivityHour;
            const hourlyCount = new Array(24).fill(0);
            // Process activities
            activities.forEach((activity) => {
                // Count by type
                byType[activity.type]++;
                // Count by severity
                bySeverity[activity.severity]++;
                // Track actors
                const actorKey = activity.actorUserId;
                const existing = topActorsMap.get(actorKey) || {
                    userId: activity.actorUserId,
                    displayName: activity.actorDisplayName,
                    count: 0,
                };
                existing.count++;
                topActorsMap.set(actorKey, existing);
                // Track affected resources
                if (activity.affectedUserId) {
                    const affectedKey = `user:${activity.affectedUserId}`;
                    const existing = topAffectedMap.get(affectedKey) || {
                        userId: activity.affectedUserId,
                        displayName: activity.affectedUserDisplayName,
                        affectedCount: 0,
                    };
                    existing.affectedCount++;
                    topAffectedMap.set(affectedKey, existing);
                }
                if (activity.details?.shardId) {
                    const shardKey = `shard:${activity.details.shardId}`;
                    const existing = topAffectedMap.get(shardKey) || {
                        shardId: activity.details.shardId,
                        shardName: activity.details.shardName,
                        affectedCount: 0,
                    };
                    existing.affectedCount++;
                    topAffectedMap.set(shardKey, existing);
                }
                // Track hourly trend
                const hour = new Date(activity.timestamp).getHours();
                hourlyCount[hour]++;
                // Track daily trend
                const dateKey = activity.timestamp.toISOString().split('T')[0];
                dailyTrend.set(dateKey, (dailyTrend.get(dateKey) || 0) + 1);
            });
            // Find peak activity hour
            const maxHourlyCount = Math.max(...hourlyCount);
            if (maxHourlyCount > 0) {
                peakActivityHour = hourlyCount.indexOf(maxHourlyCount);
            }
            // Build statistics
            const stats = {
                totalActivities: activities.length,
                byType,
                bySeverity,
                topActors: Array.from(topActorsMap.values())
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5),
                topAffected: Array.from(topAffectedMap.values())
                    .sort((a, b) => b.affectedCount - a.affectedCount)
                    .slice(0, 5),
                dailyTrend: Array.from(dailyTrend.entries())
                    .map(([date, count]) => ({ date, count }))
                    .sort((a, b) => a.date.localeCompare(b.date)),
                peakActivityHour,
            };
            if (this.redis) {
                await this.redis.setex(cacheKey, this.STATS_CACHE_TTL, JSON.stringify(stats));
            }
            return stats;
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'project-activity.getStatistics' });
            throw error;
        }
    }
    /**
     * Export activities to various formats
     */
    async exportActivities(tenantId, projectId, format, filters) {
        try {
            // Fetch activities
            const page = await this.getActivities(tenantId, projectId, {
                ...filters,
                limit: 999999,
            });
            const activities = page.items;
            let data;
            let mimeType;
            let filename;
            if (format === 'csv') {
                data = this.exportAsCSV(activities);
                mimeType = 'text/csv';
                filename = `project-${projectId}-activities-${new Date().toISOString().split('T')[0]}.csv`;
            }
            else if (format === 'json') {
                data = JSON.stringify(activities, null, 2);
                mimeType = 'application/json';
                filename = `project-${projectId}-activities-${new Date().toISOString().split('T')[0]}.json`;
            }
            else {
                // PDF export - simplified; in real implementation would use PDF library
                data = this.exportAsPDF(activities);
                mimeType = 'application/pdf';
                filename = `project-${projectId}-activities-${new Date().toISOString().split('T')[0]}.pdf`;
            }
            return {
                format,
                data,
                mimeType,
                filename,
                generatedAt: new Date(),
                recordCount: activities.length,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'project-activity.exportActivities' });
            throw error;
        }
    }
    /**
     * Delete activities older than retention policy
     * Called periodically by scheduler
     */
    async cleanupOldActivities(tenantId) {
        try {
            const now = Date.now();
            let deletedCount = 0;
            // Query activities that have passed their TTL
            const query = `
        SELECT * FROM c
        ${tenantId ? 'WHERE c.tenantId = @tenantId AND' : 'WHERE'}
        DateAdd("second", c.ttl, c._ts * 1000) < @now
      `;
            const parameters = [{ name: '@now', value: now }];
            if (tenantId) {
                parameters.push({ name: '@tenantId', value: tenantId });
            }
            const querySpec = {
                query,
                parameters,
            };
            const { resources: expiredActivities } = await this.activitiesContainer.items
                .query(querySpec)
                .fetchAll();
            // Delete expired activities
            for (const activity of expiredActivities) {
                try {
                    await this.activitiesContainer.item(activity.id, tenantId || activity.tenantId).delete();
                    deletedCount++;
                }
                catch (error) {
                    this.monitoring.trackTrace(`Failed to delete activity ${activity.id}: ${error.message}`, SeverityLevel.Warning, { operation: 'project-activity.cleanupOldActivities', activityId: activity.id });
                }
            }
            if (deletedCount > 0) {
                this.monitoring.trackTrace(`Cleaned up ${deletedCount} expired activities${tenantId ? ` for tenant ${tenantId}` : ''}`, SeverityLevel.Information, { operation: 'project-activity.cleanupOldActivities', deletedCount, tenantId });
            }
            return deletedCount;
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'project-activity.cleanupOldActivities' });
            return 0;
        }
    }
    /**
     * Helper: Calculate TTL based on activity type and severity
     */
    calculateTTL(type, severity) {
        const typeOverride = this.DEFAULT_RETENTION_POLICY.typeOverrides[type];
        if (typeOverride) {
            return typeOverride;
        }
        const severityOverride = this.DEFAULT_RETENTION_POLICY.severityOverrides[severity];
        if (severityOverride) {
            return severityOverride;
        }
        return this.DEFAULT_RETENTION_POLICY.defaultTtlSeconds;
    }
    /**
     * Helper: Get relative time string
     */
    getRelativeTime(timestamp) {
        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) {
            return 'just now';
        }
        if (diffMins < 60) {
            return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        }
        if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        }
        if (diffDays < 30) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        }
        return timestamp.toLocaleDateString();
    }
    /**
     * Helper: Extract related resource from activity details
     */
    extractRelatedResource(activity) {
        if (activity.details?.shardId) {
            return {
                type: 'shard',
                id: activity.details.shardId,
                name: activity.details.shardName || 'Unknown Shard',
            };
        }
        if (activity.details?.userId || activity.affectedUserId) {
            return {
                type: 'collaborator',
                id: activity.details?.userId || activity.affectedUserId,
                name: activity.details?.displayName || activity.affectedUserDisplayName || 'Unknown User',
            };
        }
        if (activity.details?.snapshotId) {
            return {
                type: 'version',
                id: activity.details.snapshotId,
                name: activity.details.snapshotLabel || 'Version Snapshot',
            };
        }
        if (activity.details?.templateId) {
            return {
                type: 'template',
                id: activity.details.templateId,
                name: activity.details.templateName || 'Template',
            };
        }
        return undefined;
    }
    /**
     * Helper: Export as CSV
     */
    exportAsCSV(activities) {
        const headers = [
            'ID',
            'Timestamp',
            'Type',
            'Severity',
            'Actor',
            'Description',
            'Affected User',
        ];
        const rows = activities.map((a) => [
            a.id,
            a.timestamp.toISOString(),
            a.type,
            a.severity,
            `${a.actorDisplayName} (${a.actorUserId})`,
            a.description,
            a.affectedUserDisplayName || 'N/A',
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');
        return csvContent;
    }
    /**
     * Helper: Export as PDF (simplified)
     * In production, would use proper PDF library like pdfkit or puppeteer
     */
    exportAsPDF(activities) {
        // Simplified text-based PDF representation
        let content = `Project Activity Report
Generated: ${new Date().toISOString()}

Total Activities: ${activities.length}

Activities:
`;
        activities.forEach((activity) => {
            content += `\n${activity.timestamp.toISOString()} - ${activity.type}
By: ${activity.actorDisplayName}
Severity: ${activity.severity}
Description: ${activity.description}
`;
        });
        return content;
    }
    /**
     * Schedule periodic cleanup of expired activities
     */
    scheduleCleanup() {
        // Run cleanup every 6 hours
        const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000;
        this.cleanupIntervalId = setInterval(() => {
            this.cleanupOldActivities().catch((error) => {
                this.monitoring.trackException(error, { operation: 'project-activity.scheduleCleanup' });
            });
        }, CLEANUP_INTERVAL);
        this.monitoring.trackTrace('Activity cleanup scheduled every 6 hours', SeverityLevel.Information, {
            operation: 'project-activity.scheduleCleanup',
        });
    }
    /**
     * Cleanup method for graceful shutdown
     */
    shutdown() {
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = undefined;
        }
    }
}
//# sourceMappingURL=project-activity.service.js.map
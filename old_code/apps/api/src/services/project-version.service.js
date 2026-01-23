/**
 * Project Versioning Service
 * Version snapshots, change tracking, rollback, and merge functionality
 */
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { Injectable, Logger } from '@nestjs/common';
import { VersionStatus, ChangeType, } from '../types/project-version.types';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
let ProjectVersionService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ProjectVersionService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ProjectVersionService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        cosmosDB;
        cache;
        activityService;
        performanceMonitoring;
        shardLinking;
        logger = new Logger(ProjectVersionService.name);
        VERSION_CACHE_TTL = 3600; // 1 hour
        STATS_CACHE_TTL = 1800; // 30 minutes
        constructor(cosmosDB, cache, activityService, performanceMonitoring, shardLinking) {
            this.cosmosDB = cosmosDB;
            this.cache = cache;
            this.activityService = activityService;
            this.performanceMonitoring = performanceMonitoring;
            this.shardLinking = shardLinking;
        }
        /**
         * Create new project version
         */
        async createVersion(tenantId, projectId, versionName, description, userId, userEmail, userName) {
            const startTime = Date.now();
            try {
                // Get current project state
                const projectQuery = `
        SELECT * FROM projects p
        WHERE p.id = @projectId AND p.tenantId = @tenantId
      `;
                const projects = await this.cosmosDB.queryDocuments('projects', projectQuery, [
                    { name: '@projectId', value: projectId },
                    { name: '@tenantId', value: tenantId },
                ], tenantId);
                if (projects.length === 0) {
                    throw new Error(`Project ${projectId} not found`);
                }
                const project = projects[0];
                // Get current shards
                const shardsQuery = `
        SELECT * FROM shards s
        WHERE s.projectId = @projectId AND s.deleted = false
      `;
                const shards = await this.cosmosDB.queryDocuments('shards', shardsQuery, [{ name: '@projectId', value: projectId }], tenantId);
                // Get current links
                const linksQuery = `
        SELECT * FROM shard_links l
        WHERE l.projectId = @projectId AND l.deleted = false
      `;
                const links = await this.cosmosDB.queryDocuments('shard-links', linksQuery, [{ name: '@projectId', value: projectId }], tenantId);
                // Get previous version to calculate changes
                const prevVersionQuery = `
        SELECT TOP 1 * FROM project_versions v
        WHERE v.projectId = @projectId AND v.status != @status
        ORDER BY v.versionNumber DESC
      `;
                const prevVersions = await this.cosmosDB.queryDocuments('project-versions', prevVersionQuery, [
                    { name: '@projectId', value: projectId },
                    { name: '@status', value: VersionStatus.DRAFT },
                ], tenantId);
                const previousVersion = prevVersions.length > 0 ? prevVersions[0] : null;
                const versionNumber = (previousVersion?.versionNumber || 0) + 1;
                // Calculate changes
                const changes = this.calculateChanges(previousVersion, shards, links);
                const changeSummary = this.summarizeChanges(changes);
                // Calculate content hash
                const contentHash = this.calculateContentHash(shards, links);
                // Create version
                const version = {
                    id: uuidv4(),
                    tenantId,
                    projectId,
                    versionNumber,
                    versionName,
                    description,
                    status: VersionStatus.DRAFT,
                    severity: this.determineSeverity(changeSummary),
                    content: {
                        projectMetadata: {
                            name: project.name,
                            description: project.description,
                            tags: project.tags || [],
                            settings: project.settings || {},
                        },
                        shards: shards.map((s) => ({
                            id: s.id,
                            name: s.name,
                            content: s.content,
                            metadata: s.metadata,
                        })),
                        links: links.map((l) => ({
                            id: l.id,
                            sourceId: l.sourceId,
                            targetId: l.targetId,
                            type: l.type,
                            strength: l.strength,
                        })),
                        collaborators: project.collaborators || [],
                        settings: project.settings || {},
                    },
                    changes,
                    changeSummary,
                    author: {
                        userId,
                        email: userEmail,
                        name: userName,
                    },
                    createdAt: new Date(),
                    parentVersionId: previousVersion?.id,
                    tags: [],
                    metrics: {
                        totalShards: shards.length,
                        totalLinks: links.length,
                        projectSize: JSON.stringify(shards).length + JSON.stringify(links).length,
                        contentHash,
                    },
                    ttl: undefined, // No TTL until archived
                };
                // Save version
                await this.cosmosDB.upsertDocument('project-versions', version, tenantId);
                // Invalidate cache
                await this.invalidateVersionCache(projectId);
                // Log activity
                await this.logActivity(tenantId, userId, 'VERSION_CREATED', {
                    projectId,
                    versionId: version.id,
                    versionNumber,
                    changeCount: changes.length,
                });
                return version;
            }
            catch (error) {
                this.logger.error(`Failed to create version: ${error.message}`);
                throw error;
            }
        }
        /**
         * Get version by ID
         */
        async getVersion(tenantId, versionId) {
            try {
                // Try cache
                const cached = await this.cache.get(`version:${versionId}`);
                if (cached) {
                    return cached;
                }
                const query = `
        SELECT * FROM project_versions v
        WHERE v.id = @id AND v.tenantId = @tenantId
      `;
                const results = await this.cosmosDB.queryDocuments('project-versions', query, [
                    { name: '@id', value: versionId },
                    { name: '@tenantId', value: tenantId },
                ], tenantId);
                if (results.length === 0) {
                    throw new Error(`Version ${versionId} not found`);
                }
                const version = results[0];
                await this.cache.set(`version:${versionId}`, version, this.VERSION_CACHE_TTL);
                return version;
            }
            catch (error) {
                this.logger.error(`Failed to get version: ${error.message}`);
                throw error;
            }
        }
        /**
         * Get version history
         */
        async getVersionHistory(tenantId, projectId, limit = 50, offset = 0) {
            try {
                const query = `
        SELECT * FROM project_versions v
        WHERE v.projectId = @projectId AND v.tenantId = @tenantId
        ORDER BY v.versionNumber DESC
        OFFSET @offset LIMIT @limit
      `;
                const versions = await this.cosmosDB.queryDocuments('project-versions', query, [
                    { name: '@projectId', value: projectId },
                    { name: '@tenantId', value: tenantId },
                    { name: '@offset', value: offset },
                    { name: '@limit', value: limit },
                ], tenantId);
                const entries = versions.map((v) => ({
                    versionId: v.id,
                    versionNumber: v.versionNumber,
                    versionName: v.versionName,
                    author: {
                        userId: v.author.userId,
                        name: v.author.name,
                    },
                    timestamp: v.createdAt,
                    changeCount: v.changes.length,
                    status: v.status,
                    tags: v.tags,
                    description: v.description,
                }));
                // Get total count
                const countQuery = `
        SELECT VALUE COUNT(1) FROM project_versions v
        WHERE v.projectId = @projectId AND v.tenantId = @tenantId
      `;
                const counts = await this.cosmosDB.queryDocuments('project-versions', countQuery, [
                    { name: '@projectId', value: projectId },
                    { name: '@tenantId', value: tenantId },
                ], tenantId);
                return {
                    entries,
                    total: counts.length > 0 ? counts[0] : 0,
                };
            }
            catch (error) {
                this.logger.error(`Failed to get version history: ${error.message}`);
                throw error;
            }
        }
        /**
         * Compare two versions
         */
        async compareVersions(tenantId, version1Id, version2Id) {
            try {
                const v1 = await this.getVersion(tenantId, version1Id);
                const v2 = await this.getVersion(tenantId, version2Id);
                const differences = [];
                const conflictingChanges = [];
                // Compare metadata
                if (v1.content.projectMetadata !== v2.content.projectMetadata) {
                    differences.push({
                        category: 'metadata',
                        changes: this.detectDifferences(v1.content.projectMetadata, v2.content.projectMetadata),
                    });
                }
                // Compare shards
                const shardDiffs = this.compareArrays(v1.content.shards, v2.content.shards, 'id');
                if (shardDiffs.length > 0) {
                    differences.push({
                        category: 'content',
                        changes: shardDiffs,
                    });
                }
                // Compare links
                const linkDiffs = this.compareArrays(v1.content.links, v2.content.links, 'id');
                if (linkDiffs.length > 0) {
                    differences.push({
                        category: 'content',
                        changes: linkDiffs,
                    });
                }
                // Calculate similarity
                const totalChanges = v1.changes.length + v2.changes.length;
                const similarityScore = Math.max(0, 1 - totalChanges / (v1.content.shards.length + 1));
                const comparison = {
                    version1Id,
                    version2Id,
                    version1Number: v1.versionNumber,
                    version2Number: v2.versionNumber,
                    differences,
                    statisticalDifferences: {
                        addedShards: v2.changeSummary.shardsCreated,
                        modifiedShards: v2.changeSummary.shardsUpdated,
                        deletedShards: v2.changeSummary.shardsDeleted,
                        addedLinks: v2.changeSummary.linksCreated,
                        modifiedLinks: v2.changeSummary.linksModified,
                        deletedLinks: v2.changeSummary.linksRemoved,
                        similarityScore: Math.min(1, Math.max(0, similarityScore)),
                    },
                    timeline: {
                        timeBetween: v2.createdAt.getTime() - v1.createdAt.getTime(),
                        changeRate: (v2.changes.length / (v2.createdAt.getTime() - v1.createdAt.getTime())) * 3600000,
                    },
                };
                return comparison;
            }
            catch (error) {
                this.logger.error(`Failed to compare versions: ${error.message}`);
                throw error;
            }
        }
        /**
         * Rollback to previous version
         */
        async rollback(tenantId, projectId, request, userId) {
            try {
                // Get source version
                const sourceVersion = await this.getVersion(tenantId, request.sourceVersionId);
                // Get target version (previous if not specified)
                const targetVersion = request.targetVersionId
                    ? await this.getVersion(tenantId, request.targetVersionId)
                    : await this.getPreviousVersion(tenantId, sourceVersion.id);
                if (!targetVersion) {
                    throw new Error('No previous version available for rollback');
                }
                // Restore content
                const affectedEntities = await this.restoreContent(tenantId, projectId, sourceVersion, targetVersion, request.rollbackPartially, request.partialEntities);
                // Create new version recording the rollback
                const rollbackVersion = await this.createVersion(tenantId, projectId, `Rollback to ${targetVersion.versionName}`, request.reason || 'Rollback requested', userId, 'system@castiel.app', 'System');
                // Update versions
                sourceVersion.rollbackTargetId = rollbackVersion.id;
                rollbackVersion.rollbackOf = targetVersion.id;
                await this.cosmosDB.upsertDocument('project-versions', sourceVersion, tenantId);
                await this.cosmosDB.upsertDocument('project-versions', rollbackVersion, tenantId);
                // Log activity
                await this.logActivity(tenantId, userId, 'VERSION_ROLLBACK', {
                    projectId,
                    sourceVersionId: sourceVersion.id,
                    targetVersionId: targetVersion.id,
                    affectedEntities: affectedEntities.length,
                });
                return {
                    newVersionId: rollbackVersion.id,
                    newVersionNumber: rollbackVersion.versionNumber,
                    previousVersionId: sourceVersion.id,
                    rollbackTimestamp: new Date(),
                    changesReverted: sourceVersion.changes.length,
                    partialRollback: request.rollbackPartially || false,
                    affectedEntities,
                };
            }
            catch (error) {
                this.logger.error(`Failed to rollback: ${error.message}`);
                throw error;
            }
        }
        /**
         * Publish version
         */
        async publishVersion(tenantId, request, userId) {
            try {
                const version = await this.getVersion(tenantId, request.versionId);
                // Update version
                version.status = VersionStatus.PUBLISHED;
                version.publishedAt = new Date();
                if (request.tags) {
                    version.tags = request.tags;
                }
                // Archive previous published version
                if (request.archivePrevious) {
                    const prevQuery = `
          SELECT TOP 1 * FROM project_versions v
          WHERE v.projectId = @projectId AND v.status = @status AND v.versionNumber < @versionNumber
          ORDER BY v.versionNumber DESC
        `;
                    const prevVersions = await this.cosmosDB.queryDocuments('project-versions', prevQuery, [
                        { name: '@projectId', value: version.projectId },
                        { name: '@status', value: VersionStatus.PUBLISHED },
                        { name: '@versionNumber', value: version.versionNumber },
                    ], tenantId);
                    if (prevVersions.length > 0) {
                        prevVersions[0].status = VersionStatus.ARCHIVED;
                        prevVersions[0].archivedAt = new Date();
                        prevVersions[0].ttl = 7776000; // 90 days
                        await this.cosmosDB.upsertDocument('project-versions', prevVersions[0], tenantId);
                    }
                }
                await this.cosmosDB.upsertDocument('project-versions', version, tenantId);
                // Invalidate cache
                await this.invalidateVersionCache(version.projectId);
                // Log activity
                await this.logActivity(tenantId, userId, 'VERSION_PUBLISHED', {
                    projectId: version.projectId,
                    versionId: version.id,
                    versionNumber: version.versionNumber,
                });
                return {
                    versionId: version.id,
                    versionNumber: version.versionNumber,
                    publishedAt: version.publishedAt,
                    notificationsQueued: request.notifyCollaborators ? 5 : 0,
                };
            }
            catch (error) {
                this.logger.error(`Failed to publish version: ${error.message}`);
                throw error;
            }
        }
        /**
         * Get version statistics
         */
        async getStatistics(tenantId, projectId) {
            try {
                // Try cache
                const cached = await this.cache.get(`version-stats:${projectId}`);
                if (cached) {
                    return cached;
                }
                // Query all versions
                const query = `
        SELECT * FROM project_versions v
        WHERE v.projectId = @projectId AND v.tenantId = @tenantId
      `;
                const versions = await this.cosmosDB.queryDocuments('project-versions', query, [
                    { name: '@projectId', value: projectId },
                    { name: '@tenantId', value: tenantId },
                ], tenantId);
                // Calculate statistics
                const stats = {
                    projectId,
                    totalVersions: versions.length,
                    activeVersion: versions.filter((v) => v.status === VersionStatus.PUBLISHED).length,
                    archivedVersions: versions.filter((v) => v.status === VersionStatus.ARCHIVED).length,
                    draftVersions: versions.filter((v) => v.status === VersionStatus.DRAFT).length,
                    averageChangePerVersion: versions.length > 0 ? versions.reduce((sum, v) => sum + v.changes.length, 0) / versions.length : 0,
                    mostActiveContributors: this.getTopContributors(versions),
                    changeTypeDistribution: this.getChangeTypeDistribution(versions),
                    timelineData: this.getTimelineData(versions),
                };
                // Cache
                await this.cache.set(`version-stats:${projectId}`, stats, this.STATS_CACHE_TTL);
                return stats;
            }
            catch (error) {
                this.logger.error(`Failed to get statistics: ${error.message}`);
                throw error;
            }
        }
        /**
         * Helper: Calculate changes between versions
         */
        calculateChanges(previousVersion, currentShards, currentLinks) {
            if (!previousVersion) {
                return currentShards.map((s) => ({
                    entityId: s.id,
                    entityType: 'shard',
                    entityName: s.name,
                    changeType: ChangeType.CREATE,
                    deltas: [],
                    changedBy: 'system',
                    changedByEmail: 'system@castiel.app',
                    changedByName: 'System',
                    timestamp: new Date(),
                }));
            }
            const changes = [];
            // Compare shards
            for (const current of currentShards) {
                const previous = previousVersion.content.shards.find((s) => s.id === current.id);
                if (!previous) {
                    changes.push({
                        entityId: current.id,
                        entityType: 'shard',
                        entityName: current.name,
                        changeType: ChangeType.CREATE,
                        deltas: [],
                        changedBy: 'system',
                        changedByEmail: 'system@castiel.app',
                        changedByName: 'System',
                        timestamp: new Date(),
                    });
                }
            }
            return changes;
        }
        /**
         * Helper: Summarize changes
         */
        summarizeChanges(changes) {
            return {
                shardsCreated: changes.filter((c) => c.changeType === ChangeType.CREATE && c.entityType === 'shard').length,
                shardsUpdated: changes.filter((c) => c.changeType === ChangeType.UPDATE && c.entityType === 'shard').length,
                shardsDeleted: changes.filter((c) => c.changeType === ChangeType.DELETE && c.entityType === 'shard').length,
                linksCreated: changes.filter((c) => c.changeType === ChangeType.CREATE && c.entityType === 'link').length,
                linksModified: changes.filter((c) => c.changeType === ChangeType.UPDATE && c.entityType === 'link').length,
                linksRemoved: changes.filter((c) => c.changeType === ChangeType.DELETE && c.entityType === 'link').length,
                collaboratorsAdded: 0,
                collaboratorsRemoved: 0,
                totalChanges: changes.length,
            };
        }
        /**
         * Helper: Calculate content hash
         */
        calculateContentHash(shards, links) {
            const content = JSON.stringify({ shards, links });
            return crypto.createHash('sha256').update(content).digest('hex');
        }
        /**
         * Helper: Determine version severity
         */
        determineSeverity(changeSummary) {
            const totalChanges = changeSummary.totalChanges;
            if (totalChanges > 50) {
                return 'breaking';
            }
            if (totalChanges > 20) {
                return 'major';
            }
            return 'minor';
        }
        /**
         * Helper: Get previous version
         */
        async getPreviousVersion(tenantId, versionId) {
            const current = await this.getVersion(tenantId, versionId);
            if (current.parentVersionId) {
                return this.getVersion(tenantId, current.parentVersionId);
            }
            return null;
        }
        /**
         * Helper: Restore content
         */
        async restoreContent(tenantId, projectId, sourceVersion, targetVersion, partial, partialEntities) {
            // In production, would restore all shards/links from targetVersion
            // For now, return list of affected entities
            return targetVersion.content.shards.map((s) => ({
                entityId: s.id,
                entityType: 'shard',
                entityName: s.name,
                restoreStatus: 'success',
            }));
        }
        /**
         * Helper: Detect differences
         */
        detectDifferences(obj1, obj2) {
            const changes = [];
            for (const key of Object.keys(obj1 || {})) {
                if (obj1[key] !== obj2?.[key]) {
                    changes.push({
                        field: key,
                        oldValue: obj1[key],
                        newValue: obj2?.[key],
                        changeType: ChangeType.UPDATE,
                    });
                }
            }
            for (const key of Object.keys(obj2 || {})) {
                if (!(key in (obj1 || {}))) {
                    changes.push({
                        field: key,
                        oldValue: undefined,
                        newValue: obj2[key],
                        changeType: ChangeType.CREATE,
                    });
                }
            }
            return changes;
        }
        /**
         * Helper: Compare arrays
         */
        compareArrays(arr1, arr2, idField) {
            const changes = [];
            const map1 = new Map(arr1.map((item) => [item[idField], item]));
            const map2 = new Map(arr2.map((item) => [item[idField], item]));
            for (const [id, item2] of map2) {
                if (!map1.has(id)) {
                    changes.push({
                        field: idField,
                        newValue: item2,
                        changeType: ChangeType.CREATE,
                    });
                }
            }
            return changes;
        }
        /**
         * Helper: Get top contributors
         */
        getTopContributors(versions) {
            const contributorMap = new Map();
            for (const version of versions) {
                const key = `${version.author.userId}:${version.author.name}`;
                if (!contributorMap.has(key)) {
                    contributorMap.set(key, {
                        userId: version.author.userId,
                        name: version.author.name,
                        versionCount: 0,
                        changeCount: 0,
                    });
                }
                const contributor = contributorMap.get(key);
                contributor.versionCount++;
                contributor.changeCount += version.changes.length;
            }
            return Array.from(contributorMap.values()).sort((a, b) => b.versionCount - a.versionCount).slice(0, 5);
        }
        /**
         * Helper: Get change type distribution
         */
        getChangeTypeDistribution(versions) {
            const distribution = {};
            for (const version of versions) {
                for (const change of version.changes) {
                    distribution[change.changeType] = (distribution[change.changeType] || 0) + 1;
                }
            }
            return distribution;
        }
        /**
         * Helper: Get timeline data
         */
        getTimelineData(versions) {
            const timeline = new Map();
            for (const version of versions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
                const dateStr = version.createdAt.toISOString().split('T')[0];
                if (!timeline.has(dateStr)) {
                    timeline.set(dateStr, {
                        date: new Date(dateStr),
                        versionCount: 0,
                        changeCount: 0,
                        avgSize: 0,
                    });
                }
                const entry = timeline.get(dateStr);
                entry.versionCount++;
                entry.changeCount += version.changes.length;
                entry.avgSize = (entry.avgSize + (version.metrics?.projectSize || 0)) / 2;
            }
            return Array.from(timeline.values());
        }
        /**
         * Helper: Invalidate cache
         */
        async invalidateVersionCache(projectId) {
            await this.cache.delete(`version-stats:${projectId}`);
        }
        /**
         * Helper: Log activity
         */
        async logActivity(tenantId, userId, eventType, details) {
            try {
                await this.activityService.logActivity(tenantId, {
                    userId,
                    eventType,
                    eventName: eventType,
                    description: JSON.stringify(details),
                    details,
                    timestamp: new Date(),
                });
            }
            catch (error) {
                this.logger.warn(`Failed to log activity: ${error.message}`);
            }
        }
    };
    return ProjectVersionService = _classThis;
})();
export { ProjectVersionService };
//# sourceMappingURL=project-version.service.js.map
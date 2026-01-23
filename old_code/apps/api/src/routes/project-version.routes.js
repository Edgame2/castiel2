/**
 * Project Versioning Routes
 * API endpoints for version management, comparison, and rollback
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiOperation, ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectVersion, RollbackResult, VersionComparison, VersionStatistics, PublishVersionResponse, } from '../types/project-version.types';
import { Logger } from '@nestjs/common';
let ProjectVersionRoutes = (() => {
    let _classDecorators = [Controller('api/v1/projects/:projectId/versions'), UseGuards(JwtAuthGuard), ApiBearerAuth(), ApiTags('Project Versioning')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _createVersion_decorators;
    let _getVersion_decorators;
    let _getVersionHistory_decorators;
    let _compareVersions_decorators;
    let _rollback_decorators;
    let _publishVersion_decorators;
    let _getStatistics_decorators;
    let _getChangelog_decorators;
    let _getVersionDiff_decorators;
    var ProjectVersionRoutes = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _createVersion_decorators = [Post(), ApiOperation({
                    summary: 'Create version',
                    description: 'Creates a new version snapshot of the current project state',
                }), ApiResponse({
                    status: 201,
                    description: 'Version created successfully',
                    type: ProjectVersion,
                }), ApiResponse({ status: 400, description: 'Invalid version data' }), ApiResponse({ status: 401, description: 'Unauthorized' })];
            _getVersion_decorators = [Get(':versionId'), ApiOperation({
                    summary: 'Get version',
                    description: 'Retrieves a specific version of the project by ID',
                }), ApiResponse({
                    status: 200,
                    description: 'Version retrieved successfully',
                    type: ProjectVersion,
                }), ApiResponse({ status: 404, description: 'Version not found' }), ApiResponse({ status: 401, description: 'Unauthorized' })];
            _getVersionHistory_decorators = [Get(), ApiOperation({
                    summary: 'Get version history',
                    description: 'Retrieves the version history timeline for a project',
                }), ApiResponse({
                    status: 200,
                    description: 'Version history retrieved successfully',
                }), ApiResponse({ status: 401, description: 'Unauthorized' })];
            _compareVersions_decorators = [Post('compare'), ApiOperation({
                    summary: 'Compare versions',
                    description: 'Compares two versions and returns detailed differences',
                }), ApiResponse({
                    status: 200,
                    description: 'Comparison completed successfully',
                    type: VersionComparison,
                }), ApiResponse({ status: 400, description: 'Invalid version IDs' }), ApiResponse({ status: 401, description: 'Unauthorized' })];
            _rollback_decorators = [Post('rollback'), ApiOperation({
                    summary: 'Rollback to version',
                    description: 'Rolls back the project to a previous version state',
                }), ApiResponse({
                    status: 200,
                    description: 'Rollback completed successfully',
                    type: RollbackResult,
                }), ApiResponse({ status: 400, description: 'Invalid rollback parameters' }), ApiResponse({ status: 401, description: 'Unauthorized' })];
            _publishVersion_decorators = [Post(':versionId/publish'), ApiOperation({
                    summary: 'Publish version',
                    description: 'Publishes a version as the current active version',
                }), ApiResponse({
                    status: 200,
                    description: 'Version published successfully',
                    type: PublishVersionResponse,
                }), ApiResponse({ status: 404, description: 'Version not found' }), ApiResponse({ status: 401, description: 'Unauthorized' })];
            _getStatistics_decorators = [Get(':versionId/statistics'), ApiOperation({
                    summary: 'Get version statistics',
                    description: 'Retrieves analytics and statistics for project versions',
                }), ApiResponse({
                    status: 200,
                    description: 'Statistics retrieved successfully',
                    type: VersionStatistics,
                }), ApiResponse({ status: 401, description: 'Unauthorized' })];
            _getChangelog_decorators = [Get(':versionId/changelog'), ApiOperation({
                    summary: 'Get changelog',
                    description: 'Retrieves detailed changelog for a specific version',
                }), ApiResponse({
                    status: 200,
                    description: 'Changelog retrieved successfully',
                }), ApiResponse({ status: 404, description: 'Version not found' })];
            _getVersionDiff_decorators = [Get(':versionId/diff'), ApiOperation({
                    summary: 'Get version diff',
                    description: 'Gets detailed diff viewer output for a version',
                }), ApiResponse({
                    status: 200,
                    description: 'Diff retrieved successfully',
                })];
            __esDecorate(this, null, _createVersion_decorators, { kind: "method", name: "createVersion", static: false, private: false, access: { has: obj => "createVersion" in obj, get: obj => obj.createVersion }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getVersion_decorators, { kind: "method", name: "getVersion", static: false, private: false, access: { has: obj => "getVersion" in obj, get: obj => obj.getVersion }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getVersionHistory_decorators, { kind: "method", name: "getVersionHistory", static: false, private: false, access: { has: obj => "getVersionHistory" in obj, get: obj => obj.getVersionHistory }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _compareVersions_decorators, { kind: "method", name: "compareVersions", static: false, private: false, access: { has: obj => "compareVersions" in obj, get: obj => obj.compareVersions }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _rollback_decorators, { kind: "method", name: "rollback", static: false, private: false, access: { has: obj => "rollback" in obj, get: obj => obj.rollback }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _publishVersion_decorators, { kind: "method", name: "publishVersion", static: false, private: false, access: { has: obj => "publishVersion" in obj, get: obj => obj.publishVersion }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getStatistics_decorators, { kind: "method", name: "getStatistics", static: false, private: false, access: { has: obj => "getStatistics" in obj, get: obj => obj.getStatistics }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getChangelog_decorators, { kind: "method", name: "getChangelog", static: false, private: false, access: { has: obj => "getChangelog" in obj, get: obj => obj.getChangelog }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getVersionDiff_decorators, { kind: "method", name: "getVersionDiff", static: false, private: false, access: { has: obj => "getVersionDiff" in obj, get: obj => obj.getVersionDiff }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ProjectVersionRoutes = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        versionService = __runInitializers(this, _instanceExtraInitializers);
        logger = new Logger(ProjectVersionRoutes.name);
        constructor(versionService) {
            this.versionService = versionService;
        }
        /**
         * POST /
         * Create new version
         */
        async createVersion(projectId, body, user, tenantId) {
            try {
                // Validation
                if (!body.versionName || body.versionName.trim().length === 0) {
                    throw new Error('Version name is required');
                }
                if (body.versionName.length > 200) {
                    throw new Error('Version name exceeds maximum length of 200 characters');
                }
                const version = await this.versionService.createVersion(tenantId, projectId, body.versionName, body.description || '', user.id, user.email, user.name);
                this.logger.log(`Version created: ${version.versionNumber}`);
                return version;
            }
            catch (error) {
                this.logger.error(`Failed to create version: ${error.message}`);
                throw error;
            }
        }
        /**
         * GET /:versionId
         * Get version by ID
         */
        async getVersion(projectId, versionId, tenantId) {
            try {
                const version = await this.versionService.getVersion(tenantId, versionId);
                // Verify project access
                if (version.projectId !== projectId) {
                    throw new Error('Version does not belong to this project');
                }
                return version;
            }
            catch (error) {
                this.logger.error(`Failed to get version: ${error.message}`);
                throw error;
            }
        }
        /**
         * GET /
         * Get version history
         */
        async getVersionHistory(projectId, limit = 50, offset = 0, tenantId) {
            try {
                // Validation
                if (limit < 1 || limit > 100) {
                    throw new Error('Limit must be between 1 and 100');
                }
                if (offset < 0) {
                    throw new Error('Offset must be non-negative');
                }
                const history = await this.versionService.getVersionHistory(tenantId, projectId, limit, offset);
                return history;
            }
            catch (error) {
                this.logger.error(`Failed to get version history: ${error.message}`);
                throw error;
            }
        }
        /**
         * POST /compare
         * Compare two versions
         */
        async compareVersions(projectId, body, tenantId) {
            try {
                // Validation
                if (!body.version1Id || !body.version2Id) {
                    throw new Error('Both version IDs are required');
                }
                if (body.version1Id === body.version2Id) {
                    throw new Error('Cannot compare a version with itself');
                }
                const comparison = await this.versionService.compareVersions(tenantId, body.version1Id, body.version2Id);
                // Verify project
                if (comparison.version1Number && comparison.version2Number) {
                    // Project access verified via service
                }
                return comparison;
            }
            catch (error) {
                this.logger.error(`Failed to compare versions: ${error.message}`);
                throw error;
            }
        }
        /**
         * POST /rollback
         * Rollback to previous version
         */
        async rollback(projectId, body, user, tenantId) {
            try {
                // Validation
                if (!body.sourceVersionId) {
                    throw new Error('Source version ID is required');
                }
                const result = await this.versionService.rollback(tenantId, projectId, body, user.id);
                this.logger.log(`Rollback completed: ${result.changesReverted} changes reverted`);
                return result;
            }
            catch (error) {
                this.logger.error(`Failed to rollback: ${error.message}`);
                throw error;
            }
        }
        /**
         * POST /:versionId/publish
         * Publish version
         */
        async publishVersion(projectId, versionId, body, user, tenantId) {
            try {
                const result = await this.versionService.publishVersion(tenantId, {
                    versionId,
                    releaseNotes: body.releaseNotes,
                    tags: body.tags,
                    notifyCollaborators: true,
                    archivePrevious: true,
                }, user.id);
                this.logger.log(`Version published: ${result.versionNumber}`);
                return result;
            }
            catch (error) {
                this.logger.error(`Failed to publish version: ${error.message}`);
                throw error;
            }
        }
        /**
         * GET /statistics
         * Get version statistics
         */
        async getStatistics(projectId, tenantId) {
            try {
                const stats = await this.versionService.getStatistics(tenantId, projectId);
                return stats;
            }
            catch (error) {
                this.logger.error(`Failed to get statistics: ${error.message}`);
                throw error;
            }
        }
        /**
         * GET /:versionId/changelog
         * Get changelog between versions
         */
        async getChangelog(projectId, versionId, format = 'json', tenantId) {
            try {
                // Validation
                if (!['json', 'markdown', 'html'].includes(format)) {
                    throw new Error('Format must be json, markdown, or html');
                }
                const version = await this.versionService.getVersion(tenantId, versionId);
                if (version.projectId !== projectId) {
                    throw new Error('Version does not belong to this project');
                }
                // Format changelog
                let changelog;
                switch (format) {
                    case 'markdown':
                        changelog = this.formatChangelogMarkdown(version);
                        break;
                    case 'html':
                        changelog = this.formatChangelogHtml(version);
                        break;
                    default:
                        changelog = {
                            versionNumber: version.versionNumber,
                            versionName: version.versionName,
                            description: version.description,
                            changes: version.changeSummary,
                            timestamp: version.createdAt,
                        };
                }
                return changelog;
            }
            catch (error) {
                this.logger.error(`Failed to get changelog: ${error.message}`);
                throw error;
            }
        }
        /**
         * GET /:versionId/diff
         * Get diff between two versions
         */
        async getVersionDiff(projectId, versionId, compareWith, format = 'unified', tenantId) {
            try {
                const version = await this.versionService.getVersion(tenantId, versionId);
                if (version.projectId !== projectId) {
                    throw new Error('Version does not belong to this project');
                }
                if (!compareWith) {
                    compareWith = version.parentVersionId;
                }
                if (!compareWith) {
                    throw new Error('No version to compare with');
                }
                const comparison = await this.versionService.compareVersions(tenantId, compareWith, versionId);
                return {
                    format,
                    comparison,
                    statistics: comparison.statisticalDifferences,
                };
            }
            catch (error) {
                this.logger.error(`Failed to get diff: ${error.message}`);
                throw error;
            }
        }
        /**
         * Helper: Format changelog as Markdown
         */
        formatChangelogMarkdown(version) {
            let md = `# Version ${version.versionNumber}: ${version.versionName}\n\n`;
            if (version.description) {
                md += `${version.description}\n\n`;
            }
            md += `**Release Date:** ${version.createdAt.toLocaleDateString()}\n`;
            md += `**Author:** ${version.author.name}\n\n`;
            md += `## Changes\n\n`;
            md += `- **Shards Created:** ${version.changeSummary.shardsCreated}\n`;
            md += `- **Shards Updated:** ${version.changeSummary.shardsUpdated}\n`;
            md += `- **Shards Deleted:** ${version.changeSummary.shardsDeleted}\n`;
            md += `- **Links Created:** ${version.changeSummary.linksCreated}\n`;
            md += `- **Total Changes:** ${version.changeSummary.totalChanges}\n`;
            return md;
        }
        /**
         * Helper: Format changelog as HTML
         */
        formatChangelogHtml(version) {
            return `<div class="changelog">
      <h1>Version ${version.versionNumber}: ${version.versionName}</h1>
      <p>${version.description || 'No description'}</p>
      <dl>
        <dt>Release Date</dt>
        <dd>${version.createdAt.toLocaleDateString()}</dd>
        <dt>Author</dt>
        <dd>${version.author.name}</dd>
      </dl>
      <h2>Changes</h2>
      <ul>
        <li>Shards Created: ${version.changeSummary.shardsCreated}</li>
        <li>Shards Updated: ${version.changeSummary.shardsUpdated}</li>
        <li>Shards Deleted: ${version.changeSummary.shardsDeleted}</li>
        <li>Links Created: ${version.changeSummary.linksCreated}</li>
        <li>Total Changes: ${version.changeSummary.totalChanges}</li>
      </ul>
    </div>`;
        }
    };
    return ProjectVersionRoutes = _classThis;
})();
export { ProjectVersionRoutes };
//# sourceMappingURL=project-version.routes.js.map
/**
 * Shard Linking Routes
 * API endpoints for shard relationship management
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
import { Controller, Get, Post, Patch, Delete, HttpCode, HttpStatus, UseGuards, UseFilters, } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ShardLink, BulkLinkResult, ShardWithLinks, LinkPage, LinkStatistics, LinkValidationResult, LinkImpactAnalysis, } from '../types/shard-linking.types';
import { AuthGuard } from '../guards/auth.guard';
import { RoleGuard } from '../guards/role.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';
let ShardLinkingController = (() => {
    let _classDecorators = [ApiTags('Shard Linking'), ApiBearerAuth(), Controller('api/v1/shards/links'), UseGuards(AuthGuard, TenantGuard), UseFilters(AllExceptionsFilter)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _createLink_decorators;
    let _bulkCreateLinks_decorators;
    let _bulkCreateLinksMultiProject_decorators;
    let _validateLink_decorators;
    let _getLink_decorators;
    let _getLinks_decorators;
    let _getShardWithLinks_decorators;
    let _getLinkStatistics_decorators;
    let _analyzeLinkImpact_decorators;
    let _updateLink_decorators;
    let _recordLinkAccess_decorators;
    let _rateLink_decorators;
    let _deleteLink_decorators;
    var ShardLinkingController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _createLink_decorators = [Post(), UseGuards(RoleGuard), HttpCode(HttpStatus.CREATED), ApiOperation({ summary: 'Create a link between two shards' }), ApiResponse({
                    status: 201,
                    description: 'Link created successfully',
                    type: ShardLink,
                }), ApiResponse({
                    status: 400,
                    description: 'Invalid input or validation error',
                })];
            _bulkCreateLinks_decorators = [Post('bulk'), UseGuards(RoleGuard), HttpCode(HttpStatus.CREATED), ApiOperation({ summary: 'Bulk create links' }), ApiResponse({
                    status: 201,
                    description: 'Bulk operation completed',
                    type: BulkLinkResult,
                })];
            _bulkCreateLinksMultiProject_decorators = [Post('bulk-multi-project'), UseGuards(RoleGuard), HttpCode(HttpStatus.CREATED), ApiOperation({ summary: 'Bulk create links across multiple projects' }), ApiResponse({
                    status: 201,
                    description: 'Multi-project bulk operation completed',
                    type: BulkLinkResult,
                })];
            _validateLink_decorators = [Get('validate'), ApiOperation({ summary: 'Validate link parameters' }), ApiQuery({ name: 'fromShardId', required: true }), ApiQuery({ name: 'toShardId', required: true }), ApiQuery({ name: 'relationshipType', required: true }), ApiResponse({
                    status: 200,
                    description: 'Link validation result',
                    type: LinkValidationResult,
                })];
            _getLink_decorators = [Get(':linkId'), ApiOperation({ summary: 'Get link by ID' }), ApiParam({ name: 'linkId', description: 'Link ID' }), ApiResponse({
                    status: 200,
                    description: 'Link details',
                    type: ShardLink,
                }), ApiResponse({
                    status: 404,
                    description: 'Link not found',
                })];
            _getLinks_decorators = [Get(), ApiOperation({ summary: 'Query links with filters' }), ApiQuery({ name: 'projectId', required: true }), ApiQuery({ name: 'page', required: false, type: Number }), ApiQuery({ name: 'limit', required: false, type: Number }), ApiQuery({ name: 'fromShardId', required: false }), ApiQuery({ name: 'toShardId', required: false }), ApiQuery({ name: 'relationshipTypes', required: false }), ApiQuery({ name: 'sortBy', required: false }), ApiQuery({ name: 'sortDirection', required: false }), ApiResponse({
                    status: 200,
                    description: 'Paginated link results',
                    type: LinkPage,
                })];
            _getShardWithLinks_decorators = [Get('shards/:shardId/with-links'), ApiOperation({ summary: 'Get shard with all its links' }), ApiParam({ name: 'shardId', description: 'Shard ID' }), ApiQuery({ name: 'projectId', required: true }), ApiResponse({
                    status: 200,
                    description: 'Shard with links',
                    type: ShardWithLinks,
                })];
            _getLinkStatistics_decorators = [Get('statistics'), ApiOperation({ summary: 'Get link statistics' }), ApiQuery({ name: 'projectId', required: true }), ApiResponse({
                    status: 200,
                    description: 'Link statistics',
                    type: LinkStatistics,
                })];
            _analyzeLinkImpact_decorators = [Get(':linkId/impact'), ApiOperation({ summary: 'Analyze link deletion impact' }), ApiParam({ name: 'linkId', description: 'Link ID' }), ApiQuery({ name: 'projectId', required: true }), ApiResponse({
                    status: 200,
                    description: 'Impact analysis',
                    type: LinkImpactAnalysis,
                })];
            _updateLink_decorators = [Patch(':linkId'), UseGuards(RoleGuard), HttpCode(HttpStatus.OK), ApiOperation({ summary: 'Update a link' }), ApiParam({ name: 'linkId', description: 'Link ID' }), ApiResponse({
                    status: 200,
                    description: 'Link updated successfully',
                    type: ShardLink,
                }), ApiResponse({
                    status: 404,
                    description: 'Link not found',
                })];
            _recordLinkAccess_decorators = [Post(':linkId/access'), HttpCode(HttpStatus.NO_CONTENT), ApiOperation({ summary: 'Record link access' }), ApiParam({ name: 'linkId', description: 'Link ID' }), ApiQuery({ name: 'projectId', required: true }), ApiResponse({
                    status: 204,
                    description: 'Access recorded',
                })];
            _rateLink_decorators = [Post(':linkId/rate'), HttpCode(HttpStatus.NO_CONTENT), ApiOperation({ summary: 'Rate a link' }), ApiParam({ name: 'linkId', description: 'Link ID' }), ApiQuery({ name: 'projectId', required: true }), ApiQuery({ name: 'rating', required: true, type: Number }), ApiResponse({
                    status: 204,
                    description: 'Link rated',
                })];
            _deleteLink_decorators = [Delete(':linkId'), UseGuards(RoleGuard), HttpCode(HttpStatus.NO_CONTENT), ApiOperation({ summary: 'Delete a link' }), ApiParam({ name: 'linkId', description: 'Link ID' }), ApiQuery({ name: 'projectId', required: true }), ApiResponse({
                    status: 204,
                    description: 'Link deleted',
                }), ApiResponse({
                    status: 404,
                    description: 'Link not found',
                })];
            __esDecorate(this, null, _createLink_decorators, { kind: "method", name: "createLink", static: false, private: false, access: { has: obj => "createLink" in obj, get: obj => obj.createLink }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _bulkCreateLinks_decorators, { kind: "method", name: "bulkCreateLinks", static: false, private: false, access: { has: obj => "bulkCreateLinks" in obj, get: obj => obj.bulkCreateLinks }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _bulkCreateLinksMultiProject_decorators, { kind: "method", name: "bulkCreateLinksMultiProject", static: false, private: false, access: { has: obj => "bulkCreateLinksMultiProject" in obj, get: obj => obj.bulkCreateLinksMultiProject }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _validateLink_decorators, { kind: "method", name: "validateLink", static: false, private: false, access: { has: obj => "validateLink" in obj, get: obj => obj.validateLink }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getLink_decorators, { kind: "method", name: "getLink", static: false, private: false, access: { has: obj => "getLink" in obj, get: obj => obj.getLink }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getLinks_decorators, { kind: "method", name: "getLinks", static: false, private: false, access: { has: obj => "getLinks" in obj, get: obj => obj.getLinks }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getShardWithLinks_decorators, { kind: "method", name: "getShardWithLinks", static: false, private: false, access: { has: obj => "getShardWithLinks" in obj, get: obj => obj.getShardWithLinks }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getLinkStatistics_decorators, { kind: "method", name: "getLinkStatistics", static: false, private: false, access: { has: obj => "getLinkStatistics" in obj, get: obj => obj.getLinkStatistics }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _analyzeLinkImpact_decorators, { kind: "method", name: "analyzeLinkImpact", static: false, private: false, access: { has: obj => "analyzeLinkImpact" in obj, get: obj => obj.analyzeLinkImpact }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _updateLink_decorators, { kind: "method", name: "updateLink", static: false, private: false, access: { has: obj => "updateLink" in obj, get: obj => obj.updateLink }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _recordLinkAccess_decorators, { kind: "method", name: "recordLinkAccess", static: false, private: false, access: { has: obj => "recordLinkAccess" in obj, get: obj => obj.recordLinkAccess }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _rateLink_decorators, { kind: "method", name: "rateLink", static: false, private: false, access: { has: obj => "rateLink" in obj, get: obj => obj.rateLink }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _deleteLink_decorators, { kind: "method", name: "deleteLink", static: false, private: false, access: { has: obj => "deleteLink" in obj, get: obj => obj.deleteLink }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ShardLinkingController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        shardLinkingService = __runInitializers(this, _instanceExtraInitializers);
        constructor(shardLinkingService) {
            this.shardLinkingService = shardLinkingService;
        }
        /**
         * POST /api/v1/shards/links
         * Create a single link between two shards
         */
        async createLink(input, tenantId, user) {
            return this.shardLinkingService.createLink(tenantId, input.projectId, input, user.userId);
        }
        /**
         * POST /api/v1/shards/links/bulk
         * Create multiple links in bulk
         */
        async bulkCreateLinks(input, tenantId, user) {
            return this.shardLinkingService.bulkCreateLinks(tenantId, input, user.userId);
        }
        /**
         * POST /api/v1/shards/links/bulk-multi-project
         * Create links across multiple projects in bulk
         */
        async bulkCreateLinksMultiProject(input, tenantId, user) {
            return this.shardLinkingService.bulkCreateLinksMultiProject(tenantId, input, user.userId);
        }
        /**
         * GET /api/v1/shards/links/validate
         * Validate a link before creation
         */
        async validateLink(projectId, fromShardId, toShardId, relationshipType, tenantId) {
            return this.shardLinkingService.validateLink(tenantId, projectId, {
                projectId,
                fromShardId,
                toShardId,
                relationshipType: relationshipType,
            });
        }
        /**
         * GET /api/v1/shards/links/:linkId
         * Get a specific link by ID
         */
        async getLink(linkId, projectId, tenantId) {
            return this.shardLinkingService.getLink(tenantId, projectId, linkId);
        }
        /**
         * GET /api/v1/shards/links
         * Query links with filtering and pagination
         */
        async getLinks(params, tenantId) {
            return this.shardLinkingService.getLinks(tenantId, params.projectId, params);
        }
        /**
         * GET /api/v1/shards/:shardId/with-links
         * Get a shard with all its incoming and outgoing links
         */
        async getShardWithLinks(shardId, projectId, tenantId) {
            return this.shardLinkingService.getShardWithLinks(tenantId, projectId, shardId);
        }
        /**
         * GET /api/v1/shards/links/statistics
         * Get link statistics for a project
         */
        async getLinkStatistics(projectId, tenantId) {
            return this.shardLinkingService.getLinkStatistics(tenantId, projectId);
        }
        /**
         * GET /api/v1/shards/links/:linkId/impact
         * Analyze impact of deleting a link
         */
        async analyzeLinkImpact(linkId, projectId, tenantId) {
            return this.shardLinkingService.analyzeLinkImpact(tenantId, projectId, linkId);
        }
        /**
         * PATCH /api/v1/shards/links/:linkId
         * Update an existing link
         */
        async updateLink(linkId, input, projectId, tenantId, user) {
            return this.shardLinkingService.updateLink(tenantId, projectId, linkId, input, user.userId);
        }
        /**
         * POST /api/v1/shards/links/:linkId/access
         * Record link access/usage
         */
        async recordLinkAccess(linkId, projectId, tenantId) {
            return this.shardLinkingService.recordLinkAccess(tenantId, projectId, linkId);
        }
        /**
         * POST /api/v1/shards/links/:linkId/rate
         * Rate a link
         */
        async rateLink(linkId, projectId, rating, tenantId) {
            return this.shardLinkingService.rateLink(tenantId, projectId, linkId, rating);
        }
        /**
         * DELETE /api/v1/shards/links/:linkId
         * Delete a link
         */
        async deleteLink(linkId, projectId, tenantId, user) {
            return this.shardLinkingService.deleteLink(tenantId, projectId, linkId, user.userId);
        }
    };
    return ShardLinkingController = _classThis;
})();
export { ShardLinkingController };
/**
 * Admin Routes for Shard Linking (super admin only)
 */
let AdminShardLinkingController = (() => {
    let _classDecorators = [ApiTags('Admin - Shard Linking'), ApiBearerAuth(), Controller('api/v1/admin/shards/links'), UseGuards(AuthGuard, TenantGuard), UseFilters(AllExceptionsFilter)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _exportLinks_decorators;
    let _cleanupOrphanedLinks_decorators;
    let _forceUpdateLink_decorators;
    var AdminShardLinkingController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _exportLinks_decorators = [Get('export'), UseGuards(RoleGuard), ApiOperation({ summary: 'Export links for a project' }), ApiQuery({ name: 'projectId', required: true }), ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'] }), ApiResponse({
                    status: 200,
                    description: 'Links exported as file',
                })];
            _cleanupOrphanedLinks_decorators = [Post('cleanup'), UseGuards(RoleGuard), HttpCode(HttpStatus.OK), ApiOperation({ summary: 'Clean up orphaned links' }), ApiQuery({ name: 'projectId', required: true }), ApiResponse({
                    status: 200,
                    description: 'Cleanup completed',
                })];
            _forceUpdateLink_decorators = [Patch(':linkId/force-update'), UseGuards(RoleGuard), HttpCode(HttpStatus.OK), ApiOperation({ summary: 'Force update a link (admin)' }), ApiParam({ name: 'linkId', description: 'Link ID' }), ApiQuery({ name: 'projectId', required: true }), ApiResponse({
                    status: 200,
                    description: 'Link force updated',
                    type: ShardLink,
                })];
            __esDecorate(this, null, _exportLinks_decorators, { kind: "method", name: "exportLinks", static: false, private: false, access: { has: obj => "exportLinks" in obj, get: obj => obj.exportLinks }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _cleanupOrphanedLinks_decorators, { kind: "method", name: "cleanupOrphanedLinks", static: false, private: false, access: { has: obj => "cleanupOrphanedLinks" in obj, get: obj => obj.cleanupOrphanedLinks }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forceUpdateLink_decorators, { kind: "method", name: "forceUpdateLink", static: false, private: false, access: { has: obj => "forceUpdateLink" in obj, get: obj => obj.forceUpdateLink }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AdminShardLinkingController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        shardLinkingService = __runInitializers(this, _instanceExtraInitializers);
        constructor(shardLinkingService) {
            this.shardLinkingService = shardLinkingService;
        }
        /**
         * GET /api/v1/admin/shards/links/export
         * Export all links for a project (CSV/JSON)
         */
        async exportLinks(projectId, format = 'json', tenantId) {
            const page = await this.shardLinkingService.getLinks(tenantId, projectId, { limit: 999999 });
            if (format === 'csv') {
                // Convert to CSV
                const headers = ['linkId', 'fromShardId', 'toShardId', 'relationshipType', 'strength', 'bidirectional', 'createdAt'];
                const rows = page.items.map((link) => [
                    link.id,
                    link.fromShardId,
                    link.toShardId,
                    link.relationshipType,
                    link.strength,
                    link.isBidirectional,
                    link.createdAt,
                ]);
                const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
                return {
                    filename: `links-${projectId}-${Date.now()}.csv`,
                    content: csv,
                    contentType: 'text/csv',
                };
            }
            return {
                filename: `links-${projectId}-${Date.now()}.json`,
                content: JSON.stringify(page.items, null, 2),
                contentType: 'application/json',
            };
        }
        /**
         * POST /api/v1/admin/shards/links/cleanup
         * Clean up orphaned or invalid links
         */
        async cleanupOrphanedLinks(projectId, tenantId, user) {
            // In production, would implement cleanup logic
            // For now, returning template response
            return {
                cleanedUp: 0,
                errors: [],
            };
        }
        /**
         * PATCH /api/v1/admin/shards/links/:linkId/force-update
         * Force update a link bypassing normal validation
         */
        async forceUpdateLink(linkId, input, projectId, tenantId, user) {
            // In production, would implement force update with audit logging
            return this.shardLinkingService.updateLink(tenantId, projectId, linkId, input, user.userId);
        }
    };
    return AdminShardLinkingController = _classThis;
})();
export { AdminShardLinkingController };
//# sourceMappingURL=shard-linking.routes.js.map
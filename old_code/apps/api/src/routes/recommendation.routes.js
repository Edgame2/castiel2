/**
 * Recommendation Routes
 * API endpoints for the multi-factor recommendation engine
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
import { Controller, Get, Post, HttpCode, HttpStatus, UseGuards, UseFilters, } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Recommendation, RecommendationBatch, RecommendationExplanation, RecommendationStatistics, RecommendationPage, } from '../types/recommendation.types';
import { AuthGuard } from '../guards/auth.guard';
import { RoleGuard } from '../guards/role.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';
let RecommendationsController = (() => {
    let _classDecorators = [ApiTags('Recommendations'), ApiBearerAuth(), Controller('api/v1/recommendations'), UseGuards(AuthGuard, TenantGuard), UseFilters(AllExceptionsFilter)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _generateRecommendations_decorators;
    let _queryRecommendations_decorators;
    let _getRecommendation_decorators;
    let _explainRecommendation_decorators;
    let _provideFeedback_decorators;
    let _bulkProvideFeedback_decorators;
    let _getStatistics_decorators;
    var RecommendationsController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _generateRecommendations_decorators = [Post('generate'), HttpCode(HttpStatus.OK), ApiOperation({ summary: 'Generate multi-factor recommendations' }), ApiResponse({
                    status: 200,
                    description: 'Recommendations generated successfully',
                    type: RecommendationBatch,
                }), ApiResponse({
                    status: 400,
                    description: 'Invalid request parameters',
                })];
            _queryRecommendations_decorators = [Get(), ApiOperation({ summary: 'Query recommendations' }), ApiQuery({ name: 'projectId', required: true }), ApiQuery({ name: 'userId', required: false }), ApiQuery({ name: 'type', required: false }), ApiQuery({ name: 'status', required: false }), ApiQuery({ name: 'minConfidence', required: false, type: Number }), ApiQuery({ name: 'page', required: false, type: Number }), ApiQuery({ name: 'limit', required: false, type: Number }), ApiQuery({ name: 'sortBy', required: false, enum: ['confidence', 'createdAt', 'relevance'] }), ApiQuery({ name: 'sortDirection', required: false, enum: ['asc', 'desc'] }), ApiResponse({
                    status: 200,
                    description: 'Paginated recommendations',
                    type: RecommendationPage,
                })];
            _getRecommendation_decorators = [Get(':recommendationId'), ApiOperation({ summary: 'Get recommendation details' }), ApiParam({ name: 'recommendationId', description: 'Recommendation ID' }), ApiQuery({ name: 'projectId', required: true }), ApiResponse({
                    status: 200,
                    description: 'Recommendation details',
                    type: Recommendation,
                }), ApiResponse({
                    status: 404,
                    description: 'Recommendation not found',
                })];
            _explainRecommendation_decorators = [Get(':recommendationId/explain'), ApiOperation({ summary: 'Explain recommendation' }), ApiParam({ name: 'recommendationId', description: 'Recommendation ID' }), ApiQuery({ name: 'projectId', required: true }), ApiResponse({
                    status: 200,
                    description: 'Detailed recommendation explanation',
                    type: RecommendationExplanation,
                })];
            _provideFeedback_decorators = [Post(':recommendationId/feedback'), HttpCode(HttpStatus.NO_CONTENT), ApiOperation({ summary: 'Provide feedback on recommendation' }), ApiParam({ name: 'recommendationId', description: 'Recommendation ID' }), ApiQuery({ name: 'projectId', required: true }), ApiQuery({ name: 'feedback', required: true, enum: ['positive', 'negative', 'irrelevant'] }), ApiResponse({
                    status: 204,
                    description: 'Feedback recorded',
                })];
            _bulkProvideFeedback_decorators = [Post('feedback/bulk'), HttpCode(HttpStatus.NO_CONTENT), ApiOperation({ summary: 'Bulk provide feedback' }), ApiQuery({ name: 'projectId', required: true }), ApiResponse({
                    status: 204,
                    description: 'Feedback recorded for all recommendations',
                })];
            _getStatistics_decorators = [Get('statistics'), ApiOperation({ summary: 'Get recommendation statistics' }), ApiQuery({ name: 'projectId', required: true }), ApiResponse({
                    status: 200,
                    description: 'Recommendation statistics',
                    type: RecommendationStatistics,
                })];
            __esDecorate(this, null, _generateRecommendations_decorators, { kind: "method", name: "generateRecommendations", static: false, private: false, access: { has: obj => "generateRecommendations" in obj, get: obj => obj.generateRecommendations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _queryRecommendations_decorators, { kind: "method", name: "queryRecommendations", static: false, private: false, access: { has: obj => "queryRecommendations" in obj, get: obj => obj.queryRecommendations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getRecommendation_decorators, { kind: "method", name: "getRecommendation", static: false, private: false, access: { has: obj => "getRecommendation" in obj, get: obj => obj.getRecommendation }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _explainRecommendation_decorators, { kind: "method", name: "explainRecommendation", static: false, private: false, access: { has: obj => "explainRecommendation" in obj, get: obj => obj.explainRecommendation }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _provideFeedback_decorators, { kind: "method", name: "provideFeedback", static: false, private: false, access: { has: obj => "provideFeedback" in obj, get: obj => obj.provideFeedback }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _bulkProvideFeedback_decorators, { kind: "method", name: "bulkProvideFeedback", static: false, private: false, access: { has: obj => "bulkProvideFeedback" in obj, get: obj => obj.bulkProvideFeedback }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getStatistics_decorators, { kind: "method", name: "getStatistics", static: false, private: false, access: { has: obj => "getStatistics" in obj, get: obj => obj.getStatistics }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            RecommendationsController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        recommendationsService = __runInitializers(this, _instanceExtraInitializers);
        constructor(recommendationsService) {
            this.recommendationsService = recommendationsService;
        }
        /**
         * POST /api/v1/recommendations/generate
         * Get multi-factor recommendations for a user in a project
         */
        async generateRecommendations(input, tenantId, user) {
            const request = {
                ...input,
                userId: input.userId || user.userId,
            };
            return this.recommendationsService.getRecommendations(tenantId, request);
        }
        /**
         * GET /api/v1/recommendations
         * Query recommendations with filtering and pagination
         */
        async queryRecommendations(params, tenantId) {
            return this.recommendationsService.queryRecommendations(tenantId, params);
        }
        /**
         * GET /api/v1/recommendations/:recommendationId
         * Get a specific recommendation with details
         */
        async getRecommendation(recommendationId, projectId, tenantId) {
            // In production, would fetch from database
            // For now, returning placeholder
            return {
                id: recommendationId,
                projectId,
                message: 'Recommendation details',
            };
        }
        /**
         * GET /api/v1/recommendations/:recommendationId/explain
         * Get detailed explanation for a recommendation
         */
        async explainRecommendation(recommendationId, projectId, tenantId) {
            return this.recommendationsService.explainRecommendation(tenantId, projectId, recommendationId);
        }
        /**
         * POST /api/v1/recommendations/:recommendationId/feedback
         * Provide feedback on a recommendation (for learning)
         */
        async provideFeedback(recommendationId, projectId, feedback, tenantId) {
            return this.recommendationsService.provideFeedback(tenantId, projectId, recommendationId, feedback);
        }
        /**
         * POST /api/v1/recommendations/feedback/bulk
         * Bulk provide feedback on multiple recommendations
         */
        async bulkProvideFeedback(input, projectId, tenantId) {
            for (const rec of input.recommendations) {
                await this.recommendationsService.provideFeedback(tenantId, projectId, rec.id, rec.feedback);
            }
        }
        /**
         * GET /api/v1/recommendations/statistics
         * Get recommendation statistics for a project
         */
        async getStatistics(projectId, tenantId) {
            return this.recommendationsService.getStatistics(tenantId, projectId);
        }
    };
    return RecommendationsController = _classThis;
})();
export { RecommendationsController };
/**
 * Admin Routes for Recommendations (super admin only)
 */
let AdminRecommendationsController = (() => {
    let _classDecorators = [ApiTags('Admin - Recommendations'), ApiBearerAuth(), Controller('api/v1/admin/recommendations'), UseGuards(AuthGuard, TenantGuard), UseFilters(AllExceptionsFilter)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _updateAlgorithmWeights_decorators;
    let _getAlgorithmConfig_decorators;
    let _forceRegenerateRecommendations_decorators;
    let _getSystemMetrics_decorators;
    let _clearCache_decorators;
    var AdminRecommendationsController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _updateAlgorithmWeights_decorators = [Patch('algorithm/weights'), UseGuards(RoleGuard), HttpCode(HttpStatus.OK), ApiOperation({ summary: 'Update algorithm weights' }), ApiResponse({
                    status: 200,
                    description: 'Weights updated successfully',
                })];
            _getAlgorithmConfig_decorators = [Get('algorithm/config'), UseGuards(RoleGuard), ApiOperation({ summary: 'Get algorithm configuration' }), ApiResponse({
                    status: 200,
                    description: 'Current algorithm configuration',
                })];
            _forceRegenerateRecommendations_decorators = [Post('regenerate'), UseGuards(RoleGuard), HttpCode(HttpStatus.ACCEPTED), ApiOperation({ summary: 'Force regenerate all recommendations' }), ApiQuery({ name: 'projectId', required: true }), ApiResponse({
                    status: 202,
                    description: 'Regeneration started',
                })];
            _getSystemMetrics_decorators = [Get('metrics'), UseGuards(RoleGuard), ApiOperation({ summary: 'Get system metrics' }), ApiQuery({ name: 'timeRangeHours', required: false, type: Number }), ApiResponse({
                    status: 200,
                    description: 'System metrics',
                })];
            _clearCache_decorators = [Post('cache/clear'), UseGuards(RoleGuard), HttpCode(HttpStatus.NO_CONTENT), ApiOperation({ summary: 'Clear recommendation cache' }), ApiQuery({ name: 'projectId', required: false }), ApiResponse({
                    status: 204,
                    description: 'Cache cleared',
                })];
            __esDecorate(this, null, _updateAlgorithmWeights_decorators, { kind: "method", name: "updateAlgorithmWeights", static: false, private: false, access: { has: obj => "updateAlgorithmWeights" in obj, get: obj => obj.updateAlgorithmWeights }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getAlgorithmConfig_decorators, { kind: "method", name: "getAlgorithmConfig", static: false, private: false, access: { has: obj => "getAlgorithmConfig" in obj, get: obj => obj.getAlgorithmConfig }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _forceRegenerateRecommendations_decorators, { kind: "method", name: "forceRegenerateRecommendations", static: false, private: false, access: { has: obj => "forceRegenerateRecommendations" in obj, get: obj => obj.forceRegenerateRecommendations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getSystemMetrics_decorators, { kind: "method", name: "getSystemMetrics", static: false, private: false, access: { has: obj => "getSystemMetrics" in obj, get: obj => obj.getSystemMetrics }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _clearCache_decorators, { kind: "method", name: "clearCache", static: false, private: false, access: { has: obj => "clearCache" in obj, get: obj => obj.clearCache }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AdminRecommendationsController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        recommendationsService = __runInitializers(this, _instanceExtraInitializers);
        constructor(recommendationsService) {
            this.recommendationsService = recommendationsService;
        }
        /**
         * PATCH /api/v1/admin/recommendations/algorithm/weights
         * Update recommendation algorithm weights
         */
        async updateAlgorithmWeights(input, tenantId, user) {
            await this.recommendationsService.updateAlgorithmWeights(input);
            return {
                success: true,
                message: 'Algorithm weights updated successfully',
            };
        }
        /**
         * GET /api/v1/admin/recommendations/algorithm/config
         * Get current algorithm configuration
         */
        async getAlgorithmConfig(tenantId) {
            // In production, would fetch from database
            return {
                vectorSearchWeight: 0.5,
                collaborativeWeight: 0.3,
                temporalWeight: 0.2,
                vectorSimilarityThreshold: 0.6,
                minCollaborativeDataPoints: 5,
                temporalDecayDays: 30,
                contentSimilarityThreshold: 0.5,
                batchGenerationFrequency: 6,
                maxRecommendationsPerUser: 20,
                recommendationTTLDays: 7,
                enableFeedbackLearning: true,
                feedbackWeightFactor: 0.1,
            };
        }
        /**
         * POST /api/v1/admin/recommendations/regenerate
         * Force regenerate recommendations for a project
         */
        async forceRegenerateRecommendations(projectId, tenantId, user) {
            // In production, would queue background job
            return {
                success: true,
                jobId: `job-${projectId}-${Date.now()}`,
                message: 'Recommendation regeneration started',
            };
        }
        /**
         * GET /api/v1/admin/recommendations/metrics
         * Get recommendation system metrics
         */
        async getSystemMetrics(timeRangeHours = 24, tenantId) {
            // In production, would aggregate from metrics collection
            return {
                averageResponseTimeMs: 245,
                totalRecommendationsGenerated: 5234,
                averageConfidenceScore: 0.72,
                acceptanceRate: 0.65,
                dismissalRate: 0.25,
                irrelevantRate: 0.1,
                cacheHitRate: 0.82,
                timeRange: {
                    hours: timeRangeHours,
                    from: new Date(Date.now() - timeRangeHours * 60 * 60 * 1000),
                    to: new Date(),
                },
            };
        }
        /**
         * POST /api/v1/admin/recommendations/cache/clear
         * Clear recommendation cache
         */
        async clearCache(projectId, tenantId) {
            // In production, would clear specific or all cache keys
            // For now, placeholder implementation
        }
    };
    return AdminRecommendationsController = _classThis;
})();
export { AdminRecommendationsController };
//# sourceMappingURL=recommendation.routes.js.map
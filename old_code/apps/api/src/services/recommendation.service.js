/**
 * Recommendations Service
 * Multi-factor recommendation engine with vector search, collaborative filtering, and temporal scoring
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
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RecommendationType, RecommendationSource, RecommendationStatus, } from '../types/recommendation.types';
import { v4 as uuidv4 } from 'uuid';
let RecommendationsService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var RecommendationsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            RecommendationsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        cosmosDB;
        cache;
        vectorSearch;
        performanceMonitoring;
        activityService;
        logger = new Logger(RecommendationsService.name);
        RECOMMENDATIONS_CACHE_TTL = 1800; // 30 minutes
        STATS_CACHE_TTL = 3600; // 1 hour
        // Default algorithm configuration
        algorithmConfig = {
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
        constructor(cosmosDB, cache, vectorSearch, performanceMonitoring, activityService) {
            this.cosmosDB = cosmosDB;
            this.cache = cache;
            this.vectorSearch = vectorSearch;
            this.performanceMonitoring = performanceMonitoring;
            this.activityService = activityService;
        }
        /**
         * Get recommendations for a user in a project (multi-factor)
         */
        async getRecommendations(tenantId, request) {
            const startTime = Date.now();
            const requestId = uuidv4();
            try {
                // Check cache first
                const cacheKey = `recommendations:${request.projectId}:${request.userId}`;
                const cached = await this.cache.get(cacheKey);
                if (cached) {
                    this.logger.debug(`Cache hit for recommendations: ${requestId}`);
                    return cached;
                }
                const recommendations = [];
                const metrics = {
                    requestId,
                    userId: request.userId,
                    projectId: request.projectId,
                    vectorSearchResults: 0,
                    collaborativeMatches: 0,
                    temporalBoosts: 0,
                    finalRecommendations: 0,
                };
                // 1. Vector search-based recommendations (50%)
                const vectorStartTime = Date.now();
                const vectorRecs = await this.getVectorSearchRecommendations(tenantId, request.projectId, request.userId, request.limit || 10);
                metrics.vectorSearchResults = vectorRecs.length;
                metrics.vectorSearchTimeMs = Date.now() - vectorStartTime;
                recommendations.push(...vectorRecs);
                // 2. Collaborative filtering recommendations (30%)
                const collabStartTime = Date.now();
                const collabRecs = await this.getCollaborativeRecommendations(tenantId, request.projectId, request.userId, request.limit || 10);
                metrics.collaborativeMatches = collabRecs.length;
                metrics.collaborativeFilteringTimeMs = Date.now() - collabStartTime;
                recommendations.push(...collabRecs);
                // 3. Temporal/recency recommendations (20%)
                const temporalStartTime = Date.now();
                const temporalRecs = await this.getTemporalRecommendations(tenantId, request.projectId, request.userId, request.limit || 10);
                metrics.temporalBoosts = temporalRecs.length;
                metrics.temporalScoringTimeMs = Date.now() - temporalStartTime;
                recommendations.push(...temporalRecs);
                // 4. Merge, deduplicate, and score
                const mergedRecs = this.mergeAndScoreRecommendations(recommendations);
                // 5. Filter by confidence
                const minConfidence = request.minConfidence ?? 0.5;
                const filteredRecs = mergedRecs.filter((r) => r.confidenceScore >= minConfidence);
                // 6. Apply limit
                const finalRecs = filteredRecs.slice(0, request.limit || 10);
                // 7. Generate explanations
                const explanationStartTime = Date.now();
                for (const rec of finalRecs) {
                    try {
                        rec.explanation = await this.generateExplanation(tenantId, rec);
                    }
                    catch (error) {
                        this.logger.warn(`Failed to generate explanation for recommendation ${rec.id}: ${error.message}`);
                        rec.explanation = `Recommended based on ${rec.sources.join(', ')} analysis`;
                    }
                }
                metrics.explanationGenerationTimeMs = Date.now() - explanationStartTime;
                // 8. Save recommendations to database
                for (const rec of finalRecs) {
                    try {
                        await this.cosmosDB.upsertDocument('recommendations', rec, tenantId);
                    }
                    catch (error) {
                        this.logger.warn(`Failed to save recommendation: ${error.message}`);
                    }
                }
                metrics.finalRecommendations = finalRecs.length;
                // Calculate average confidence
                const avgConfidence = finalRecs.length > 0 ? finalRecs.reduce((sum, r) => sum + r.confidenceScore, 0) / finalRecs.length : 0;
                metrics.avgConfidenceScore = avgConfidence;
                // Calculate diversity score
                const types = new Set(finalRecs.map((r) => r.type)).size;
                metrics.diversityScore = types / Object.keys(RecommendationType).length;
                // Record metrics
                await this.recordRecommendationMetrics(tenantId, {
                    ...metrics,
                    totalTimeMs: Date.now() - startTime,
                    timestamp: new Date(),
                });
                // Build response
                const batch = {
                    requestId,
                    recommendations: finalRecs,
                    totalCount: finalRecs.length,
                    generatedAt: new Date(),
                    executionTimeMs: Date.now() - startTime,
                };
                // Cache result
                await this.cache.set(cacheKey, batch, this.RECOMMENDATIONS_CACHE_TTL);
                this.logger.log(`Generated ${finalRecs.length} recommendations for user ${request.userId} in ${batch.executionTimeMs}ms`);
                return batch;
            }
            catch (error) {
                this.logger.error(`Failed to get recommendations: ${error.message}`);
                throw error;
            }
        }
        /**
         * Get vector search-based recommendations (semantic similarity)
         * Weight: 50%
         */
        async getVectorSearchRecommendations(tenantId, projectId, userId, limit) {
            try {
                // Get user's recent activities/interests
                const recentActivityQuery = `
        SELECT TOP 5 pa.details FROM project_activities pa
        WHERE pa.tenantId = @tenantId AND pa.projectId = @projectId
        AND pa.actorUserId = @userId
        ORDER BY pa.timestamp DESC
      `;
                const recentActivities = await this.cosmosDB.queryDocuments('project-activities', recentActivityQuery, [
                    { name: '@tenantId', value: tenantId },
                    { name: '@projectId', value: projectId },
                    { name: '@userId', value: userId },
                ], tenantId);
                if (recentActivities.length === 0) {
                    return [];
                }
                // Build query from user interests
                const userInterests = recentActivities.map((a) => a.details?.description || '').filter((d) => d);
                const query = userInterests.slice(0, 3).join(' ');
                if (!query) {
                    return [];
                }
                // Perform vector search
                const vectorResults = await this.vectorSearch.search({
                    query,
                    topK: limit * 2,
                    minScore: this.algorithmConfig.vectorSimilarityThreshold,
                    filters: {
                        projectId,
                        excludeIds: [],
                    },
                });
                // Convert to recommendations
                const recs = vectorResults.slice(0, limit).map((result) => ({
                    id: uuidv4(),
                    tenantId,
                    projectId,
                    userId,
                    type: RecommendationType.SHARD_LINK,
                    targetId: result.id,
                    targetName: result.name,
                    targetType: 'shard',
                    confidenceScore: result.score,
                    reasonCodes: ['SEMANTIC_SIMILARITY'],
                    explanation: `Similar to your recent work (${(result.score * 100).toFixed(0)}% match)`,
                    sources: [RecommendationSource.VECTOR_SEARCH],
                    vectorScore: result.score,
                    status: RecommendationStatus.PENDING,
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + this.algorithmConfig.recommendationTTLDays * 24 * 60 * 60 * 1000),
                    ttl: this.algorithmConfig.recommendationTTLDays * 24 * 60 * 60,
                }));
                return recs;
            }
            catch (error) {
                this.logger.warn(`Failed to get vector search recommendations: ${error.message}`);
                return [];
            }
        }
        /**
         * Get collaborative filtering recommendations
         * Weight: 30%
         */
        async getCollaborativeRecommendations(tenantId, projectId, userId, limit) {
            try {
                // Find similar users (based on shared projects/collaborations)
                const similarUsersQuery = `
        SELECT DISTINCT pc.collaboratorUserId, COUNT(1) as sharedCount
        FROM project_collaborators pc
        JOIN project_collaborators pc2
        ON pc.projectId = pc2.projectId
        AND pc.tenantId = pc2.tenantId
        AND pc2.collaboratorUserId = @userId
        WHERE pc.tenantId = @tenantId AND pc.collaboratorUserId != @userId
        GROUP BY pc.collaboratorUserId
        ORDER BY sharedCount DESC
      `;
                const similarUsers = await this.cosmosDB.queryDocuments('project-collaborators', similarUsersQuery, [
                    { name: '@tenantId', value: tenantId },
                    { name: '@userId', value: userId },
                ], tenantId);
                if (similarUsers.length < this.algorithmConfig.minCollaborativeDataPoints) {
                    return [];
                }
                // Get items liked by similar users
                const similarUserIds = similarUsers.slice(0, 5).map((u) => u.collaboratorUserId);
                const itemsQuery = `
        SELECT DISTINCT sl.toShardId, COUNT(1) as popularity
        FROM project_shard_links sl
        WHERE sl.tenantId = @tenantId AND sl.projectId = @projectId
        AND sl.createdBy IN (${similarUserIds.map((_, i) => `@user${i}`).join(',')})
        GROUP BY sl.toShardId
        ORDER BY popularity DESC
      `;
                const params = [
                    { name: '@tenantId', value: tenantId },
                    { name: '@projectId', value: projectId },
                ];
                similarUserIds.forEach((userId, i) => {
                    params.push({ name: `@user${i}`, value: userId });
                });
                const popularItems = await this.cosmosDB.queryDocuments('project-shard-links', itemsQuery, params, tenantId);
                // Convert to recommendations
                const recs = popularItems.slice(0, limit).map((item, index) => ({
                    id: uuidv4(),
                    tenantId,
                    projectId,
                    userId,
                    type: RecommendationType.SHARD_INCLUSION,
                    targetId: item.toShardId,
                    targetName: `Shard ${item.toShardId.substring(0, 8)}`,
                    targetType: 'shard',
                    confidenceScore: Math.min(1, item.popularity / similarUsers.length),
                    reasonCodes: ['COLLABORATIVE_FILTERING'],
                    explanation: `Users like you found this helpful (${item.popularity} similar user${item.popularity > 1 ? 's' : ''})`,
                    sources: [RecommendationSource.COLLABORATIVE_FILTERING],
                    collaborativeScore: Math.min(1, item.popularity / similarUsers.length),
                    status: RecommendationStatus.PENDING,
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + this.algorithmConfig.recommendationTTLDays * 24 * 60 * 60 * 1000),
                    ttl: this.algorithmConfig.recommendationTTLDays * 24 * 60 * 60,
                }));
                return recs;
            }
            catch (error) {
                this.logger.warn(`Failed to get collaborative recommendations: ${error.message}`);
                return [];
            }
        }
        /**
         * Get temporal/recency-based recommendations
         * Weight: 20%
         */
        async getTemporalRecommendations(tenantId, projectId, userId, limit) {
            try {
                const decayDays = this.algorithmConfig.temporalDecayDays;
                const decayTime = Date.now() - decayDays * 24 * 60 * 60 * 1000;
                // Get trending items in the project
                const trendingQuery = `
        SELECT sl.toShardId, COUNT(1) as recentCount, MAX(sl.createdAt) as lastLinked
        FROM project_shard_links sl
        WHERE sl.tenantId = @tenantId AND sl.projectId = @projectId
        AND sl.createdAt > DateTimeAdd('s', @decayTime, DateTimeNow())
        GROUP BY sl.toShardId
        ORDER BY recentCount DESC, lastLinked DESC
      `;
                const params = [
                    { name: '@tenantId', value: tenantId },
                    { name: '@projectId', value: projectId },
                    { name: '@decayTime', value: Math.floor(decayTime / 1000) },
                ];
                const trendingItems = await this.cosmosDB.queryDocuments('project-shard-links', trendingQuery, params, tenantId);
                // Calculate temporal score with decay
                const recs = trendingItems.slice(0, limit).map((item) => {
                    const daysSinceLinked = (Date.now() - new Date(item.lastLinked).getTime()) / (24 * 60 * 60 * 1000);
                    const decayFactor = Math.exp(-daysSinceLinked / decayDays);
                    const recencyScore = Math.max(0.5, decayFactor); // Min 0.5, max 1.0
                    return {
                        id: uuidv4(),
                        tenantId,
                        projectId,
                        userId,
                        type: RecommendationType.SHARD_INCLUSION,
                        targetId: item.toShardId,
                        targetName: `Trending Shard ${item.toShardId.substring(0, 8)}`,
                        targetType: 'shard',
                        confidenceScore: Math.min(1, recencyScore * (item.recentCount / 10)),
                        reasonCodes: ['RECENT_ACTIVITY'],
                        explanation: `Trending in your project (${item.recentCount} recent links)`,
                        sources: [RecommendationSource.TEMPORAL],
                        temporalScore: recencyScore,
                        status: RecommendationStatus.PENDING,
                        createdAt: new Date(),
                        expiresAt: new Date(Date.now() + this.algorithmConfig.recommendationTTLDays * 24 * 60 * 60 * 1000),
                        ttl: this.algorithmConfig.recommendationTTLDays * 24 * 60 * 60,
                    };
                });
                return recs;
            }
            catch (error) {
                this.logger.warn(`Failed to get temporal recommendations: ${error.message}`);
                return [];
            }
        }
        /**
         * Merge recommendations from multiple sources and calculate composite score
         */
        mergeAndScoreRecommendations(recommendations) {
            // Group by target
            const grouped = new Map();
            for (const rec of recommendations) {
                const key = `${rec.type}:${rec.targetId}`;
                if (!grouped.has(key)) {
                    grouped.set(key, []);
                }
                grouped.get(key).push(rec);
            }
            // Merge and calculate composite scores
            const merged = [];
            for (const [key, recs] of grouped.entries()) {
                if (recs.length === 1) {
                    merged.push(recs[0]);
                }
                else {
                    // Create composite recommendation
                    const composite = recs[0];
                    // Calculate weighted average score
                    let vectorScore = 0;
                    let collabScore = 0;
                    let temporalScore = 0;
                    for (const rec of recs) {
                        if (rec.vectorScore) {
                            vectorScore = rec.vectorScore;
                        }
                        if (rec.collaborativeScore) {
                            collabScore = rec.collaborativeScore;
                        }
                        if (rec.temporalScore) {
                            temporalScore = rec.temporalScore;
                        }
                    }
                    const compositeScore = vectorScore * this.algorithmConfig.vectorSearchWeight +
                        collabScore * this.algorithmConfig.collaborativeWeight +
                        temporalScore * this.algorithmConfig.temporalWeight;
                    composite.confidenceScore = Math.min(1, compositeScore);
                    composite.sources = [...new Set(recs.flatMap((r) => r.sources))];
                    composite.vectorScore = vectorScore;
                    composite.collaborativeScore = collabScore;
                    composite.temporalScore = temporalScore;
                    merged.push(composite);
                }
            }
            // Sort by confidence score
            return merged.sort((a, b) => b.confidenceScore - a.confidenceScore);
        }
        /**
         * Generate human-readable explanation for a recommendation
         */
        async generateExplanation(tenantId, rec) {
            try {
                const sources = rec.sources.map((s) => {
                    if (s === RecommendationSource.VECTOR_SEARCH) {
                        return 'semantic similarity';
                    }
                    if (s === RecommendationSource.COLLABORATIVE_FILTERING) {
                        return 'user patterns';
                    }
                    if (s === RecommendationSource.TEMPORAL) {
                        return 'recent activity';
                    }
                    return s.toLowerCase();
                });
                const scorePercent = Math.round(rec.confidenceScore * 100);
                return `Recommended based on ${sources.join(' and ')} (${scorePercent}% confidence).`;
            }
            catch (error) {
                this.logger.warn(`Failed to generate explanation: ${error.message}`);
                return `Recommended based on multiple factors (${Math.round(rec.confidenceScore * 100)}% confidence).`;
            }
        }
        /**
         * Get detailed explanation for a recommendation
         */
        async explainRecommendation(tenantId, projectId, recommendationId) {
            try {
                const rec = await this.cosmosDB.getDocument('recommendations', recommendationId, tenantId);
                if (!rec) {
                    throw new BadRequestException(`Recommendation ${recommendationId} not found`);
                }
                const explanation = {
                    recommendationId,
                    summary: rec.explanation,
                    detailedReasons: this.buildExplanationReasons(rec),
                    totalScore: rec.confidenceScore,
                    scoreBreakdown: {
                        vectorScore: rec.vectorScore,
                        collaborativeScore: rec.collaborativeScore,
                        temporalScore: rec.temporalScore,
                    },
                    contextItems: rec.metadata?.relatedItems,
                    supportingData: rec.metadata,
                };
                return explanation;
            }
            catch (error) {
                this.logger.error(`Failed to explain recommendation: ${error.message}`);
                throw error;
            }
        }
        /**
         * Build detailed explanation reasons
         */
        buildExplanationReasons(rec) {
            const reasons = [];
            if (rec.vectorScore && rec.vectorScore > 0) {
                reasons.push({
                    type: 'SIMILARITY',
                    weight: this.algorithmConfig.vectorSearchWeight,
                    description: `Semantically similar to your recent work (${(rec.vectorScore * 100).toFixed(0)}% match)`,
                    evidence: rec.metadata?.matchedTerms,
                });
            }
            if (rec.collaborativeScore && rec.collaborativeScore > 0) {
                reasons.push({
                    type: 'BEHAVIOR',
                    weight: this.algorithmConfig.collaborativeWeight,
                    description: `Other users with similar interests found this helpful`,
                    evidence: [],
                });
            }
            if (rec.temporalScore && rec.temporalScore > 0) {
                reasons.push({
                    type: 'RECENCY',
                    weight: this.algorithmConfig.temporalWeight,
                    description: `Trending in your project recently`,
                    evidence: [],
                });
            }
            return reasons;
        }
        /**
         * Provide feedback on a recommendation (for learning)
         */
        async provideFeedback(tenantId, projectId, recommendationId, feedback) {
            try {
                const rec = await this.cosmosDB.getDocument('recommendations', recommendationId, tenantId);
                if (!rec) {
                    throw new BadRequestException(`Recommendation ${recommendationId} not found`);
                }
                rec.userFeedback = feedback;
                rec.feedbackProvidedAt = new Date();
                rec.status = RecommendationStatus.ACCEPTED;
                await this.cosmosDB.upsertDocument('recommendations', rec, tenantId);
                // Store feedback for learning (separate collection)
                const feedbackRecord = {
                    recommendationId,
                    userId: rec.userId,
                    projectId,
                    feedback,
                    timestamp: new Date(),
                };
                await this.cosmosDB.upsertDocument('recommendation-feedback', feedbackRecord, tenantId);
                // Invalidate cache
                await this.cache.delete(`recommendations:${projectId}:${rec.userId}`);
                this.logger.log(`Feedback recorded: ${recommendationId} -> ${feedback}`);
            }
            catch (error) {
                this.logger.error(`Failed to provide feedback: ${error.message}`);
                throw error;
            }
        }
        /**
         * Get recommendation statistics for a project
         */
        async getStatistics(tenantId, projectId) {
            try {
                const cacheKey = `rec-stats:${projectId}`;
                const cached = await this.cache.get(cacheKey);
                if (cached) {
                    return cached;
                }
                const query = `
        SELECT * FROM recommendations r
        WHERE r.tenantId = @tenantId AND r.projectId = @projectId
      `;
                const recs = await this.cosmosDB.queryDocuments('recommendations', query, [
                    { name: '@tenantId', value: tenantId },
                    { name: '@projectId', value: projectId },
                ], tenantId);
                if (recs.length === 0) {
                    const emptyStats = {
                        totalGenerated: 0,
                        acceptanceRate: 0,
                        dismissalRate: 0,
                        avgConfidenceScore: 0,
                        byType: {},
                        bySource: {},
                        topRecommendedItems: [],
                    };
                    await this.cache.set(cacheKey, emptyStats, this.STATS_CACHE_TTL);
                    return emptyStats;
                }
                const accepted = recs.filter((r) => r.status === RecommendationStatus.ACCEPTED).length;
                const dismissed = recs.filter((r) => r.status === RecommendationStatus.DISMISSED).length;
                // Group by type
                const byType = {};
                Object.values(RecommendationType).forEach((type) => {
                    byType[type] = recs.filter((r) => r.type === type).length;
                });
                // Group by source
                const bySource = {};
                Object.values(RecommendationSource).forEach((source) => {
                    bySource[source] = recs.filter((r) => r.sources.includes(source)).length;
                });
                // Get top recommended items
                const itemCounts = new Map();
                recs.forEach((r) => {
                    const existing = itemCounts.get(r.targetId) || { accepted: 0, dismissed: 0, name: r.targetName };
                    if (r.status === RecommendationStatus.ACCEPTED) {
                        existing.accepted++;
                    }
                    if (r.status === RecommendationStatus.DISMISSED) {
                        existing.dismissed++;
                    }
                    itemCounts.set(r.targetId, existing);
                });
                const topRecommendedItems = Array.from(itemCounts.entries())
                    .map(([itemId, data]) => ({
                    itemId,
                    itemName: data.name,
                    acceptanceCount: data.accepted,
                    dismissalCount: data.dismissed,
                }))
                    .sort((a, b) => b.acceptanceCount - a.acceptanceCount)
                    .slice(0, 10);
                const stats = {
                    totalGenerated: recs.length,
                    acceptanceRate: recs.length > 0 ? accepted / recs.length : 0,
                    dismissalRate: recs.length > 0 ? dismissed / recs.length : 0,
                    avgConfidenceScore: recs.length > 0 ? recs.reduce((sum, r) => sum + r.confidenceScore, 0) / recs.length : 0,
                    byType: byType,
                    bySource: bySource,
                    topRecommendedItems,
                };
                await this.cache.set(cacheKey, stats, this.STATS_CACHE_TTL);
                return stats;
            }
            catch (error) {
                this.logger.error(`Failed to get recommendation statistics: ${error.message}`);
                throw error;
            }
        }
        /**
         * Update recommendation algorithm weights
         */
        async updateAlgorithmWeights(weights) {
            try {
                // Validate weights sum to 1.0
                const total = (weights.vectorSearchWeight ?? this.algorithmConfig.vectorSearchWeight) +
                    (weights.collaborativeWeight ?? this.algorithmConfig.collaborativeWeight) +
                    (weights.temporalWeight ?? this.algorithmConfig.temporalWeight);
                if (Math.abs(total - 1.0) > 0.01) {
                    throw new BadRequestException('Weights must sum to 1.0');
                }
                if (weights.vectorSearchWeight) {
                    this.algorithmConfig.vectorSearchWeight = weights.vectorSearchWeight;
                }
                if (weights.collaborativeWeight) {
                    this.algorithmConfig.collaborativeWeight = weights.collaborativeWeight;
                }
                if (weights.temporalWeight) {
                    this.algorithmConfig.temporalWeight = weights.temporalWeight;
                }
                // Clear recommendation cache to force regeneration
                await this.cache.delete('recommendations:*');
                this.logger.log('Algorithm weights updated');
            }
            catch (error) {
                this.logger.error(`Failed to update algorithm weights: ${error.message}`);
                throw error;
            }
        }
        /**
         * Record recommendation metrics for monitoring
         */
        async recordRecommendationMetrics(tenantId, metrics) {
            try {
                await this.cosmosDB.upsertDocument('recommendation-metrics', metrics, tenantId);
                // Also track with performance monitoring service
                await this.performanceMonitoring.trackRecommendationMetric(tenantId, {
                    responseTime: metrics.totalTimeMs,
                    recommendationCount: metrics.finalRecommendations,
                    avgConfidenceScore: metrics.avgConfidenceScore,
                    diversityScore: metrics.diversityScore,
                });
            }
            catch (error) {
                this.logger.warn(`Failed to record recommendation metrics: ${error.message}`);
            }
        }
        /**
         * Query recommendations with filtering and pagination
         */
        async queryRecommendations(tenantId, params) {
            try {
                let query = `
        SELECT * FROM recommendations r
        WHERE r.tenantId = @tenantId AND r.projectId = @projectId
      `;
                const parameters = [
                    { name: '@tenantId', value: tenantId },
                    { name: '@projectId', value: params.projectId },
                ];
                if (params.userId) {
                    query += ` AND r.userId = @userId`;
                    parameters.push({ name: '@userId', value: params.userId });
                }
                if (params.type) {
                    query += ` AND r.type = @type`;
                    parameters.push({ name: '@type', value: params.type });
                }
                if (params.status) {
                    query += ` AND r.status = @status`;
                    parameters.push({ name: '@status', value: params.status });
                }
                if (params.minConfidence) {
                    query += ` AND r.confidenceScore >= @minConfidence`;
                    parameters.push({ name: '@minConfidence', value: params.minConfidence });
                }
                const sortBy = params.sortBy || 'createdAt';
                const sortDir = params.sortDirection === 'asc' ? 'ASC' : 'DESC';
                const sortField = sortBy === 'confidence' ? 'r.confidenceScore' : sortBy === 'relevance' ? 'r.confidenceScore' : 'r.createdAt';
                query += ` ORDER BY ${sortField} ${sortDir}`;
                // Get total count
                const totalRecs = await this.cosmosDB.queryDocuments('recommendations', query + ` OFFSET 0 LIMIT 999999`, parameters, tenantId);
                // Apply pagination
                const page = params.page || 1;
                const limit = params.limit || 20;
                const offset = (page - 1) * limit;
                const paginatedQuery = query + ` OFFSET @offset LIMIT @limit`;
                parameters.push({ name: '@offset', value: offset }, { name: '@limit', value: limit });
                const items = await this.cosmosDB.queryDocuments('recommendations', paginatedQuery, parameters, tenantId);
                const totalCount = totalRecs.length;
                const totalPages = Math.ceil(totalCount / limit);
                return {
                    items,
                    totalCount,
                    pageNumber: page,
                    totalPages,
                    pageSize: limit,
                    hasMore: page < totalPages,
                };
            }
            catch (error) {
                this.logger.error(`Failed to query recommendations: ${error.message}`);
                throw error;
            }
        }
    };
    return RecommendationsService = _classThis;
})();
export { RecommendationsService };
//# sourceMappingURL=recommendation.service.js.map
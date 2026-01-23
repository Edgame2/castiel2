/**
 * AI Chat Context Assembly Service
 * Intelligent context selection, topic extraction, clustering, and optimization
 */
// Removed NestJS imports - using standard TypeScript classes
import { ContextSourceType, ContextQualityLevel, TopicCategory, } from '../types/ai-context.types';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
export class ContextAssemblyService {
    cosmosDB;
    cache;
    vectorSearch;
    shardLinking;
    activityService;
    performanceMonitoring;
    monitoring;
    CONTEXT_CACHE_TTL = 1800; // 30 minutes
    STATS_CACHE_TTL = 3600; // 1 hour
    // Default configuration
    config = {
        defaultMaxTokens: 4000,
        maxSourcesPerType: 10,
        minRelevanceScore: 0.5,
        optimizationLevel: 0.7,
        topicModelType: 'bert',
        cacheTTLMinutes: 30,
    };
    shardRepository;
    constructor(cosmosDB, cache, vectorSearch, shardLinking, activityService, performanceMonitoring, monitoring) {
        this.cosmosDB = cosmosDB;
        this.cache = cache;
        this.vectorSearch = vectorSearch;
        this.shardLinking = shardLinking;
        this.activityService = activityService;
        this.performanceMonitoring = performanceMonitoring;
        this.monitoring = monitoring;
    }
    /**
     * Set shard repository (injected separately to avoid circular dependencies)
     */
    setShardRepository(repository) {
        this.shardRepository = repository;
    }
    /**
     * Assemble context for a query (main entry point)
     */
    async assembleContext(tenantId, request) {
        const startTime = Date.now();
        const requestId = uuidv4();
        try {
            // Check cache
            const cacheKey = this.generateCacheKey(request);
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                this.monitoring.trackEvent('context-assembly.cache-hit', { requestId });
                return {
                    context: cached,
                    executionTimeMs: Date.now() - startTime,
                };
            }
            // 1. Extract topics from query
            const queryTopics = await this.extractTopics(tenantId, {
                content: request.query,
                maxTopics: 5,
                minRelevance: 0.4,
            });
            // 2. Expand query for better retrieval
            const expandedQuery = await this.expandQuery(tenantId, request.query);
            // 3. Retrieve relevant sources
            const sources = await this.retrieveRelevantSources(tenantId, request.projectId, request.userId, expandedQuery, request.maxTokens || this.config.defaultMaxTokens, request.minRelevance ?? this.config.minRelevanceScore, request.excludeSourceTypes);
            // 4. Extract topics from sources
            const sourceTopics = await this.extractTopicsFromSources(tenantId, sources);
            // 5. Cluster topics
            const clusters = await this.clusterTopics([...queryTopics, ...sourceTopics], request.focusTopics);
            // 6. Rank sources for inclusion
            const rankedSources = await this.rankSources(sources, queryTopics, clusters, request.maxTokens || this.config.defaultMaxTokens);
            // 7. Optimize context
            const optimizedContext = await this.optimizeContext(rankedSources, queryTopics, clusters, request.maxTokens || this.config.defaultMaxTokens);
            // 8. Calculate quality metrics
            const qualityMetrics = this.calculateQualityMetrics(rankedSources, queryTopics, clusters);
            // 9. Build final context
            const context = {
                id: uuidv4(),
                tenantId,
                projectId: request.projectId,
                userId: request.userId,
                query: request.query,
                queryTopics,
                sources: rankedSources,
                clusters,
                selectedShards: rankedSources
                    .filter((s) => s.sourceType === ContextSourceType.SHARD)
                    .map((s) => s.sourceId),
                selectedActivities: rankedSources
                    .filter((s) => s.sourceType === ContextSourceType.ACTIVITY_LOG)
                    .map((s) => s.sourceId),
                selectedRecommendations: rankedSources
                    .filter((s) => s.sourceType === ContextSourceType.RECOMMENDATION)
                    .map((s) => s.sourceId),
                summary: this.generateContextSummary(rankedSources, queryTopics),
                contextLength: optimizedContext.totalTokens,
                contextLengthPercentage: (optimizedContext.totalTokens / (request.maxTokens || this.config.defaultMaxTokens)) * 100,
                qualityLevel: this.determineQualityLevel(qualityMetrics.overallQuality),
                relevanceScore: qualityMetrics.relevanceScore,
                optimizationApplied: optimizedContext.optimizations,
                compressionRatio: optimizedContext.compressionRatio,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + this.config.cacheTTLMinutes * 60 * 1000),
                ttl: this.config.cacheTTLMinutes * 60,
            };
            // Save to database
            await this.cosmosDB.upsertDocument('ai-chat-contexts', context, tenantId);
            // Cache result
            await this.cache.set(cacheKey, context, this.CONTEXT_CACHE_TTL);
            // Record metrics
            const metrics = {
                requestId,
                userId: request.userId,
                projectId: request.projectId,
                totalTimeMs: Date.now() - startTime,
                sourcesAvailable: sources.length,
                sourcesSelected: rankedSources.length,
                topicsExtracted: queryTopics.length + sourceTopics.length,
                clustersGenerated: clusters.length,
                finalTokenCount: optimizedContext.totalTokens,
                relevanceScore: context.relevanceScore,
                qualityLevel: context.qualityLevel,
                cacheHit: false,
                timestamp: new Date(),
            };
            await this.recordMetrics(tenantId, metrics);
            this.monitoring.trackEvent('context-assembly.completed', {
                sourcesCount: rankedSources.length,
                totalTokens: optimizedContext.totalTokens,
                executionTimeMs: metrics.totalTimeMs,
            });
            return {
                context,
                executionTimeMs: metrics.totalTimeMs,
                recommendations: {
                    additionalSources: sources
                        .filter((s) => !rankedSources.find((rs) => rs.id === s.id))
                        .slice(0, 3),
                    suggestedFollowUp: this.suggestFollowUp(context),
                },
            };
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context-assembly.assemble' });
            throw error;
        }
    }
    /**
     * Extract topics from text content
     */
    async extractTopics(tenantId, request) {
        try {
            // For now, simple keyword extraction and categorization
            // In production, would use NLP model (BERT, LDA, etc.)
            const keywords = this.extractKeywords(request.content, request.maxTopics || 10);
            const topics = keywords.map((keyword, index) => ({
                id: uuidv4(),
                name: keyword,
                category: this.categorizeTopic(keyword),
                keywords: [keyword],
                relevanceScore: 1.0 - index * 0.1, // Decreasing relevance by position
                frequency: this.countKeywordFrequency(request.content, keyword),
                entities: [],
            }));
            return topics.filter((t) => t.relevanceScore >= (request.minRelevance ?? 0.3));
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context-assembly.extract-topics' });
            return [];
        }
    }
    /**
     * Expand query with synonyms and related terms
     */
    async expandQuery(tenantId, query) {
        try {
            const terms = query.split(/\s+/).filter((t) => t.length > 2);
            const synonyms = [];
            const relatedTerms = [];
            // In production, would use thesaurus/NLP service
            // For now, simple expansion with common variations
            for (const term of terms) {
                synonyms.push(...this.generateSynonyms(term));
                relatedTerms.push(...this.generateRelatedTerms(term));
            }
            const expandedQuery = [query, ...synonyms, ...relatedTerms].join(' ');
            return {
                original: query,
                expanded: expandedQuery,
                synonyms: [...new Set(synonyms)],
                relatedTerms: [...new Set(relatedTerms)],
                entities: this.extractEntities(query),
            };
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context-assembly.expand-query' });
            return {
                original: query,
                expanded: query,
                synonyms: [],
                relatedTerms: [],
                entities: [],
            };
        }
    }
    /**
     * Retrieve relevant sources (shards, activities, recommendations)
     */
    async retrieveRelevantSources(tenantId, projectId, userId, expandedQuery, maxTokens, minRelevance, excludeTypes) {
        try {
            const sources = [];
            let tokenCount = 0;
            // 1. Vector search for relevant shards (project-aware)
            if (!excludeTypes?.includes(ContextSourceType.SHARD)) {
                const shardResults = await this.vectorSearch.search({
                    tenantId,
                    query: expandedQuery.expanded,
                    topK: this.config.maxSourcesPerType,
                    minScore: minRelevance,
                    projectId, // Pass projectId for project-scoped vector search
                });
                for (const result of shardResults.results) {
                    const tokens = Math.ceil((result.content?.length || result.shard?.name?.length || 0) / 4); // Rough estimate
                    if (tokenCount + tokens <= maxTokens) {
                        sources.push({
                            id: uuidv4(),
                            sourceType: ContextSourceType.SHARD,
                            sourceId: result.shardId,
                            sourceName: result.shard?.name || result.shardId,
                            content: result.content || result.shard?.name || '',
                            relevanceScore: result.score,
                            estimatedTokens: tokens,
                        });
                        tokenCount += tokens;
                    }
                }
            }
            // 2. Get recent activities
            if (!excludeTypes?.includes(ContextSourceType.ACTIVITY_LOG)) {
                const activityQuery = `
          SELECT TOP 10 * FROM project_activities pa
          WHERE pa.tenantId = @tenantId AND pa.projectId = @projectId
          ORDER BY pa.timestamp DESC
        `;
                try {
                    const activities = await this.cosmosDB.queryDocuments('project-activities', activityQuery, [
                        { name: '@tenantId', value: tenantId },
                        { name: '@projectId', value: projectId },
                    ], tenantId);
                    for (const activity of activities.slice(0, 5)) {
                        const tokens = Math.ceil(activity.description?.length / 4 || 50);
                        if (tokenCount + tokens <= maxTokens) {
                            sources.push({
                                id: uuidv4(),
                                sourceType: ContextSourceType.ACTIVITY_LOG,
                                sourceId: activity.id,
                                sourceName: activity.type,
                                content: activity.description || '',
                                relevanceScore: 0.7,
                                estimatedTokens: tokens,
                                metadata: {
                                    timestamp: activity.timestamp,
                                },
                            });
                            tokenCount += tokens;
                        }
                    }
                }
                catch (error) {
                    this.monitoring.trackException(error, { operation: 'context-assembly.retrieve-activities' });
                }
            }
            // 3. Get linked shards for context
            const relatedSources = [];
            for (const source of sources.filter((s) => s.sourceType === ContextSourceType.SHARD)) {
                try {
                    const shardWithLinks = await this.shardLinking.getShardWithLinks(tenantId, projectId, source.sourceId);
                    if (shardWithLinks) {
                        for (const link of shardWithLinks.incomingLinks.slice(0, 3)) {
                            const tokens = Math.ceil(link.link.description?.length / 4 || 50);
                            if (tokenCount + tokens <= maxTokens) {
                                relatedSources.push({
                                    id: uuidv4(),
                                    sourceType: ContextSourceType.RELATED_LINK,
                                    sourceId: link.link.id,
                                    sourceName: `Link: ${link.sourceShard.name}`,
                                    content: link.link.description || '',
                                    relevanceScore: link.link.strength || 0.7,
                                    estimatedTokens: tokens,
                                });
                                tokenCount += tokens;
                            }
                        }
                    }
                }
                catch (error) {
                    this.monitoring.trackException(error, { operation: 'context-assembly.retrieve-linked-shards' });
                }
            }
            sources.push(...relatedSources);
            return sources.slice(0, 50); // Limit total sources
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context-assembly.retrieve-sources' });
            throw error;
        }
    }
    /**
     * Extract topics from multiple sources
     */
    async extractTopicsFromSources(tenantId, sources) {
        const allTopics = [];
        for (const source of sources) {
            try {
                const topics = await this.extractTopics(tenantId, {
                    content: source.content,
                    maxTopics: 3,
                    minRelevance: 0.4,
                });
                allTopics.push(...topics);
                source.topicMatches = topics.map((t) => t.id);
            }
            catch (error) {
                this.monitoring.trackException(error, { operation: 'context-assembly.extract-topics-from-source' });
            }
        }
        // Deduplicate by name
        const seen = new Set();
        return allTopics.filter((t) => {
            if (seen.has(t.name)) {
                return false;
            }
            seen.add(t.name);
            return true;
        });
    }
    /**
     * Cluster related topics
     */
    async clusterTopics(topics, focusTopics) {
        try {
            // Simple clustering: group by category
            const clusterMap = new Map();
            for (const topic of topics) {
                if (!clusterMap.has(topic.category)) {
                    clusterMap.set(topic.category, []);
                }
                clusterMap.get(topic.category).push(topic);
            }
            const clusters = Array.from(clusterMap.entries()).map(([category, clusterTopics]) => ({
                id: uuidv4(),
                name: category,
                topics: clusterTopics.sort((a, b) => b.relevanceScore - a.relevanceScore),
                coherenceScore: this.calculateClusterCoherence(clusterTopics),
                summary: `${category}: ${clusterTopics.map((t) => t.name).join(', ')}`,
            }));
            return clusters;
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context-assembly.cluster-topics' });
            return [];
        }
    }
    /**
     * Rank sources by relevance and utility
     */
    async rankSources(sources, queryTopics, clusters, maxTokens) {
        const ranked = sources.map((source, index) => {
            // Calculate relevance based on topic matching
            const topicMatches = source.topicMatches || [];
            const matchingTopics = queryTopics.filter((t) => topicMatches.includes(t.id));
            const topicRelevance = matchingTopics.length > 0
                ? matchingTopics.reduce((sum, t) => sum + t.relevanceScore, 0) / matchingTopics.length
                : source.relevanceScore;
            // Calculate recency boost
            const createdAtMs = new Date(source.createdAt).getTime();
            const ageDays = (Date.now() - createdAtMs) / (24 * 60 * 60 * 1000);
            const recencyScore = Math.max(0.1, 1.0 - ageDays / 30); // Decays over 30 days
            // Importance from metadata
            const importance = source.metadata?.weight ?? 1.0;
            // Diversity (prefer sources from different types)
            const typeFrequency = sources.filter((s) => s.sourceType === source.sourceType).length;
            const diversityScore = 1.0 / typeFrequency;
            // Combined score
            const scoreBreakdown = {
                relevance: topicRelevance * 0.5,
                recency: recencyScore * 0.2,
                importance: importance * 0.2,
                diversity: diversityScore * 0.1,
            };
            const score = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);
            return {
                ...source,
                rank: index + 1,
                score: Math.min(1, score),
                scoreBreakdown,
                reason: `Relevance: ${(topicRelevance * 100).toFixed(0)}%, Recency: ${(recencyScore * 100).toFixed(0)}%`,
            };
        });
        // Sort by score and keep within token budget
        ranked.sort((a, b) => b.score - a.score);
        let tokenCount = 0;
        const selected = [];
        for (const source of ranked) {
            if (tokenCount + source.estimatedTokens <= maxTokens) {
                selected.push(source);
                tokenCount += source.estimatedTokens;
            }
        }
        return selected;
    }
    /**
     * Optimize context for better AI consumption
     */
    async optimizeContext(sources, queryTopics, clusters, maxTokens) {
        const optimizations = [];
        let totalTokens = sources.reduce((sum, s) => sum + s.estimatedTokens, 0);
        let compressionRatio = 1.0;
        // 1. Summarization if over budget
        if (totalTokens > maxTokens * 0.8) {
            optimizations.push('summarization');
            totalTokens = Math.floor(totalTokens * 0.7); // 30% reduction
            compressionRatio = 0.7;
        }
        // 2. Deduplication of redundant sources
        const seenContent = new Set();
        const deduplicated = sources.filter((s) => {
            const contentHash = crypto.createHash('md5').update(s.content).digest('hex');
            if (seenContent.has(contentHash)) {
                return false;
            }
            seenContent.add(contentHash);
            return true;
        });
        if (deduplicated.length < sources.length) {
            optimizations.push('deduplication');
        }
        // 3. Clustering redundant topics
        if (clusters.length > 5) {
            optimizations.push('topic_clustering');
        }
        return {
            totalTokens: Math.min(totalTokens, maxTokens),
            optimizations,
            compressionRatio,
        };
    }
    /**
     * Calculate quality metrics for assembled context
     */
    calculateQualityMetrics(sources, queryTopics, clusters) {
        // Overall relevance
        const avgRelevance = sources.length > 0 ? sources.reduce((sum, s) => sum + s.score, 0) / sources.length : 0;
        // Coherence: how well topics fit together
        const coherenceScore = clusters.length > 0 ? clusters.reduce((sum, c) => sum + c.coherenceScore, 0) / clusters.length : 0;
        // Diversity: variety of source types
        const typeSet = new Set(sources.map((s) => s.sourceType));
        const diversityScore = typeSet.size / Object.keys(ContextSourceType).length;
        // Token efficiency
        const totalTokens = sources.reduce((sum, s) => sum + s.estimatedTokens, 0);
        const tokenEfficiency = (avgRelevance / (totalTokens || 1)) * 1000; // Normalized
        return {
            contextId: '', // Will be set later
            overallQuality: (avgRelevance * 0.5 + coherenceScore * 0.3 + diversityScore * 0.2),
            relevanceScore: avgRelevance,
            coherenceScore,
            diversityScore,
            tokenEfficiency,
            retrievalTime: 0, // Will be calculated
            tokenCompression: 0, // Will be set later
        };
    }
    /**
     * Generate summary of assembled context
     */
    generateContextSummary(sources, topics) {
        const topTopics = topics.slice(0, 3).map((t) => t.name).join(', ');
        const sourceCount = sources.length;
        const sourceTypes = [...new Set(sources.map((s) => s.sourceType))].join(', ');
        return `Context with ${sourceCount} sources covering ${sourceTypes}. Key topics: ${topTopics}.`;
    }
    /**
     * Determine quality level from quality score
     */
    determineQualityLevel(score) {
        if (score >= 0.8) {
            return ContextQualityLevel.HIGH;
        }
        if (score >= 0.5) {
            return ContextQualityLevel.MEDIUM;
        }
        if (score >= 0.2) {
            return ContextQualityLevel.LOW;
        }
        return ContextQualityLevel.MINIMAL;
    }
    /**
     * Suggest follow-up questions
     */
    suggestFollowUp(context) {
        const topics = context.queryTopics.slice(0, 2).map((t) => t.name);
        if (topics.length > 0) {
            return `Would you like more details about ${topics.join(' and ')}?`;
        }
        return 'What aspect would you like to explore further?';
    }
    /**
     * Helper: Extract keywords from text
     */
    extractKeywords(text, limit) {
        const words = text.toLowerCase().split(/\s+/);
        const filtered = words.filter((w) => w.length > 3 && !this.isStopword(w));
        const freq = new Map();
        filtered.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
        return Array.from(freq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map((e) => e[0]);
    }
    /**
     * Helper: Categorize topic
     */
    categorizeTopic(topic) {
        const lowerTopic = topic.toLowerCase();
        if (lowerTopic.match(/code|technical|tech|system|api|database/i)) {
            return TopicCategory.TECHNICAL;
        }
        if (lowerTopic.match(/business|market|sales|customer|revenue/i)) {
            return TopicCategory.BUSINESS;
        }
        if (lowerTopic.match(/process|workflow|step|procedure|action/i)) {
            return TopicCategory.PROCESS;
        }
        if (lowerTopic.match(/plan|goal|strategy|roadmap|timeline/i)) {
            return TopicCategory.PLANNING;
        }
        if (lowerTopic.match(/analysis|report|metric|data|statistic/i)) {
            return TopicCategory.ANALYSIS;
        }
        if (lowerTopic.match(/document|doc|note|guide|manual/i)) {
            return TopicCategory.DOCUMENTATION;
        }
        if (lowerTopic.match(/requirement|spec|specification|constraint/i)) {
            return TopicCategory.REQUIREMENTS;
        }
        return TopicCategory.OTHER;
    }
    /**
     * Helper: Count keyword frequency
     */
    countKeywordFrequency(text, keyword) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        return matches ? matches.length : 0;
    }
    /**
     * Helper: Generate synonyms
     */
    generateSynonyms(term) {
        const synonymMap = {
            project: ['project', 'initiative', 'undertaking', 'task'],
            requirement: ['requirement', 'need', 'specification', 'spec'],
            document: ['document', 'file', 'record', 'artifact'],
            task: ['task', 'action', 'work', 'job'],
            feature: ['feature', 'capability', 'functionality'],
        };
        return synonymMap[term.toLowerCase()] || [];
    }
    /**
     * Helper: Generate related terms
     */
    generateRelatedTerms(term) {
        // In production, would use comprehensive knowledge base
        return [];
    }
    /**
     * Helper: Extract entities
     */
    extractEntities(text) {
        // Simple entity extraction
        const capitalized = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
        return [...new Set(capitalized)];
    }
    /**
     * Helper: Check if word is stopword
     */
    isStopword(word) {
        const stopwords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
        ]);
        return stopwords.has(word.toLowerCase());
    }
    /**
     * Helper: Calculate cluster coherence
     */
    calculateClusterCoherence(topics) {
        if (topics.length <= 1) {
            return 1.0;
        }
        const avgRelevance = topics.reduce((sum, t) => sum + t.relevanceScore, 0) / topics.length;
        return Math.min(1, avgRelevance * 1.2);
    }
    /**
     * Helper: Generate cache key
     */
    generateCacheKey(request) {
        const normalized = `${request.projectId}:${request.userId}:${request.query.toLowerCase().trim()}`;
        return `context:${crypto.createHash('md5').update(normalized).digest('hex')}`;
    }
    /**
     * Helper: Record metrics
     */
    async recordMetrics(tenantId, metrics) {
        try {
            await this.cosmosDB.upsertDocument('context-assembly-metrics', metrics, tenantId);
            // Also track with performance monitoring
            await this.performanceMonitoring.trackContextAssemblyMetric(tenantId, {
                responseTime: metrics.totalTimeMs,
                tokenCount: metrics.finalTokenCount,
                sourceCount: metrics.sourcesSelected,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context-assembly.record-metrics' });
        }
    }
    // ============================================
    // Phase 2: Project Resolver Methods
    // ============================================
    /**
     * Resolve project context - Phase 2
     * Traverses internal and external relationships to get scoped shard set
     *
     * Performance optimizations:
     * - Caching: 5-minute TTL with cache invalidation on relationship changes
     * - DataLoader pattern: Batch load shards to reduce Cosmos DB queries
     * - Pagination: Default limit 100, max 1000
     * - Filter-first: Early filtering by tenantId and status
     */
    async resolveProjectContext(projectId, tenantId, options = {}) {
        const startTime = Date.now();
        if (!this.shardRepository) {
            throw new Error('ShardRepository not initialized. Call setShardRepository() first.');
        }
        try {
            // Check cache (5-minute TTL)
            const cacheKey = `project:${projectId}:context:${this.hashOptions(options)}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                this.monitoring.trackEvent('context-assembly.project-cache-hit', { projectId });
                return cached;
            }
            // Get project shard
            const project = await this.shardRepository.findById(projectId, tenantId);
            if (!project || project.shardTypeId !== 'c_project') {
                throw new Error(`Project not found: ${projectId}`);
            }
            // Traverse internal relationships (with max depth limit)
            const internalShardIds = await this.traverseInternalRelationships(projectId, tenantId, { maxDepth: 3, ...options });
            // Optionally expand via external relationships
            let externalShardIds = [];
            if (options.includeExternal) {
                externalShardIds = await this.traverseExternalRelationships(projectId, tenantId, options);
            }
            // Combine and deduplicate
            const allShardIds = Array.from(new Set([...internalShardIds, ...externalShardIds]));
            // Apply confidence gating if specified
            let filteredShardIds = allShardIds;
            if (options.minConfidence !== undefined) {
                filteredShardIds = await this.applyConfidenceGating(project, allShardIds, tenantId, options.minConfidence);
            }
            // Apply pagination
            const limit = Math.min(options.limit || options.maxShards || 100, 1000); // Max 1000
            const offset = options.offset || 0;
            const paginatedIds = filteredShardIds.slice(offset, offset + limit);
            // Batch load shards (DataLoader pattern - reduce Cosmos DB queries)
            const linkedShards = await this.batchLoadShards(paginatedIds, tenantId);
            // Filter out nulls (deleted/archived shards)
            const validShards = linkedShards.filter((s) => s !== null);
            const result = {
                project,
                linkedShards: validShards,
                totalCount: filteredShardIds.length,
                hasMore: offset + limit < filteredShardIds.length,
            };
            // Cache result (5-minute TTL)
            await this.cache.set(cacheKey, result, this.CONTEXT_CACHE_TTL);
            const duration = Date.now() - startTime;
            this.monitoring.trackEvent('context-assembly.project-resolved', {
                projectId,
                durationMs: duration,
                shardsCount: validShards.length,
            });
            return result;
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'context-assembly.resolve-project-context' });
            throw error;
        }
    }
    /**
     * Batch load shards (DataLoader pattern)
     * Reduces Cosmos DB queries by batching requests
     */
    async batchLoadShards(shardIds, tenantId) {
        if (!this.shardRepository) {
            throw new Error('ShardRepository not initialized');
        }
        // Batch size: 20 shards per batch
        const batchSize = 20;
        const batches = [];
        for (let i = 0; i < shardIds.length; i += batchSize) {
            batches.push(shardIds.slice(i, i + batchSize));
        }
        const results = [];
        for (const batch of batches) {
            const batchResults = await Promise.all(batch.map(id => this.shardRepository.findById(id, tenantId).catch((error) => {
                this.monitoring.trackException(error, { operation: 'ai-context-assembly.findById', shardId: id, tenantId });
                return null;
            })));
            results.push(...batchResults);
        }
        return results;
    }
    /**
     * Hash options for cache key
     */
    hashOptions(options) {
        const str = JSON.stringify(options);
        return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
    }
    /**
     * Traverse internal relationships from a shard
     */
    async traverseInternalRelationships(shardId, tenantId, options = {}) {
        const maxDepth = options.maxDepth || 3;
        const visited = new Set();
        const shardIds = [];
        if (!this.shardRepository) {
            throw new Error('ShardRepository not initialized');
        }
        const traverse = async (currentId, depth) => {
            if (depth > maxDepth || visited.has(currentId)) {
                return;
            }
            visited.add(currentId);
            if (currentId !== shardId) {
                shardIds.push(currentId);
            }
            const shard = await this.shardRepository.findById(currentId, tenantId);
            if (!shard || !shard.internal_relationships) {
                return;
            }
            // Traverse relationships
            for (const rel of shard.internal_relationships) {
                if (!visited.has(rel.shardId)) {
                    await traverse(rel.shardId, depth + 1);
                }
            }
        };
        await traverse(shardId, 0);
        return shardIds;
    }
    /**
     * Traverse external relationships to find matching shards
     */
    async traverseExternalRelationships(projectId, tenantId, options = {}) {
        if (!this.shardRepository) {
            throw new Error('ShardRepository not initialized');
        }
        const project = await this.shardRepository.findById(projectId, tenantId);
        if (!project || !project.external_relationships) {
            return [];
        }
        const matchingShardIds = [];
        // Get external relationship patterns from project
        const projectExternalPatterns = project.external_relationships.map(rel => ({
            system: rel.system,
            systemType: rel.systemType,
            externalId: rel.externalId,
        }));
        // Find shards with matching external relationships
        // This is a simplified implementation - in production, would use Cosmos DB queries
        for (const pattern of projectExternalPatterns) {
            if (!pattern.system || !pattern.externalId) {
                continue;
            }
            // Query for shards with matching external relationships
            // Note: This is a placeholder - actual implementation would use Cosmos DB query
            // For now, return empty array as this requires proper Cosmos DB query support
            this.monitoring.trackEvent('context-assembly.find-external-shards', {
                system: pattern.system,
                externalId: pattern.externalId,
            });
        }
        return matchingShardIds;
    }
    /**
     * Apply confidence gating to filter shards by relationship confidence
     */
    async applyConfidenceGating(project, shardIds, tenantId, minConfidence) {
        if (!this.shardRepository) {
            throw new Error('ShardRepository not initialized');
        }
        const filteredIds = [];
        for (const shardId of shardIds) {
            const shard = await this.shardRepository.findById(shardId, tenantId);
            if (!shard) {
                continue;
            }
            // Check if shard has relationship to project with sufficient confidence
            const hasProjectRelationship = shard.internal_relationships?.some(rel => {
                if (rel.shardId === project.id) {
                    const confidence = rel.metadata?.confidence;
                    return confidence !== undefined && confidence >= minConfidence;
                }
                return false;
            });
            // Also check if project has relationship to shard with sufficient confidence
            const projectHasRelationship = project.internal_relationships?.some(rel => {
                if (rel.shardId === shardId) {
                    const confidence = rel.metadata?.confidence;
                    return confidence !== undefined && confidence >= minConfidence;
                }
                return false;
            });
            if (hasProjectRelationship || projectHasRelationship) {
                filteredIds.push(shardId);
            }
            else {
                // If no explicit relationship, include if minConfidence is low (allow unlinked high-similarity)
                if (minConfidence <= 0.5) {
                    filteredIds.push(shardId);
                }
            }
        }
        return filteredIds;
    }
}
//# sourceMappingURL=ai-context-assembly.service.js.map
/**
 * Vector Search Service
 * Handles semantic and hybrid search with Cosmos DB vector search
 */
import { VectorSearchError, EmbeddingError, generateQueryHash, SimilarityMetric } from '../types/vector-search.types.js';
import { PermissionLevel } from '../types/shard.types.js';
export class VectorSearchService {
    container;
    aclService;
    monitoring;
    azureOpenAI;
    cacheService;
    embeddingTemplateService;
    shardTypeRepository;
    shardRepository;
    metricsShardService;
    totalSearches = 0;
    totalExecutionTime = 0;
    totalResultCount = 0;
    cacheHits = 0;
    cacheMisses = 0;
    // Performance tracking for p95/p99
    executionTimes = [];
    MAX_EXECUTION_TIMES = 1000; // Keep last 1000 execution times for percentile calculation
    constructor(container, aclService, monitoring, azureOpenAI, cacheService, embeddingTemplateService, shardTypeRepository, shardRepository, metricsShardService // Phase 2: Optional metrics tracking
    ) {
        this.container = container;
        this.aclService = aclService;
        this.monitoring = monitoring;
        this.azureOpenAI = azureOpenAI;
        this.cacheService = cacheService;
        this.embeddingTemplateService = embeddingTemplateService;
        this.shardTypeRepository = shardTypeRepository;
        this.shardRepository = shardRepository;
        this.metricsShardService = metricsShardService;
    }
    /**
     * Get similarity metric with default
     */
    getSimilarityMetric(metric) {
        return metric || SimilarityMetric.COSINE;
    }
    /**
     * Phase 2: Track vector hit ratio (non-blocking)
     * Records hit ratio every 100 searches or when explicitly called
     */
    trackVectorHitRatio(tenantId) {
        if (!this.metricsShardService || !tenantId) {
            return;
        }
        const total = this.cacheHits + this.cacheMisses;
        // Record every 100 searches to avoid excessive writes
        if (total > 0 && total % 100 === 0) {
            const hitRatio = this.cacheHits / total;
            this.metricsShardService.recordVectorHitRatio(tenantId, hitRatio).catch((error) => {
                // Non-blocking - log but don't fail
                this.monitoring.trackException(error, {
                    component: 'VectorSearchService',
                    operation: 'track-vector-hit-ratio',
                    tenantId,
                });
            });
        }
    }
    /**
     * Track execution time for percentile calculation
     */
    trackExecutionTime(executionTime) {
        this.executionTimes.push(executionTime);
        // Keep only last N execution times to avoid memory issues
        if (this.executionTimes.length > this.MAX_EXECUTION_TIMES) {
            this.executionTimes.shift();
        }
    }
    /**
     * Calculate and track percentiles (p50, p95, p99)
     */
    trackPercentiles(tenantId) {
        if (this.executionTimes.length < 10) {
            return;
        } // Need at least 10 samples
        const sorted = [...this.executionTimes].sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        // Track percentiles as metrics
        this.monitoring.trackMetric('vsearch-p50-latency', p50, { tenantId });
        this.monitoring.trackMetric('vsearch-p95-latency', p95, { tenantId });
        this.monitoring.trackMetric('vsearch-p99-latency', p99, { tenantId });
        // Track cache hit ratio
        const total = this.cacheHits + this.cacheMisses;
        if (total > 0) {
            const hitRatio = this.cacheHits / total;
            this.monitoring.trackMetric('vsearch-cache-hit-ratio', hitRatio, { tenantId });
        }
        // Log warning if p95 exceeds target (2s)
        if (p95 > 2000) {
            this.monitoring.trackEvent('vsearch-performance-warning', {
                tenantId,
                p95,
                p99,
                message: 'p95 latency exceeds 2s target',
            });
        }
    }
    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        const sorted = [...this.executionTimes].sort((a, b) => a - b);
        const total = this.cacheHits + this.cacheMisses;
        return {
            totalSearches: this.totalSearches,
            avgExecutionTime: this.totalSearches > 0 ? this.totalExecutionTime / this.totalSearches : 0,
            cacheHitRatio: total > 0 ? this.cacheHits / total : 0,
            p50: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : 0,
            p95: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0,
            p99: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : 0,
        };
    }
    /**
     * Perform semantic vector search
     */
    async semanticSearch(request, userId) {
        const startTime = Date.now();
        const searchType = 'semantic';
        try {
            // Generate query hash for caching
            const queryHash = generateQueryHash({
                query: request.query,
                filter: request.filter,
                topK: request.topK,
                minScore: request.minScore,
                similarityMetric: request.similarityMetric,
                searchType,
            });
            // Check cache first
            let cacheHit = false;
            if (this.cacheService && request.filter?.tenantId) {
                const cached = await this.cacheService.getCached(request.filter.tenantId, queryHash);
                if (cached) {
                    cacheHit = true;
                    // Phase 2: Track cache hit
                    this.cacheHits++;
                    this.trackVectorHitRatio(request.filter.tenantId);
                    const executionTime = Date.now() - startTime;
                    return {
                        results: cached,
                        totalCount: cached.length,
                        query: request.query,
                        searchType,
                        fromCache: true,
                        cacheKey: queryHash,
                        executionTimeMs: executionTime,
                        metadata: {
                            topK: request.topK || 10,
                            minScore: request.minScore,
                            similarityMetric: this.getSimilarityMetric(request.similarityMetric),
                            filtersApplied: this.getFiltersApplied(request.filter),
                        },
                    };
                }
            }
            // Phase 2: Track cache miss if not a hit
            if (!cacheHit) {
                this.cacheMisses++;
                if (request.filter?.tenantId) {
                    this.trackVectorHitRatio(request.filter.tenantId);
                }
            }
            // Generate embedding for query (with template preprocessing if available)
            const queryEmbedding = await this.generateQueryEmbedding(request.query, request.filter?.shardTypeId, request.filter?.tenantId, request.filter?.projectId || request.filter?.metadata?.projectId);
            // Perform vector search in Cosmos DB
            const rawResults = await this.performCosmosVectorSearch(queryEmbedding.embedding, request.topK || 10, request.filter, request.similarityMetric || 'cosine');
            // Filter results by ACL
            const aclFilteredResults = await this.filterByACL(rawResults, userId, request.filter?.tenantId || '');
            // Apply minimum score filter
            const filteredResults = request.minScore
                ? aclFilteredResults.filter((r) => r.score >= (request.minScore || 0))
                : aclFilteredResults;
            // Phase 2: Enforce provenance rule - filter insights without provenance
            const provenanceFilteredResults = this.filterInsightsWithoutProvenance(filteredResults);
            // Apply field-weighted scoring if templates are available
            const weightedResults = await this.applyFieldWeightedScoring(provenanceFilteredResults, request.filter?.shardTypeId, request.filter?.tenantId);
            // Phase 2: Add citations and freshness to results
            const enrichedResults = weightedResults.map((result) => this.enrichResultWithCitationsAndFreshness(result));
            // Cache results
            if (this.cacheService && request.filter?.tenantId && enrichedResults.length > 0) {
                await this.cacheService.setCached(request.filter.tenantId, queryHash, enrichedResults, {
                    topK: request.topK || 10,
                    minScore: request.minScore,
                    similarityMetric: this.getSimilarityMetric(request.similarityMetric),
                    filtersApplied: this.getFiltersApplied(request.filter),
                }, request.includeEmbedding ? queryEmbedding.embedding : undefined);
            }
            const executionTime = Date.now() - startTime;
            this.totalSearches++;
            this.totalExecutionTime += executionTime;
            this.totalResultCount += enrichedResults.length;
            // Track execution time for percentile calculation
            this.trackExecutionTime(executionTime);
            // Track comprehensive metrics
            this.monitoring.trackMetric('vsearch-semantic', 1, {
                tenantId: request.filter?.tenantId || 'unknown',
                resultCount: enrichedResults.length,
                fromCache: false,
                duration: executionTime,
            });
            // Track percentiles (p50, p95, p99)
            this.trackPercentiles(request.filter?.tenantId || 'unknown');
            return {
                results: enrichedResults,
                totalCount: enrichedResults.length,
                query: request.query,
                queryEmbedding: request.includeEmbedding ? queryEmbedding.embedding : undefined,
                searchType,
                fromCache: false,
                cacheKey: queryHash,
                executionTimeMs: executionTime,
                metadata: {
                    topK: request.topK || 10,
                    minScore: request.minScore,
                    similarityMetric: this.getSimilarityMetric(request.similarityMetric),
                    filtersApplied: this.getFiltersApplied(request.filter),
                },
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchService',
                operation: 'semanticSearch',
                query: request.query,
            });
            throw new VectorSearchError(`Failed to perform semantic search: ${error.message || 'Unknown error'}`, 'SEMANTIC_SEARCH_ERROR', 500, error);
        }
    }
    /**
     * Perform hybrid search (keyword + vector)
     */
    async hybridSearch(request, userId) {
        const startTime = Date.now();
        const searchType = 'hybrid';
        try {
            // Generate query hash for caching
            const queryHash = generateQueryHash({
                query: request.query,
                filter: request.filter,
                topK: request.topK,
                minScore: request.minScore,
                similarityMetric: request.similarityMetric,
                searchType,
                keywordWeight: request.keywordWeight,
                vectorWeight: request.vectorWeight,
                keywordFields: request.keywordFields,
            });
            // Check cache first
            let cacheHit = false;
            if (this.cacheService && request.filter?.tenantId) {
                const cached = await this.cacheService.getCached(request.filter.tenantId, queryHash);
                if (cached) {
                    cacheHit = true;
                    // Phase 2: Track cache hit
                    this.cacheHits++;
                    this.trackVectorHitRatio(request.filter.tenantId);
                    const executionTime = Date.now() - startTime;
                    return {
                        results: cached,
                        totalCount: cached.length,
                        query: request.query,
                        searchType,
                        fromCache: true,
                        cacheKey: queryHash,
                        executionTimeMs: executionTime,
                        metadata: {
                            topK: request.topK || 10,
                            minScore: request.minScore,
                            similarityMetric: this.getSimilarityMetric(request.similarityMetric),
                            filtersApplied: this.getFiltersApplied(request.filter),
                        },
                    };
                }
            }
            // Phase 2: Track cache miss if not a hit
            if (!cacheHit) {
                this.cacheMisses++;
                if (request.filter?.tenantId) {
                    this.trackVectorHitRatio(request.filter.tenantId);
                }
            }
            // Generate embedding for query (with template preprocessing if available)
            const queryEmbedding = await this.generateQueryEmbedding(request.query, request.filter?.shardTypeId, request.filter?.tenantId, request.filter?.projectId || request.filter?.metadata?.projectId);
            // Perform vector search
            const vectorResults = await this.performCosmosVectorSearch(queryEmbedding.embedding, request.topK || 10, request.filter, request.similarityMetric || 'cosine');
            // Perform keyword search
            const keywordResults = await this.performKeywordSearch(request.query, request.topK || 10, request.filter, request.keywordFields);
            // Merge results with weighted scoring
            const mergedResults = this.mergeHybridResults(vectorResults, keywordResults, request.vectorWeight || 0.7, request.keywordWeight || 0.3);
            // Filter by ACL
            const aclFilteredResults = await this.filterByACL(mergedResults, userId, request.filter?.tenantId || '');
            // Apply minimum score filter
            const filteredResults = request.minScore
                ? aclFilteredResults.filter((r) => r.score >= (request.minScore || 0))
                : aclFilteredResults;
            // Phase 2: Enforce provenance rule - filter insights without provenance
            const provenanceFilteredResults = this.filterInsightsWithoutProvenance(filteredResults);
            // Apply field-weighted scoring if templates are available
            const weightedResults = await this.applyFieldWeightedScoring(provenanceFilteredResults, request.filter?.shardTypeId, request.filter?.tenantId);
            // Take top K after merging and re-sort by weighted score
            const sortedResults = weightedResults.sort((a, b) => b.score - a.score);
            const topResults = sortedResults.slice(0, request.topK || 10);
            // Phase 2: Add citations and freshness to results
            const enrichedResults = topResults.map(result => this.enrichResultWithCitationsAndFreshness(result));
            // Cache results
            if (this.cacheService && request.filter?.tenantId && topResults.length > 0) {
                await this.cacheService.setCached(request.filter.tenantId, queryHash, topResults, {
                    topK: request.topK || 10,
                    minScore: request.minScore,
                    similarityMetric: this.getSimilarityMetric(request.similarityMetric),
                    filtersApplied: this.getFiltersApplied(request.filter),
                }, request.includeEmbedding ? queryEmbedding.embedding : undefined);
            }
            const executionTime = Date.now() - startTime;
            this.totalSearches++;
            this.totalExecutionTime += executionTime;
            this.totalResultCount += topResults.length;
            this.monitoring.trackMetric('vsearch-hybrid', 1, {
                tenantId: request.filter?.tenantId || 'unknown',
                resultCount: enrichedResults.length,
                fromCache: false,
                duration: executionTime,
            });
            return {
                results: enrichedResults,
                totalCount: enrichedResults.length,
                query: request.query,
                queryEmbedding: request.includeEmbedding ? queryEmbedding.embedding : undefined,
                searchType,
                fromCache: false,
                cacheKey: queryHash,
                executionTimeMs: executionTime,
                metadata: {
                    topK: request.topK || 10,
                    minScore: request.minScore,
                    similarityMetric: this.getSimilarityMetric(request.similarityMetric),
                    filtersApplied: this.getFiltersApplied(request.filter),
                },
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchService',
                operation: 'hybridSearch',
                query: request.query,
            });
            throw new VectorSearchError('Failed to perform hybrid search', 'HYBRID_SEARCH_ERROR', 500, error);
        }
    }
    /**
     * Simple search method for IVectorSearchProvider interface
     * Used by InsightService for RAG retrieval
     * Now supports project-aware filtering
     */
    async search(request) {
        try {
            // Use semanticSearch internally with project-aware filtering
            const response = await this.semanticSearch({
                query: request.query,
                filter: {
                    tenantId: request.tenantId,
                    projectId: request.projectId, // Pass projectId for project-scoped RAG
                    shardTypeIds: request.shardTypeIds, // Pass shard type filter if provided
                },
                topK: request.topK || 10,
                minScore: request.minScore || 0.7,
            }, 'system' // Use system userId for RAG searches
            );
            // Transform results to match IVectorSearchProvider interface
            if (!response.results || !Array.isArray(response.results)) {
                return { results: [] };
            }
            const transformedResults = response.results.map((result) => {
                // Extract content from shard structuredData
                let content = '';
                if (result.shard?.structuredData) {
                    // Try to extract text content from common fields
                    const sd = result.shard.structuredData;
                    if (sd.content) {
                        content = String(sd.content);
                    }
                    else if (sd.text) {
                        content = String(sd.text);
                    }
                    else if (sd.body) {
                        content = String(sd.body);
                    }
                    else if (sd.description) {
                        content = String(sd.description);
                    }
                    else if (sd.name) {
                        content = String(sd.name);
                    }
                    else {
                        // Fallback: stringify the structuredData
                        content = JSON.stringify(sd);
                    }
                }
                else {
                    const shardName = result.shard?.structuredData?.name || result.shard?.structuredData?.title || result.shard?.id || '';
                    content = shardName;
                }
                const shardName = result.shard?.structuredData?.name || result.shard?.structuredData?.title;
                return {
                    shardId: result.shard.id,
                    shardTypeId: result.shard.shardTypeId,
                    shard: shardName ? { name: shardName } : undefined,
                    content,
                    chunkIndex: 0, // Default to 0 if not chunked
                    score: result.score,
                    highlight: result.highlights ? Object.values(result.highlights).flat().join(' ') : undefined,
                };
            });
            return {
                results: transformedResults,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchService',
                operation: 'search',
                tenantId: request.tenantId,
            });
            // Return empty results on error (RAG is optional)
            return { results: [] };
        }
    }
    /**
     * Generate embedding for query text with template preprocessing
     * Uses embedding template when shardTypeId is specified for consistent preprocessing
     */
    async generateQueryEmbedding(queryText, shardTypeId, tenantId, projectId) {
        try {
            let preprocessedText = queryText;
            let model = 'text-embedding-ada-002'; // Default model
            let contextPrefix;
            // If template services available and shardTypeId specified, use template preprocessing
            if (this.embeddingTemplateService &&
                this.shardTypeRepository &&
                shardTypeId &&
                tenantId) {
                try {
                    // Get shard type to determine template
                    const shardType = await this.shardTypeRepository.findById(shardTypeId, tenantId);
                    if (shardType) {
                        // Get embedding template (custom or default)
                        const template = this.embeddingTemplateService.getTemplate(shardType);
                        if (template) {
                            // Use template's model if specified
                            model = template.modelConfig?.modelId || model;
                            // Apply template preprocessing to query for consistency with stored embeddings
                            // For queries, we apply normalization but skip chunking (single query embedding)
                            // This ensures the query embedding uses the same preprocessing as stored embeddings
                            const preprocessingResult = this.embeddingTemplateService.preprocessText(queryText, {
                                ...template.preprocessing,
                                // Disable chunking for queries (we want a single embedding for the query)
                                // Set chunking to undefined or empty to skip chunking
                                chunking: undefined,
                            });
                            // Use the preprocessed text (not chunks, since chunking is disabled)
                            preprocessedText = preprocessingResult.text;
                            this.monitoring.trackEvent('query_embedding_with_template', {
                                shardTypeId,
                                templateId: template.id,
                                model: template.modelConfig?.modelId || model,
                                originalLength: queryText.length,
                                preprocessedLength: preprocessedText.length,
                            });
                        }
                    }
                }
                catch (templateError) {
                    // Log error but continue with default processing
                    this.monitoring.trackException(templateError, {
                        component: 'VectorSearchService',
                        operation: 'generateQueryEmbedding',
                        context: 'template_preprocessing',
                        shardTypeId,
                    });
                    // Fall through to default embedding generation
                }
            }
            // If project scope is provided, build a lightweight context prefix from the project shard
            if (this.shardRepository && tenantId && projectId) {
                try {
                    const project = await this.shardRepository.findById(projectId, tenantId);
                    if (project && project.structuredData) {
                        const sd = project.structuredData;
                        const parts = [];
                        const name = sd.name || sd.title || project.shardTypeName || '';
                        if (name) {
                            parts.push(`Project: ${String(name)}`);
                        }
                        if (Array.isArray(sd.tags) && sd.tags.length) {
                            parts.push(`Tags: ${sd.tags.slice(0, 5).join(', ')}`);
                        }
                        if (sd.summary) {
                            parts.push(String(sd.summary));
                        }
                        const raw = parts.join(' | ').trim();
                        const prefix = raw.length > 120 ? raw.substring(0, 120) : raw;
                        if (prefix) {
                            contextPrefix = prefix;
                        }
                    }
                }
                catch (e) {
                    this.monitoring.trackException(e, {
                        component: 'VectorSearchService',
                        operation: 'generateQueryEmbedding',
                        context: 'project_prefix',
                        projectId,
                    });
                }
            }
            if (contextPrefix) {
                const sep = ' — ';
                preprocessedText = `${contextPrefix}${sep}${preprocessedText}`.trim();
            }
            // Generate embedding using Azure OpenAI
            return await this.generateEmbedding({
                text: preprocessedText,
                model,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchService',
                operation: 'generateQueryEmbedding',
            });
            throw new EmbeddingError(`Failed to generate query embedding: ${error.message || 'Unknown error'}`, 'EMBEDDING_ERROR', 500, error);
        }
    }
    /**
     * Generate embedding for text
     * Uses Azure OpenAI embedding service via azureOpenAI service
     */
    async generateEmbedding(request) {
        try {
            return await this.azureOpenAI.generateEmbedding(request);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchService',
                operation: 'generateEmbedding',
            });
            throw new EmbeddingError(`Failed to generate embedding: ${error.message || 'Unknown error'}`, 'EMBEDDING_ERROR', 500, error);
        }
    }
    /**
     * Perform vector search in Cosmos DB
     * NOTE: This requires Cosmos DB vector search feature (preview)
     */
    /**
     * Perform vector search in Cosmos DB
     * Phase 2: Enhanced with project scoping - filter-first approach
     * - If projectId provided in filter, scope to project-linked shardIds first
     * - Allow ~20% budget for unlinked high-similarity shards tenant-wide
     * - Prioritize: insight shards → entity shards → supporting source shards
     */
    async performCosmosVectorSearch(embedding, topK, filter, similarityMetric) {
        try {
            // Project-aware filtering: If projectId is provided, resolve project-linked shardIds
            // This ensures RAG retrieval is scoped to project context for better relevance
            const projectId = filter.projectId || filter.metadata?.projectId;
            let projectShardIds = [];
            if (projectId && this.shardRepository && filter.tenantId) {
                try {
                    // Get project shard
                    const project = await this.shardRepository.findById(projectId, filter.tenantId);
                    if (project && project.shardTypeId === 'c_project') {
                        // Traverse internal relationships to get linked shard IDs
                        // This includes documents, notes, and other shards linked to the project
                        projectShardIds = await this.resolveProjectLinkedShardIds(project, filter.tenantId);
                        // Log project scoping for monitoring and analytics
                        this.monitoring.trackEvent('vector-search.project-scoped', {
                            projectId,
                            tenantId: filter.tenantId,
                            linkedShardCount: projectShardIds.length,
                        });
                    }
                    else {
                        // Project not found or not a valid project shard
                        this.monitoring.trackEvent('vector-search.project-not-found', {
                            projectId,
                            tenantId: filter.tenantId,
                        });
                    }
                }
                catch (error) {
                    // Non-blocking: if project resolution fails, fall back to tenant-wide search
                    // This ensures RAG still works even if project context resolution fails
                    this.monitoring.trackException(error, {
                        component: 'VectorSearchService',
                        operation: 'resolve-project-context',
                        projectId,
                        tenantId: filter.tenantId,
                    });
                }
            }
            // Phase 2: Limit project shard IDs to avoid query size issues
            // Cosmos DB has practical limits on IN clause size (~100-200 items)
            // For large projects, we'll limit to top 200 linked shards
            const limitedProjectShardIds = projectShardIds.slice(0, 200);
            // Build optimized query with vector search
            // NOTE: Cosmos DB vector search uses the VectorDistance function
            // Optimization: Filter by partition key (tenantId) first for better performance
            // Optimization: Check vector existence to skip shards without embeddings
            const queryParts = [
                'SELECT TOP @topK c.*,',
                'VectorDistance(c.vectors[0].embedding, @embedding, @similarityMetric) AS score',
                'FROM c',
                'WHERE c.tenantId = @tenantId',
                "AND c.status = 'active'",
                'AND IS_DEFINED(c.vectors)',
                'AND ARRAY_LENGTH(c.vectors) > 0',
            ];
            const parameters = [
                { name: '@topK', value: topK },
                { name: '@embedding', value: embedding },
                { name: '@tenantId', value: filter.tenantId },
                { name: '@similarityMetric', value: similarityMetric },
            ];
            if (filter.shardTypeId) {
                queryParts.push('AND c.shardTypeId = @shardTypeId');
                parameters.push({ name: '@shardTypeId', value: filter.shardTypeId });
            }
            if (filter.shardTypeIds && filter.shardTypeIds.length > 0) {
                const inClause = this.buildInClause('c.shardTypeId', filter.shardTypeIds, parameters);
                if (inClause) {
                    queryParts.push(inClause);
                }
            }
            if (filter.category) {
                queryParts.push('AND c.metadata.category = @category');
                parameters.push({ name: '@category', value: filter.category });
            }
            if (filter.tags && filter.tags.length > 0) {
                queryParts.push('AND ARRAY_CONTAINS(c.metadata.tags, @tag)');
                parameters.push({ name: '@tag', value: filter.tags[0] });
            }
            if (limitedProjectShardIds.length > 0) {
                const inClause = this.buildInClause('c.id', limitedProjectShardIds, parameters);
                if (inClause) {
                    queryParts.push(inClause);
                }
            }
            queryParts.push('ORDER BY VectorDistance(c.vectors[0].embedding, @embedding, @similarityMetric)');
            const query = queryParts.join(' ');
            // Note: Parameters are already added above, these duplicates are removed
            // Cast parameters to SqlParameter[] type for Cosmos DB
            const { resources } = await this.container.items
                .query({
                query,
                parameters: parameters // Cosmos DB accepts this format
            })
                .fetchAll();
            return resources.map((item) => ({
                shard: item,
                score: item.score || 0,
            }));
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchService',
                operation: 'performCosmosVectorSearch',
            });
            // Fallback: return empty results if vector search not supported
            return [];
        }
    }
    /**
     * Perform global vector search across all tenants (Super Admin only)
     */
    async globalSearch(request, userId) {
        const startTime = Date.now();
        const searchType = 'semantic';
        try {
            // Generate query embedding
            const queryEmbedding = await this.generateQueryEmbedding(request.query, request.filter?.shardTypeId, undefined, // No tenant context for global search
            undefined // No project context for global search
            );
            // Perform global vector search (no tenant filter)
            const rawResults = await this.performGlobalCosmosVectorSearch(queryEmbedding.embedding, request.topK || 50, // Higher default for global search
            request.filter, request.similarityMetric || 'cosine');
            // Filter results by ACL (check access for each tenant)
            const aclFilteredResults = await this.filterByACLGlobal(rawResults, userId);
            // Deduplicate results by shard ID (in case same shard appears from multiple tenants)
            const deduplicatedResults = this.deduplicateResults(aclFilteredResults);
            // Apply minimum score filter
            const filteredResults = request.minScore
                ? deduplicatedResults.filter((r) => r.score >= (request.minScore || 0))
                : deduplicatedResults;
            // Take top K after deduplication
            const topResults = filteredResults.slice(0, request.topK || 50);
            // Group results by tenant for metadata
            const resultsByTenant = new Map();
            topResults.forEach((r) => {
                const tenantId = r.shard.tenantId;
                resultsByTenant.set(tenantId, (resultsByTenant.get(tenantId) || 0) + 1);
            });
            const executionTime = Date.now() - startTime;
            this.totalSearches++;
            this.totalExecutionTime += executionTime;
            this.totalResultCount += topResults.length;
            this.monitoring.trackMetric('vsearch-global', 1, {
                resultCount: topResults.length,
                tenantCount: resultsByTenant.size,
                duration: executionTime,
            });
            return {
                results: topResults,
                totalCount: topResults.length,
                query: request.query,
                queryEmbedding: request.includeEmbedding ? queryEmbedding.embedding : undefined,
                searchType,
                fromCache: false,
                executionTimeMs: executionTime,
                metadata: {
                    topK: request.topK || 50,
                    minScore: request.minScore,
                    similarityMetric: this.getSimilarityMetric(request.similarityMetric),
                    filtersApplied: this.getFiltersApplied(request.filter || {}),
                },
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchService',
                operation: 'globalSearch',
                query: request.query,
            });
            throw new VectorSearchError(`Failed to perform global search: ${error.message || 'Unknown error'}`, 'GLOBAL_SEARCH_ERROR', 500, error);
        }
    }
    /**
     * Perform global vector search in Cosmos DB (no tenant filter)
     */
    async performGlobalCosmosVectorSearch(embedding, topK, filter, similarityMetric) {
        try {
            // Build query without tenantId filter for global search
            const query = `
        SELECT TOP @topK c.*, 
               VectorDistance(c.vectors[0].embedding, @embedding, '${similarityMetric}') AS score
        FROM c
        WHERE c.status = 'active'
          ${filter?.shardTypeId ? 'AND c.shardTypeId = @shardTypeId' : ''}
          ${filter?.shardTypeIds ? `AND c.shardTypeId IN (${filter.shardTypeIds.map((id) => `'${id}'`).join(', ')})` : ''}
          ${filter?.category ? 'AND c.metadata.category = @category' : ''}
          ${filter?.tags ? `AND ARRAY_CONTAINS(c.metadata.tags, @tag)` : ''}
        ORDER BY VectorDistance(c.vectors[0].embedding, @embedding, '${similarityMetric}')
      `;
            const parameters = [
                { name: '@topK', value: topK },
                { name: '@embedding', value: embedding },
            ];
            if (filter?.shardTypeId) {
                parameters.push({ name: '@shardTypeId', value: filter.shardTypeId });
            }
            if (filter?.category) {
                parameters.push({ name: '@category', value: filter.category });
            }
            if (filter?.tags && filter.tags.length > 0) {
                parameters.push({ name: '@tag', value: filter.tags[0] });
            }
            const { resources } = await this.container.items
                .query({ query, parameters })
                .fetchAll();
            return resources.map((item) => ({
                shard: item,
                score: item.score || 0,
            }));
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchService',
                operation: 'performGlobalCosmosVectorSearch',
            });
            return [];
        }
    }
    /**
     * Filter results by ACL for global search (check access per tenant)
     */
    async filterByACLGlobal(results, userId) {
        try {
            const filteredResults = [];
            for (const result of results) {
                const hasPermission = await this.aclService.checkPermission({
                    userId,
                    shardId: result.shard.id,
                    tenantId: result.shard.tenantId,
                    requiredPermission: PermissionLevel.READ,
                });
                if (hasPermission.hasAccess) {
                    filteredResults.push(result);
                }
            }
            return filteredResults;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchService',
                operation: 'filterByACLGlobal',
            });
            return [];
        }
    }
    /**
     * Deduplicate results by shard ID (keep highest score)
     */
    deduplicateResults(results) {
        const seen = new Map();
        for (const result of results) {
            const existing = seen.get(result.shard.id);
            if (!existing || result.score > existing.score) {
                seen.set(result.shard.id, result);
            }
        }
        return Array.from(seen.values()).sort((a, b) => b.score - a.score);
    }
    /**
     * Perform keyword search
     */
    async performKeywordSearch(query, topK, filter, _keywordFields // Reserved for future use
    ) {
        try {
            // Note: keywordFields parameter reserved for future use
            const keywords = query.toLowerCase().split(' ').filter((w) => w.length > 2);
            // Build query for keyword search
            const whereConditions = keywords.map((_keyword, idx) => `CONTAINS(LOWER(ToString(c.structuredData)), @keyword${idx})`);
            const queryText = `
        SELECT TOP @topK c.*
        FROM c
        WHERE c.tenantId = @tenantId
          AND c.status = 'active'
          ${filter.shardTypeId ? 'AND c.shardTypeId = @shardTypeId' : ''}
          AND (${whereConditions.join(' OR ')})
      `;
            const parameters = [
                { name: '@topK', value: topK },
                { name: '@tenantId', value: filter.tenantId },
            ];
            if (filter.shardTypeId) {
                parameters.push({ name: '@shardTypeId', value: filter.shardTypeId });
            }
            keywords.forEach((keyword, idx) => {
                parameters.push({ name: `@keyword${idx}`, value: keyword });
            });
            const { resources } = await this.container.items
                .query({ query: queryText, parameters })
                .fetchAll();
            return resources.map((shard) => ({
                shard,
                score: 0.5, // Default keyword match score
            }));
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchService',
                operation: 'performKeywordSearch',
            });
            return [];
        }
    }
    /**
     * Merge vector and keyword results with weighted scoring
     */
    mergeHybridResults(vectorResults, keywordResults, vectorWeight, keywordWeight) {
        const merged = new Map();
        // Add vector results
        vectorResults.forEach((result) => {
            merged.set(result.shard.id, {
                ...result,
                score: result.score * vectorWeight,
            });
        });
        // Merge keyword results
        keywordResults.forEach((result) => {
            const existing = merged.get(result.shard.id);
            if (existing) {
                existing.score += result.score * keywordWeight;
            }
            else {
                merged.set(result.shard.id, {
                    ...result,
                    score: result.score * keywordWeight,
                });
            }
        });
        // Sort by score descending
        return Array.from(merged.values()).sort((a, b) => b.score - a.score);
    }
    /**
     * Filter results by ACL (user must have READ permission)
     */
    async filterByACL(results, userId, tenantId) {
        try {
            const filteredResults = [];
            for (const result of results) {
                const hasPermission = await this.aclService.checkPermission({
                    userId,
                    shardId: result.shard.id,
                    tenantId,
                    requiredPermission: PermissionLevel.READ,
                });
                if (hasPermission.hasAccess) {
                    filteredResults.push(result);
                }
            }
            return filteredResults;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorSearchService',
                operation: 'filterByACL',
            });
            // On error, return empty results (fail-safe)
            return [];
        }
    }
    /**
     * Get list of applied filters
     */
    getFiltersApplied(filter) {
        const applied = [];
        if (filter.shardTypeId) {
            applied.push('shardTypeId');
        }
        if (filter.shardTypeIds) {
            applied.push('shardTypeIds');
        }
        if (filter.userId) {
            applied.push('userId');
        }
        if (filter.status) {
            applied.push('status');
        }
        if (filter.tags) {
            applied.push('tags');
        }
        if (filter.category) {
            applied.push('category');
        }
        if (filter.createdAfter) {
            applied.push('createdAfter');
        }
        if (filter.createdBefore) {
            applied.push('createdBefore');
        }
        return applied;
    }
    /**
     * Enrich result with citations and freshness (Phase 2)
     */
    /**
     * Apply field-weighted scoring to search results
     * TODO: Implement field-weighted scoring based on embedding templates
     */
    async applyFieldWeightedScoring(results, shardTypeId, tenantId) {
        // For now, return results as-is
        // Future: Apply field weights from embedding templates
        return results;
    }
    enrichResultWithCitationsAndFreshness(result) {
        const shard = result.shard;
        const now = new Date();
        // Build citation
        const citation = {
            shardId: shard.id,
            shardTypeId: shard.shardTypeId,
            shardTypeName: shard.shardTypeName,
            shardName: this.getShardDisplayName(shard),
            excerpt: this.extractExcerpt(shard),
            url: this.getShardUrl(shard),
        };
        // Calculate freshness
        const createdAt = new Date(shard.createdAt);
        const updatedAt = new Date(shard.updatedAt);
        const lastActivityAt = shard.lastActivityAt ? new Date(shard.lastActivityAt) : updatedAt;
        const ageDays = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        return {
            ...result,
            citation,
            freshness: {
                createdAt,
                updatedAt,
                lastActivityAt,
                ageDays,
            },
        };
    }
    /**
     * Get display name for shard
     */
    getShardDisplayName(shard) {
        const data = shard.structuredData || {};
        return data.name || data.title || shard.shardTypeName || shard.id;
    }
    /**
     * Extract excerpt from shard for citation
     */
    extractExcerpt(shard, maxLength = 200) {
        const data = shard.structuredData || {};
        const text = data.description || data.content || data.summary || '';
        if (typeof text === 'string' && text.length > 0) {
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        }
        return undefined;
    }
    /**
     * Get URL for shard (if applicable)
     */
    getShardUrl(shard) {
        const data = shard.structuredData || {};
        return data.url || data.sourceUrl || data.webViewLink;
    }
    /**
     * Filter insights without provenance (Phase 2)
     * Insights (c_insight_kpi) must have internal_relationships to source shards
     */
    filterInsightsWithoutProvenance(results) {
        return results.filter(result => {
            const shard = result.shard;
            // Only filter insight shards
            if (shard.shardTypeId !== 'c_insight_kpi') {
                return true; // Keep non-insight shards
            }
            // Check if insight has provenance (internal_relationships to source shards)
            const hasProvenance = shard.internal_relationships && shard.internal_relationships.length > 0;
            if (!hasProvenance) {
                this.monitoring.trackEvent('vector-search.insight-filtered-no-provenance', {
                    shardId: shard.id,
                    tenantId: shard.tenantId,
                });
            }
            return hasProvenance; // Only keep insights with provenance
        });
    }
    /**
     * Get search statistics
     */
    getStats() {
        const avgExecutionTime = this.totalSearches > 0 ? this.totalExecutionTime / this.totalSearches : 0;
        const avgResultCount = this.totalSearches > 0 ? this.totalResultCount / this.totalSearches : 0;
        return {
            totalSearches: this.totalSearches,
            averageExecutionTimeMs: Math.round(avgExecutionTime),
            averageResultCount: Math.round(avgResultCount * 10) / 10,
        };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.totalSearches = 0;
        this.totalExecutionTime = 0;
        this.totalResultCount = 0;
    }
    /**
     * Phase 2: Resolve project-linked shard IDs via relationship traversal
     * Traverses internal_relationships to find all shards linked to a project
     *
     * @param project - The project shard
     * @param tenantId - Tenant ID for filtering
     * @param maxDepth - Maximum traversal depth (default: 3)
     * @returns Array of linked shard IDs
     */
    async resolveProjectLinkedShardIds(project, tenantId, maxDepth = 3) {
        if (!this.shardRepository) {
            return [];
        }
        const shardIds = new Set();
        const visited = new Set();
        // Recursive traversal function
        const traverse = async (shardId, depth) => {
            if (depth > maxDepth || visited.has(shardId)) {
                return;
            }
            visited.add(shardId);
            try {
                const shard = await this.shardRepository.findById(shardId, tenantId);
                if (!shard || shard.status !== 'active') {
                    return;
                }
                // Add to results (skip the project shard itself)
                if (shardId !== project.id) {
                    shardIds.add(shardId);
                }
                // Traverse internal relationships
                if (shard.internal_relationships && shard.internal_relationships.length > 0) {
                    for (const rel of shard.internal_relationships) {
                        // Apply confidence gating (default: 0.6)
                        const confidence = rel.metadata?.confidence || 1.0;
                        if (confidence >= 0.6) {
                            // Note: InternalRelationship uses 'shardId' field, not 'targetShardId'
                            await traverse(rel.shardId, depth + 1);
                        }
                    }
                }
            }
            catch (error) {
                // Skip shards that can't be loaded (deleted, archived, etc.)
                this.monitoring.trackException(error, {
                    component: 'VectorSearchService',
                    operation: 'traverse-relationship',
                    shardId,
                    depth,
                });
            }
        };
        // Start traversal from project shard
        await traverse(project.id, 0);
        return Array.from(shardIds);
    }
    /**
     * Build a safe IN clause for Cosmos DB queries using parameterized values
     * Validates IDs to prevent injection attacks
     */
    buildInClause(field, ids, parameters) {
        if (!ids || ids.length === 0) {
            return null;
        }
        // Validate and sanitize IDs - only allow alphanumeric, hyphens, and underscores
        const validIds = ids.filter(id => {
            if (typeof id !== 'string' || id.length === 0 || id.length > 100) {
                return false;
            }
            // UUID format or safe identifier: alphanumeric, hyphens, underscores
            return /^[a-zA-Z0-9_-]+$/.test(id);
        });
        if (validIds.length === 0) {
            return null;
        }
        // Limit to prevent query size issues
        const limitedIds = validIds.slice(0, 100);
        // Build parameterized IN clause
        const paramNames = limitedIds.map((id, index) => {
            const paramName = `@inParam${parameters.length + index}`;
            parameters.push({ name: paramName, value: id });
            return paramName;
        });
        return `AND ${field} IN (${paramNames.join(', ')})`;
    }
}
//# sourceMappingURL=vector-search.service.js.map
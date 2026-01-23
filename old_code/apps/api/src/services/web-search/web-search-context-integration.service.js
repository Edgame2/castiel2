/**
 * Web Search Context Integration Service
 *
 * Integrates web search and deep search capabilities with the Context Assembly system.
 * Auto-triggers web search based on conversation intent, performs semantic retrieval
 * from scraped web pages, and merges results into AssembledContext for AI insights.
 *
 * Features:
 * - Auto-trigger detection based on intent analysis
 * - Vector similarity search against c_webpages chunks
 * - Semantic retrieval with relevance ranking
 * - Integration with existing Context Assembly pipeline
 */
/**
 * Web Search Context Integration Service
 */
export class WebSearchContextIntegrationService {
    webSearchService;
    embeddingService;
    webpagesContainer;
    redis;
    monitoring;
    // Auto-trigger thresholds
    AUTO_TRIGGER_CONFIDENCE = 0.7; // Intent confidence threshold
    MIN_RELEVANCE_SCORE = 0.65; // Minimum cosine similarity
    MAX_CACHE_AGE_HOURS = 24; // Use pages scraped within 24 hours
    MAX_CHUNKS_DEFAULT = 10; // Default max chunks to include
    // Redis cache settings
    REDIS_CACHE_TTL = 3600; // 1 hour in seconds
    REDIS_CACHE_PREFIX = 'websearch:';
    // Keywords that suggest web search need
    WEB_SEARCH_KEYWORDS = [
        'latest', 'current', 'recent', 'today', 'news', 'update', 'trend',
        'market', 'price', 'stock', 'what is', 'who is', 'how to', 'when did',
        'search', 'find', 'look up', 'research', 'investigate', 'external',
        'web', 'online', 'internet', 'source', 'article', 'report'
    ];
    constructor(webSearchService, embeddingService, webpagesContainer, redis, monitoring) {
        this.webSearchService = webSearchService;
        this.embeddingService = embeddingService;
        this.webpagesContainer = webpagesContainer;
        this.redis = redis;
        this.monitoring = monitoring;
    }
    // ========================================================================
    // Main Integration Method
    // ========================================================================
    /**
     * Integrate web search results into context based on intent
     *
     * This is the main entry point called by InsightService.assembleContext()
     */
    async integrateWebSearchContext(tenantId, projectId, intent, userQuery, baseContext, options = {}) {
        const startTime = Date.now();
        // Check if web search should be triggered
        const shouldTrigger = this.shouldTriggerWebSearch(intent, userQuery, options);
        if (!shouldTrigger.trigger) {
            return {
                triggered: false,
                reason: shouldTrigger.reason,
                ragChunks: [],
                metadata: {
                    chunksRetrieved: 0,
                    deepSearchEnabled: false,
                    durationMs: Date.now() - startTime,
                },
            };
        }
        // Extract search query from user query
        const searchQuery = this.extractSearchQuery(userQuery, intent);
        try {
            // Step 1: Check Redis cache first (if available)
            const cacheKey = this.getCacheKey(tenantId, projectId, searchQuery);
            let cachedPages = [];
            let cacheHit = false;
            if (this.redis) {
                try {
                    const cached = await this.redis.get(cacheKey);
                    if (cached) {
                        cachedPages = JSON.parse(cached);
                        cacheHit = true;
                    }
                }
                catch (error) {
                    this.monitoring?.trackException(error, { operation: 'web-search-context-integration.redis-cache-read' });
                }
            }
            // Step 2: If Redis cache miss, check Cosmos DB for recent pages
            if (!cacheHit) {
                cachedPages = await this.getCachedPages(tenantId, projectId, searchQuery, options.maxCacheAge || this.MAX_CACHE_AGE_HOURS);
                // Store in Redis cache if available
                if (this.redis && cachedPages.length > 0) {
                    try {
                        await this.redis.setex(cacheKey, this.REDIS_CACHE_TTL, JSON.stringify(cachedPages));
                    }
                    catch (error) {
                        this.monitoring?.trackException(error, { operation: 'web-search-context-integration.redis-cache-write' });
                    }
                }
            }
            let pagesScraped = cachedPages.length;
            // Step 3: If no cached pages or cache is stale, trigger web search
            if (cachedPages.length === 0) {
                await this.triggerWebSearch(tenantId, projectId, searchQuery, options.enableDeepSearch || false, options.deepSearchPages || 3);
                // Re-fetch cached pages after search
                const newPages = await this.getCachedPages(tenantId, projectId, searchQuery, 1 // Just scraped, so use very recent
                );
                pagesScraped = newPages.length;
                cachedPages.push(...newPages);
                // Update Redis cache with new pages
                if (this.redis && newPages.length > 0) {
                    try {
                        await this.redis.setex(cacheKey, this.REDIS_CACHE_TTL, JSON.stringify(newPages));
                    }
                    catch (error) {
                        this.monitoring?.trackException(error, { operation: 'web-search-context-integration.redis-cache-update' });
                    }
                }
            }
            // Step 3: Perform semantic retrieval on cached chunks
            const ragChunks = await this.performSemanticRetrieval(userQuery, cachedPages, options.minRelevanceScore || this.MIN_RELEVANCE_SCORE, options.maxChunks || this.MAX_CHUNKS_DEFAULT);
            // Step 4: Calculate metadata
            const totalChunks = cachedPages.reduce((sum, page) => sum + (page.chunks?.length || 0), 0);
            const avgScore = ragChunks.length > 0
                ? ragChunks.reduce((sum, chunk) => sum + chunk.score, 0) / ragChunks.length
                : 0;
            return {
                triggered: true,
                reason: shouldTrigger.reason,
                ragChunks,
                metadata: {
                    query: searchQuery,
                    pagesScraped,
                    totalChunksAvailable: totalChunks,
                    chunksRetrieved: ragChunks.length,
                    avgRelevanceScore: avgScore,
                    deepSearchEnabled: options.enableDeepSearch || false,
                    durationMs: Date.now() - startTime,
                },
            };
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'web-search-context-integration.integrate' });
            return {
                triggered: false,
                reason: `Failed to integrate web search: ${error.message}`,
                ragChunks: [],
                metadata: {
                    chunksRetrieved: 0,
                    deepSearchEnabled: false,
                    durationMs: Date.now() - startTime,
                },
            };
        }
    }
    // ========================================================================
    // Auto-Trigger Logic
    // ========================================================================
    /**
     * Determine if web search should be auto-triggered based on intent
     */
    shouldTriggerWebSearch(intent, userQuery, options) {
        // Check if explicitly disabled
        if (options.skipWebSearch) {
            return { trigger: false, reason: 'Web search explicitly disabled' };
        }
        // Check intent type - 'search' type always triggers
        if (intent.insightType === 'search') {
            return { trigger: true, reason: 'Intent type is "search"' };
        }
        // Check intent confidence
        if (intent.confidence < this.AUTO_TRIGGER_CONFIDENCE) {
            return { trigger: false, reason: 'Intent confidence too low' };
        }
        // Check for web search keywords in query
        const queryLower = userQuery.toLowerCase();
        const hasWebSearchKeywords = this.WEB_SEARCH_KEYWORDS.some(keyword => queryLower.includes(keyword));
        if (hasWebSearchKeywords) {
            return { trigger: true, reason: 'Query contains web search keywords' };
        }
        // Check if query is a question about current/external information
        const isExternalInfoQuery = queryLower.match(/\b(what|who|when|where|why|how)\b/) &&
            queryLower.match(/\b(latest|current|recent|today|now)\b/);
        if (isExternalInfoQuery) {
            return { trigger: true, reason: 'Query appears to request current external information' };
        }
        // Default: no trigger
        return { trigger: false, reason: 'No web search trigger conditions met' };
    }
    /**
     * Extract clean search query from user query
     */
    extractSearchQuery(userQuery, intent) {
        // Remove question words if present
        let query = userQuery
            .replace(/^(what|who|when|where|why|how|tell me|show me|find|search for|look up)/i, '')
            .trim();
        // Remove trailing question marks
        query = query.replace(/\?+$/, '').trim();
        // If query is too short, use original
        if (query.length < 10) {
            query = userQuery;
        }
        return query;
    }
    // ========================================================================
    // Cached Page Retrieval
    // ========================================================================
    /**
     * Get cached web pages for a query from c_webpages container
     */
    async getCachedPages(tenantId, projectId, query, maxAgeHours) {
        const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        try {
            const { resources } = await this.webpagesContainer.items
                .query({
                query: `
                        SELECT * FROM c
                        WHERE c.tenantId = @tenantId
                        AND c.projectId = @projectId
                        AND c.shardType = 'c_webpages'
                        AND c.metadata.sourceQuery = @query
                        AND c.metadata.scrapedAt > @cutoffTime
                        ORDER BY c.metadata.scrapedAt DESC
                    `,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@projectId', value: projectId },
                    { name: '@query', value: query },
                    { name: '@cutoffTime', value: cutoffTime.toISOString() },
                ],
            })
                .fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'web-search-context-integration.get-cached-pages' });
            return [];
        }
    }
    // ========================================================================
    // Web Search Triggering
    // ========================================================================
    /**
     * Trigger web search (with optional deep search)
     */
    async triggerWebSearch(tenantId, projectId, query, enableDeepSearch, deepSearchPages) {
        try {
            // Trigger web search via WebSearchService
            await this.webSearchService.search(tenantId, query, {
                useCache: true,
                type: 'web',
                maxResults: 10,
            });
            // If deep search enabled, trigger scraping (async in background)
            if (enableDeepSearch) {
                // Note: Deep search scraping happens asynchronously in WebSearchService
                // We don't wait for it here, but it will populate c_webpages
                this.monitoring?.trackEvent('web-search-context-integration.deep-search-triggered', { query });
            }
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'web-search-context-integration.trigger-web-search' });
            throw error;
        }
    }
    // ========================================================================
    // Semantic Retrieval
    // ========================================================================
    /**
     * Perform semantic retrieval using vector similarity
     */
    async performSemanticRetrieval(userQuery, cachedPages, minRelevanceScore, maxChunks) {
        if (cachedPages.length === 0) {
            return [];
        }
        try {
            // Step 1: Generate embedding for user query
            const queryEmbedding = await this.embeddingService.embed(userQuery);
            if (!queryEmbedding || !queryEmbedding.embedding || queryEmbedding.embedding.length === 0) {
                this.monitoring?.trackEvent('web-search-context-integration.embedding-generation-failed', { query: userQuery });
                return [];
            }
            const queryVector = queryEmbedding.embedding;
            const scoredChunks = [];
            for (const page of cachedPages) {
                if (!page.chunks || page.chunks.length === 0) {
                    continue;
                }
                for (const chunk of page.chunks) {
                    if (!chunk.embedding || chunk.embedding.length === 0) {
                        continue;
                    }
                    // Calculate cosine similarity
                    const similarity = this.cosineSimilarity(queryVector, chunk.embedding);
                    if (similarity >= minRelevanceScore) {
                        scoredChunks.push({
                            chunk,
                            page,
                            score: similarity,
                        });
                    }
                }
            }
            // Step 3: Sort by relevance score (highest first)
            scoredChunks.sort((a, b) => b.score - a.score);
            // Step 4: Take top N chunks and convert to RAGChunk format
            const topChunks = scoredChunks.slice(0, maxChunks);
            const ragChunks = topChunks.map((scored, index) => {
                // Extract domain from URL
                let domain = '';
                try {
                    const urlObj = new URL(scored.page.url);
                    domain = urlObj.hostname.replace('www.', '');
                }
                catch {
                    domain = scored.page.url.split('/')[2]?.replace('www.', '') || '';
                }
                return {
                    id: scored.chunk.id,
                    shardId: scored.page.id,
                    shardName: scored.page.title || scored.page.url,
                    shardTypeId: 'c_webpages',
                    content: scored.chunk.content,
                    chunkIndex: index,
                    score: scored.score,
                    highlight: this.generateHighlight(scored.chunk.content, userQuery),
                    tokenCount: scored.chunk.tokenCount,
                    // Add citation metadata for web search results
                    citation: {
                        url: scored.page.url,
                        title: scored.page.title || scored.page.url,
                        domain,
                        scrapedAt: scored.page.metadata?.scrapedAt,
                        accessedAt: scored.page.audit?.lastAccessedAt || new Date().toISOString(),
                    },
                };
            });
            // Step 5: Deduplicate similar chunks (optional)
            const deduplicatedChunks = this.deduplicateChunks(ragChunks);
            return deduplicatedChunks;
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'web-search-context-integration.semantic-retrieval' });
            return [];
        }
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (normA * normB);
    }
    /**
     * Generate highlight snippet for chunk
     */
    generateHighlight(content, query) {
        // Find the most relevant sentence containing query terms
        const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let bestSentence = sentences[0] || content.substring(0, 150);
        let maxMatches = 0;
        for (const sentence of sentences) {
            const sentenceLower = sentence.toLowerCase();
            const matches = queryTerms.filter(term => sentenceLower.includes(term)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                bestSentence = sentence;
            }
        }
        // Truncate if too long
        if (bestSentence.length > 200) {
            bestSentence = bestSentence.substring(0, 197) + '...';
        }
        return bestSentence.trim();
    }
    /**
     * Deduplicate similar chunks based on content similarity
     */
    deduplicateChunks(chunks) {
        if (chunks.length <= 1) {
            return chunks;
        }
        const deduplicated = [];
        const SIMILARITY_THRESHOLD = 0.9; // Very high similarity = duplicate
        for (const chunk of chunks) {
            let isDuplicate = false;
            for (const existing of deduplicated) {
                // Simple character-based similarity check
                const similarity = this.textSimilarity(chunk.content, existing.content);
                if (similarity > SIMILARITY_THRESHOLD) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) {
                deduplicated.push(chunk);
            }
        }
        return deduplicated;
    }
    /**
     * Calculate text similarity (simple Jaccard similarity)
     */
    textSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }
    // ========================================================================
    // Utility Methods
    // ========================================================================
    /**
     * Format web search metadata for logging/monitoring
     */
    formatMetadataForLogging(result) {
        return {
            triggered: result.triggered,
            reason: result.reason,
            query: result.metadata.query,
            pagesScraped: result.metadata.pagesScraped,
            chunksRetrieved: result.metadata.chunksRetrieved,
            avgRelevance: result.metadata.avgRelevanceScore?.toFixed(2),
            durationMs: result.metadata.durationMs,
        };
    }
    // ========================================================================
    // Cache Management
    // ========================================================================
    /**
     * Get Redis cache key for a search query
     */
    getCacheKey(tenantId, projectId, query) {
        // Normalize query for cache key (lowercase, trimmed)
        const normalizedQuery = query.toLowerCase().trim();
        const queryHash = this.hashQuery(normalizedQuery);
        return `${this.REDIS_CACHE_PREFIX}${tenantId}:${projectId}:${queryHash}`;
    }
    /**
     * Simple hash function for query normalization
     */
    hashQuery(query) {
        // Simple hash - in production, consider using crypto.createHash
        let hash = 0;
        for (let i = 0; i < query.length; i++) {
            const char = query.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * Invalidate cache for a specific query
     */
    async invalidateCache(tenantId, projectId, query) {
        if (!this.redis) {
            return;
        }
        try {
            const cacheKey = this.getCacheKey(tenantId, projectId, query);
            await this.redis.del(cacheKey);
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'web-search-context-integration.cache-invalidation' });
        }
    }
    /**
     * Invalidate all cache entries for a tenant/project
     */
    async invalidateProjectCache(tenantId, projectId) {
        if (!this.redis) {
            return;
        }
        try {
            const pattern = `${this.REDIS_CACHE_PREFIX}${tenantId}:${projectId}:*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'web-search-context-integration.project-cache-invalidation' });
        }
    }
    /**
     * Get cache statistics (hit rate, etc.)
     */
    async getCacheStats(tenantId, projectId) {
        if (!this.redis) {
            return { totalKeys: 0, totalSize: 0 };
        }
        try {
            const pattern = projectId
                ? `${this.REDIS_CACHE_PREFIX}${tenantId}:${projectId}:*`
                : `${this.REDIS_CACHE_PREFIX}${tenantId}:*`;
            const keys = await this.redis.keys(pattern);
            let totalSize = 0;
            for (const key of keys) {
                const size = await this.redis.strlen(key);
                totalSize += size;
            }
            return {
                totalKeys: keys.length,
                totalSize,
            };
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'web-search-context-integration.cache-stats' });
            return { totalKeys: 0, totalSize: 0 };
        }
    }
}
//# sourceMappingURL=web-search-context-integration.service.js.map
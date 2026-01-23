/**
 * Hybrid Retrieval Service
 * Combines vector similarity search with graph-based relationship traversal
 * Uses Reciprocal Rank Fusion (RRF) to merge results from multiple retrieval methods
 */
// ============================================
// Service
// ============================================
export class HybridRetrievalService {
    shardRepository;
    relationshipService;
    vectorSearch;
    monitoring;
    DEFAULT_RRF_K = 60;
    DEFAULT_TOP_K = 20;
    DEFAULT_VECTOR_TOP_K = 50;
    DEFAULT_GRAPH_DEPTH = 2;
    DEFAULT_GRAPH_TOP_K = 10;
    constructor(shardRepository, relationshipService, vectorSearch, monitoring) {
        this.shardRepository = shardRepository;
        this.relationshipService = relationshipService;
        this.vectorSearch = vectorSearch;
        this.monitoring = monitoring;
    }
    // ============================================
    // Main Retrieval Method
    // ============================================
    /**
     * Perform hybrid retrieval combining vector, graph, and keyword search
     */
    async retrieve(request) {
        const startTime = Date.now();
        const rrfK = request.rrfK || this.DEFAULT_RRF_K;
        const topK = request.topK || this.DEFAULT_TOP_K;
        // Normalize weights
        const totalWeight = (request.vectorWeight || 0.5) +
            (request.graphWeight || 0.3) +
            (request.keywordWeight || 0.2);
        const vectorWeight = (request.vectorWeight || 0.5) / totalWeight;
        const graphWeight = (request.graphWeight || 0.3) / totalWeight;
        const keywordWeight = (request.keywordWeight || 0.2) / totalWeight;
        // Run retrievals in parallel
        const [vectorResults, graphResults, keywordResults] = await Promise.all([
            this.vectorRetrieval(request),
            this.graphRetrieval(request),
            this.keywordRetrieval(request),
        ]);
        // Apply RRF fusion
        const fusedResults = this.reciprocalRankFusion([
            { results: vectorResults, weight: vectorWeight, source: 'vector' },
            { results: graphResults, weight: graphWeight, source: 'graph' },
            { results: keywordResults, weight: keywordWeight, source: 'keyword' },
        ], rrfK);
        // Take top K results
        const topResults = fusedResults.slice(0, topK);
        // Enrich with content
        const enrichedChunks = await this.enrichChunks(request.tenantId, topResults);
        const retrievalTimeMs = Date.now() - startTime;
        this.monitoring.trackEvent('hybrid-retrieval.complete', {
            tenantId: request.tenantId,
            vectorCount: vectorResults.length,
            graphCount: graphResults.length,
            keywordCount: keywordResults.length,
            resultCount: enrichedChunks.length,
            retrievalTimeMs,
        });
        return {
            chunks: enrichedChunks,
            totalCandidates: vectorResults.length + graphResults.length + keywordResults.length,
            retrievalTimeMs,
            sources: {
                vector: vectorResults.length,
                graph: graphResults.length,
                keyword: keywordResults.length,
            },
        };
    }
    // ============================================
    // Vector Retrieval
    // ============================================
    async vectorRetrieval(request) {
        if (!this.vectorSearch || !request.queryEmbedding) {
            return [];
        }
        try {
            const results = await this.vectorSearch.search(request.tenantId, request.queryEmbedding, {
                topK: request.vectorTopK || this.DEFAULT_VECTOR_TOP_K,
                filter: {
                    shardTypeIds: request.shardTypeIds,
                    tags: request.tags,
                },
            });
            return results.map((r, index) => ({
                shardId: r.id || r.shardId,
                score: r.score || r.similarity || 1 - (index * 0.01),
                source: 'vector',
                metadata: r.metadata || {},
            }));
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'hybrid-retrieval.vector',
            });
            return [];
        }
    }
    // ============================================
    // Graph Retrieval
    // ============================================
    async graphRetrieval(request) {
        if (!request.focusShardIds || request.focusShardIds.length === 0) {
            return [];
        }
        const maxDepth = request.graphDepth || this.DEFAULT_GRAPH_DEPTH;
        const topKPerHop = request.graphTopK || this.DEFAULT_GRAPH_TOP_K;
        const results = new Map();
        try {
            // BFS traversal from focus shards
            let currentLevel = request.focusShardIds.map((id) => ({
                shardId: id,
                depth: 0,
                path: [id],
                relationshipType: 'focus',
            }));
            for (let depth = 1; depth <= maxDepth; depth++) {
                const nextLevel = [];
                for (const node of currentLevel) {
                    // Get related shards
                    const related = await this.relationshipService.getRelatedShards(node.shardId, request.tenantId, {
                        limit: topKPerHop,
                        direction: 'both',
                    });
                    for (const rel of related.shards || []) {
                        if (!results.has(rel.id) && !request.focusShardIds.includes(rel.id)) {
                            // Apply filters
                            if (request.shardTypeIds && !request.shardTypeIds.includes(rel.shardTypeId)) {
                                continue;
                            }
                            // Score based on depth and relationship strength
                            const depthPenalty = 1 / (depth + 1);
                            const score = depthPenalty * (rel.strength || 1);
                            const graphNode = {
                                shardId: rel.id,
                                shardName: rel.name,
                                shardTypeId: rel.shardTypeId,
                                depth,
                                path: [...node.path, rel.id],
                                relationshipType: rel.relationshipType || 'related',
                                score,
                            };
                            results.set(rel.id, graphNode);
                            nextLevel.push({
                                shardId: rel.id,
                                depth,
                                path: graphNode.path,
                                relationshipType: graphNode.relationshipType,
                            });
                        }
                    }
                }
                currentLevel = nextLevel;
                if (currentLevel.length === 0) {
                    break;
                }
            }
            // Convert to scored results
            return Array.from(results.values())
                .sort((a, b) => b.score - a.score)
                .map((node) => ({
                shardId: node.shardId,
                score: node.score,
                source: 'graph',
                metadata: {
                    depth: node.depth,
                    path: node.path,
                    relationshipType: node.relationshipType,
                },
            }));
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'hybrid-retrieval.graph',
            });
            return [];
        }
    }
    // ============================================
    // Keyword Retrieval
    // ============================================
    async keywordRetrieval(request) {
        if (!request.query) {
            return [];
        }
        try {
            // Extract keywords from query
            const keywords = this.extractKeywords(request.query);
            if (keywords.length === 0) {
                return [];
            }
            // Search for shards matching keywords
            // This is a simplified implementation - in production, use full-text search
            const results = await this.shardRepository.list({
                filter: {
                    tenantId: request.tenantId,
                    shardTypeId: request.shardTypeIds?.[0], // Simplified filter
                },
                limit: 50,
            });
            const scored = results.shards
                .map((shard) => {
                const text = `${shard.name} ${shard.description || ''} ${JSON.stringify(shard.structuredData || {})}`.toLowerCase();
                // Calculate keyword match score
                let matchCount = 0;
                for (const keyword of keywords) {
                    if (text.includes(keyword.toLowerCase())) {
                        matchCount++;
                    }
                }
                const score = matchCount / keywords.length;
                return {
                    shardId: shard.id,
                    score,
                    source: 'keyword',
                    metadata: { matchedKeywords: matchCount },
                };
            })
                .filter((r) => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 30);
            return scored;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'hybrid-retrieval.keyword',
            });
            return [];
        }
    }
    // ============================================
    // Reciprocal Rank Fusion
    // ============================================
    reciprocalRankFusion(rankedLists, k) {
        const scores = new Map();
        for (const list of rankedLists) {
            // Sort by score descending to get ranks
            const sorted = [...list.results].sort((a, b) => b.score - a.score);
            for (let rank = 0; rank < sorted.length; rank++) {
                const item = sorted[rank];
                const rrfScore = list.weight / (k + rank + 1);
                if (!scores.has(item.shardId)) {
                    scores.set(item.shardId, {
                        shardId: item.shardId,
                        finalScore: 0,
                        vectorScore: undefined,
                        graphScore: undefined,
                        keywordScore: undefined,
                        rrfRank: 0,
                        sources: [],
                        metadata: {},
                    });
                }
                const existing = scores.get(item.shardId);
                existing.finalScore += rrfScore;
                existing.sources.push(list.source);
                // Track individual scores
                switch (list.source) {
                    case 'vector':
                        existing.vectorScore = item.score;
                        break;
                    case 'graph':
                        existing.graphScore = item.score;
                        existing.metadata = { ...existing.metadata, ...item.metadata };
                        break;
                    case 'keyword':
                        existing.keywordScore = item.score;
                        break;
                }
            }
        }
        // Sort by final RRF score
        const results = Array.from(scores.values()).sort((a, b) => b.finalScore - a.finalScore);
        // Assign final ranks
        results.forEach((r, index) => {
            r.rrfRank = index + 1;
        });
        return results;
    }
    // ============================================
    // Enrichment
    // ============================================
    async enrichChunks(tenantId, fusedResults) {
        const chunks = [];
        for (const result of fusedResults) {
            try {
                const shard = await this.shardRepository.findById(result.shardId, tenantId);
                if (!shard) {
                    continue;
                }
                // Build content from shard
                const content = this.buildContent(shard);
                // Determine retrieval source
                let source = 'hybrid';
                if (result.sources.length === 1) {
                    source = result.sources[0];
                }
                chunks.push({
                    shardId: shard.id,
                    shardName: shard.name,
                    shardTypeId: shard.shardTypeId,
                    content,
                    finalScore: result.finalScore,
                    vectorScore: result.vectorScore,
                    graphScore: result.graphScore,
                    keywordScore: result.keywordScore,
                    rrfRank: result.rrfRank,
                    retrievalSource: source,
                    graphPath: result.metadata?.path,
                    relationshipType: result.metadata?.relationshipType,
                    relevantFields: shard.structuredData,
                });
            }
            catch {
                // Skip shards that can't be enriched
            }
        }
        return chunks;
    }
    buildContent(shard) {
        const parts = [];
        // Add name
        parts.push(`# ${shard.name}`);
        // Add description
        if (shard.description) {
            parts.push(shard.description);
        }
        // Add structured data summary
        if (shard.structuredData && typeof shard.structuredData === 'object') {
            const data = shard.structuredData;
            const relevantFields = Object.entries(data)
                .filter(([key, value]) => {
                // Filter out internal fields and complex objects
                if (key.startsWith('_')) {
                    return false;
                }
                if (typeof value === 'object' && value !== null) {
                    return false;
                }
                return true;
            })
                .slice(0, 10); // Limit to 10 fields
            if (relevantFields.length > 0) {
                parts.push('\n## Details', ...relevantFields.map(([key, value]) => `- **${key}**: ${value}`));
            }
        }
        return parts.join('\n');
    }
    // ============================================
    // Helpers
    // ============================================
    extractKeywords(query) {
        // Simple keyword extraction
        const stopWords = new Set([
            'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
            'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
            'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
            'below', 'between', 'under', 'again', 'further', 'then', 'once',
            'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
            'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
            'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but',
            'if', 'or', 'because', 'until', 'while', 'about', 'what', 'which',
            'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'i', 'you',
            'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
        ]);
        return query
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter((word) => word.length > 2 && !stopWords.has(word));
    }
}
// ============================================
// Factory
// ============================================
export function createHybridRetrievalService(shardRepository, relationshipService, vectorSearch, monitoring) {
    return new HybridRetrievalService(shardRepository, relationshipService, vectorSearch, monitoring);
}
//# sourceMappingURL=hybrid-retrieval.service.js.map
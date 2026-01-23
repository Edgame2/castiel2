// @ts-nocheck - Optional AI service, not used by workers
/**
 * Project Context Service
 * Optimized service for assembling project-scoped chat context
 * with efficient shard retrieval and caching
 */
import { sortProjectRelatedChunks } from './project-context.util.js';
import { filterRagByAllowedIds } from './rag-filter.util.js';
/**
 * Service for optimized project context assembly
 */
export class ProjectContextService {
    shardRepository;
    shardTypeRepository;
    relationshipService;
    monitoring;
    vectorSearch;
    // Cache for project relationships (TTL: 5 minutes)
    relationshipCache = new Map();
    CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    constructor(shardRepository, shardTypeRepository, relationshipService, monitoring, vectorSearch) {
        this.shardRepository = shardRepository;
        this.shardTypeRepository = shardTypeRepository;
        this.relationshipService = relationshipService;
        this.monitoring = monitoring;
        this.vectorSearch = vectorSearch;
    }
    /**
     * Assemble optimized project context for chat
     */
    async assembleProjectContext(tenantId, projectId, query, options = {}) {
        const startTime = Date.now();
        const { maxTokens = 2000, minRelevance = 0.7, includeUnlinked = true, unlinkedFraction = 0.2, shardTypeFilter = ['c_document', 'c_documentChunk', 'c_note'], maxRelatedShards = 50, } = options;
        try {
            // 1. Get project shard
            const projectShard = await this.shardRepository.findById(projectId, tenantId);
            if (!projectShard) {
                throw new Error(`Project ${projectId} not found`);
            }
            const projectShardType = await this.shardTypeRepository.findById(projectShard.shardTypeId, tenantId);
            const projectChunk = {
                shardId: projectShard.id,
                shardName: projectShard.structuredData?.name || projectId,
                shardTypeId: projectShard.shardTypeId,
                shardTypeName: projectShardType?.displayName || projectShard.shardTypeId,
                content: projectShard.structuredData || {},
                tokenCount: this.estimateTokens(projectShard.structuredData),
                relationshipType: 'project',
                depth: 0,
            };
            // 2. Get project-linked shards (optimized batch retrieval)
            const relatedChunks = await this.getProjectRelatedShards(tenantId, projectId, shardTypeFilter, maxRelatedShards);
            // 3. Perform vector search with project-aware filtering
            let ragChunks = [];
            if (this.vectorSearch) {
                ragChunks = await this.getProjectRAGChunks(tenantId, projectId, query, minRelevance, includeUnlinked, unlinkedFraction, relatedChunks.map((c) => c.shardId));
            }
            // 4. Calculate total tokens
            const totalTokens = projectChunk.tokenCount +
                relatedChunks.reduce((sum, c) => sum + c.tokenCount, 0) +
                ragChunks.reduce((sum, c) => sum + c.tokenCount, 0);
            // 5. Truncate if needed (keep project + related, truncate RAG)
            const truncatedRagChunks = this.truncateToTokenLimit(ragChunks, maxTokens - projectChunk.tokenCount - relatedChunks.reduce((sum, c) => sum + c.tokenCount, 0));
            const executionTime = Date.now() - startTime;
            this.monitoring.trackMetric('project-context.assemble', 1, {
                tenantId,
                projectId,
                relatedShardCount: relatedChunks.length,
                ragChunkCount: truncatedRagChunks.length,
                totalTokens,
                executionTime,
            });
            return {
                projectChunk,
                relatedChunks,
                ragChunks: truncatedRagChunks,
                totalTokens: Math.min(totalTokens, maxTokens),
                metadata: {
                    projectId,
                    relatedShardCount: relatedChunks.length,
                    ragChunkCount: truncatedRagChunks.length,
                    linkedRagCount: truncatedRagChunks.filter((c) => relatedChunks.some((rc) => rc.shardId === c.shardId)).length,
                    unlinkedRagCount: truncatedRagChunks.filter((c) => !relatedChunks.some((rc) => rc.shardId === c.shardId)).length,
                },
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'ProjectContextService',
                operation: 'assembleProjectContext',
                tenantId,
                projectId,
            });
            throw error;
        }
    }
    /**
     * Get project-related shards with optimized batch retrieval
     */
    async getProjectRelatedShards(tenantId, projectId, shardTypeFilter, maxShards) {
        try {
            // Check cache first
            const cacheKey = `${tenantId}:${projectId}`;
            const cached = this.relationshipCache.get(cacheKey);
            let relationships = [];
            if (cached && cached.expiresAt > Date.now()) {
                relationships = cached.relationships;
            }
            else {
                // Get project shard to access relationships
                const projectShard = await this.shardRepository.findById(projectId, tenantId);
                if (!projectShard) {
                    return [];
                }
                // Get relationships from internal_relationships or relationship service
                if (projectShard.internal_relationships?.length) {
                    relationships = projectShard.internal_relationships.filter((r) => shardTypeFilter.includes(r.shardTypeId));
                }
                else {
                    // Fallback to relationship service
                    const rels = await this.relationshipService.getRelationships(tenantId, projectId, 'outgoing', {
                        limit: maxShards * 2, // Get more to filter
                    });
                    relationships = rels
                        .filter((r) => shardTypeFilter.includes(r.targetShardTypeId))
                        .map((r) => ({
                        shardId: r.targetShardId,
                        shardTypeId: r.targetShardTypeId,
                    }));
                }
                // Cache relationships
                this.relationshipCache.set(cacheKey, {
                    relationships,
                    expiresAt: Date.now() + this.CACHE_TTL,
                });
            }
            // Batch fetch shards (limit to maxShards)
            const shardIds = relationships
                .slice(0, maxShards)
                .map((r) => r.shardId)
                .filter(Boolean);
            if (shardIds.length === 0) {
                return [];
            }
            // Parallel batch fetch
            const shardPromises = shardIds.map((id) => this.shardRepository.findById(id, tenantId).catch((error) => {
                this.monitoring.trackException(error, { operation: 'project-context.findById', shardId: id, tenantId });
                return null;
            }));
            const shards = await Promise.all(shardPromises);
            const validShards = shards.filter((s) => s !== null);
            // Build context chunks
            const chunks = [];
            const shardTypeCache = new Map();
            for (const shard of validShards) {
                let shardType = shardTypeCache.get(shard.shardTypeId);
                if (!shardType) {
                    shardType = await this.shardTypeRepository.findById(shard.shardTypeId, tenantId);
                    if (shardType) {
                        shardTypeCache.set(shard.shardTypeId, shardType);
                    }
                }
                chunks.push({
                    shardId: shard.id,
                    shardName: shard.structuredData?.name || shard.id,
                    shardTypeId: shard.shardTypeId,
                    shardTypeName: shardType?.displayName || shard.shardTypeId,
                    content: shard.structuredData || {},
                    tokenCount: this.estimateTokens(shard.structuredData),
                    relationshipType: 'project_link',
                    depth: 1,
                });
            }
            // Sort by priority (documents > chunks > notes)
            return sortProjectRelatedChunks(chunks);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'ProjectContextService',
                operation: 'getProjectRelatedShards',
                tenantId,
                projectId,
            });
            return [];
        }
    }
    /**
     * Get RAG chunks with project-aware filtering
     */
    async getProjectRAGChunks(tenantId, projectId, query, minRelevance, includeUnlinked, unlinkedFraction, allowedShardIds) {
        if (!this.vectorSearch) {
            return [];
        }
        try {
            // Perform project-aware vector search
            // Vector search now supports projectId filter natively, which resolves project-linked shards
            const searchResults = await this.vectorSearch.semanticSearch({
                query,
                filter: {
                    tenantId,
                    projectId, // Pass projectId for project-scoped vector search
                    // Vector search will automatically resolve project-linked shard IDs
                },
                topK: 20,
                minScore: minRelevance,
            }, '' // userId not needed for search
            );
            // Convert to RAG chunks
            const ragChunks = searchResults.results.map((result) => ({
                id: result.shard.id,
                shardId: result.shard.id,
                shardName: result.shard.structuredData?.name || result.shard.id,
                shardTypeId: result.shard.shardTypeId,
                content: JSON.stringify(result.shard.structuredData || {}),
                chunkIndex: 0,
                score: result.score,
                highlight: '',
                tokenCount: this.estimateTokens(result.shard.structuredData),
            }));
            // Apply project-aware filtering
            if (includeUnlinked && allowedShardIds.length > 0) {
                const allowedIds = new Set([projectId, ...allowedShardIds]);
                return filterRagByAllowedIds(ragChunks, allowedIds, unlinkedFraction);
            }
            // Filter to only project-linked shards
            const allowedIds = new Set([projectId, ...allowedShardIds]);
            return ragChunks.filter((c) => allowedIds.has(c.shardId));
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'ProjectContextService',
                operation: 'getProjectRAGChunks',
                tenantId,
                projectId,
            });
            return [];
        }
    }
    /**
     * Truncate chunks to fit within token limit
     */
    truncateToTokenLimit(chunks, maxTokens) {
        let totalTokens = 0;
        const result = [];
        // Sort by score (highest first)
        const sorted = [...chunks].sort((a, b) => b.score - a.score);
        for (const chunk of sorted) {
            if (totalTokens + chunk.tokenCount <= maxTokens) {
                result.push(chunk);
                totalTokens += chunk.tokenCount;
            }
            else {
                break;
            }
        }
        return result;
    }
    /**
     * Estimate token count (rough approximation: 1 token ≈ 4 characters)
     */
    estimateTokens(content) {
        if (!content) {
            return 0;
        }
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        return Math.ceil(text.length / 4);
    }
    /**
     * Invalidate cache for a project
     */
    invalidateCache(tenantId, projectId) {
        const cacheKey = `${tenantId}:${projectId}`;
        this.relationshipCache.delete(cacheKey);
    }
    /**
     * Clear all caches
     */
    clearCache() {
        this.relationshipCache.clear();
    }
}
//# sourceMappingURL=project-context.service.js.map
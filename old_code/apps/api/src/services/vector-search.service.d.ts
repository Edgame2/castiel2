/**
 * Vector Search Service
 * Handles semantic and hybrid search with Cosmos DB vector search
 */
import { Container } from '@azure/cosmos';
import type { VectorSearchRequest, HybridSearchRequest, VectorSearchResponse, VectorSearchFilter } from '../types/vector-search.types.js';
import { VectorSearchCacheService } from './vector-search-cache.service.js';
import { ACLService } from './acl.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { AzureOpenAIService } from './azure-openai.service.js';
import { EmbeddingTemplateService } from './embedding-template.service.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRepository } from '../repositories/shard.repository.js';
/**
 * Vector search service with caching and ACL filtering
 * Enhanced with embedding template support for consistent preprocessing
 */
type MetricsShardService = import('./metrics-shard.service.js').MetricsShardService;
export declare class VectorSearchService {
    private readonly container;
    private readonly aclService;
    private readonly monitoring;
    private readonly azureOpenAI;
    private readonly cacheService?;
    private readonly embeddingTemplateService?;
    private readonly shardTypeRepository?;
    private readonly shardRepository?;
    private readonly metricsShardService?;
    private totalSearches;
    private totalExecutionTime;
    private totalResultCount;
    private cacheHits;
    private cacheMisses;
    private executionTimes;
    private readonly MAX_EXECUTION_TIMES;
    constructor(container: Container, aclService: ACLService, monitoring: IMonitoringProvider, azureOpenAI: AzureOpenAIService, cacheService?: VectorSearchCacheService | undefined, embeddingTemplateService?: EmbeddingTemplateService | undefined, shardTypeRepository?: ShardTypeRepository | undefined, shardRepository?: ShardRepository | undefined, metricsShardService?: MetricsShardService | undefined);
    /**
     * Get similarity metric with default
     */
    private getSimilarityMetric;
    /**
     * Phase 2: Track vector hit ratio (non-blocking)
     * Records hit ratio every 100 searches or when explicitly called
     */
    private trackVectorHitRatio;
    /**
     * Track execution time for percentile calculation
     */
    private trackExecutionTime;
    /**
     * Calculate and track percentiles (p50, p95, p99)
     */
    private trackPercentiles;
    /**
     * Get performance statistics
     */
    getPerformanceStats(): {
        totalSearches: number;
        avgExecutionTime: number;
        cacheHitRatio: number;
        p50: number;
        p95: number;
        p99: number;
    };
    /**
     * Perform semantic vector search
     */
    semanticSearch(request: VectorSearchRequest, userId: string): Promise<VectorSearchResponse>;
    /**
     * Perform hybrid search (keyword + vector)
     */
    hybridSearch(request: HybridSearchRequest, userId: string): Promise<VectorSearchResponse>;
    /**
     * Simple search method for IVectorSearchProvider interface
     * Used by InsightService for RAG retrieval
     * Now supports project-aware filtering
     */
    search(request: {
        tenantId: string;
        query: string;
        topK?: number;
        minScore?: number;
        projectId?: string;
        shardTypeIds?: string[];
    }): Promise<{
        results: {
            shardId: string;
            shardTypeId: string;
            shard?: {
                name: string;
            };
            content: string;
            chunkIndex?: number;
            score: number;
            highlight?: string;
        }[];
    }>;
    /**
     * Generate embedding for query text with template preprocessing
     * Uses embedding template when shardTypeId is specified for consistent preprocessing
     */
    private generateQueryEmbedding;
    /**
     * Generate embedding for text
     * Uses Azure OpenAI embedding service via azureOpenAI service
     */
    private generateEmbedding;
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
    private performCosmosVectorSearch;
    /**
     * Perform global vector search across all tenants (Super Admin only)
     */
    globalSearch(request: Omit<VectorSearchRequest, 'filter'> & {
        filter?: Partial<VectorSearchFilter>;
    }, userId: string): Promise<VectorSearchResponse>;
    /**
     * Perform global vector search in Cosmos DB (no tenant filter)
     */
    private performGlobalCosmosVectorSearch;
    /**
     * Filter results by ACL for global search (check access per tenant)
     */
    private filterByACLGlobal;
    /**
     * Deduplicate results by shard ID (keep highest score)
     */
    private deduplicateResults;
    /**
     * Perform keyword search
     */
    private performKeywordSearch;
    /**
     * Merge vector and keyword results with weighted scoring
     */
    private mergeHybridResults;
    /**
     * Filter results by ACL (user must have READ permission)
     */
    private filterByACL;
    /**
     * Get list of applied filters
     */
    private getFiltersApplied;
    /**
     * Enrich result with citations and freshness (Phase 2)
     */
    /**
     * Apply field-weighted scoring to search results
     * TODO: Implement field-weighted scoring based on embedding templates
     */
    private applyFieldWeightedScoring;
    private enrichResultWithCitationsAndFreshness;
    /**
     * Get display name for shard
     */
    private getShardDisplayName;
    /**
     * Extract excerpt from shard for citation
     */
    private extractExcerpt;
    /**
     * Get URL for shard (if applicable)
     */
    private getShardUrl;
    /**
     * Filter insights without provenance (Phase 2)
     * Insights (c_insight_kpi) must have internal_relationships to source shards
     */
    private filterInsightsWithoutProvenance;
    /**
     * Get search statistics
     */
    getStats(): {
        totalSearches: number;
        averageExecutionTimeMs: number;
        averageResultCount: number;
    };
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Phase 2: Resolve project-linked shard IDs via relationship traversal
     * Traverses internal_relationships to find all shards linked to a project
     *
     * @param project - The project shard
     * @param tenantId - Tenant ID for filtering
     * @param maxDepth - Maximum traversal depth (default: 3)
     * @returns Array of linked shard IDs
     */
    private resolveProjectLinkedShardIds;
    /**
     * Build a safe IN clause for Cosmos DB queries using parameterized values
     * Validates IDs to prevent injection attacks
     */
    private buildInClause;
}
export {};
//# sourceMappingURL=vector-search.service.d.ts.map
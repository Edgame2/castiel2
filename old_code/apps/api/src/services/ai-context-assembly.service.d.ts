/**
 * AI Chat Context Assembly Service
 * Intelligent context selection, topic extraction, clustering, and optimization
 */
import { ContextAssemblyRequest, ContextAssemblyResponse, TopicExtractionRequest, ExtractedTopic, ExpandedQuery } from '../types/ai-context.types';
import { CosmosDBService } from './cosmos-db.service';
import { CacheService } from './cache.service';
import { VectorSearchService } from './vector-search.service.js';
import { ShardLinkingService } from './shard-linking.service';
import { ProjectActivityService } from './project-activity.service';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { ShardRepository } from '../repositories/shard.repository.js';
import type { Shard } from '../types/shard.types.js';
import { IMonitoringProvider } from '@castiel/monitoring';
export declare class ContextAssemblyService {
    private cosmosDB;
    private cache;
    private vectorSearch;
    private shardLinking;
    private activityService;
    private performanceMonitoring;
    private monitoring;
    private readonly CONTEXT_CACHE_TTL;
    private readonly STATS_CACHE_TTL;
    private config;
    private shardRepository?;
    constructor(cosmosDB: CosmosDBService, cache: CacheService, vectorSearch: VectorSearchService, shardLinking: ShardLinkingService, activityService: ProjectActivityService, performanceMonitoring: PerformanceMonitoringService, monitoring: IMonitoringProvider);
    /**
     * Set shard repository (injected separately to avoid circular dependencies)
     */
    setShardRepository(repository: ShardRepository): void;
    /**
     * Assemble context for a query (main entry point)
     */
    assembleContext(tenantId: string, request: ContextAssemblyRequest): Promise<ContextAssemblyResponse>;
    /**
     * Extract topics from text content
     */
    extractTopics(tenantId: string, request: TopicExtractionRequest): Promise<ExtractedTopic[]>;
    /**
     * Expand query with synonyms and related terms
     */
    expandQuery(tenantId: string, query: string): Promise<ExpandedQuery>;
    /**
     * Retrieve relevant sources (shards, activities, recommendations)
     */
    private retrieveRelevantSources;
    /**
     * Extract topics from multiple sources
     */
    private extractTopicsFromSources;
    /**
     * Cluster related topics
     */
    private clusterTopics;
    /**
     * Rank sources by relevance and utility
     */
    private rankSources;
    /**
     * Optimize context for better AI consumption
     */
    private optimizeContext;
    /**
     * Calculate quality metrics for assembled context
     */
    private calculateQualityMetrics;
    /**
     * Generate summary of assembled context
     */
    private generateContextSummary;
    /**
     * Determine quality level from quality score
     */
    private determineQualityLevel;
    /**
     * Suggest follow-up questions
     */
    private suggestFollowUp;
    /**
     * Helper: Extract keywords from text
     */
    private extractKeywords;
    /**
     * Helper: Categorize topic
     */
    private categorizeTopic;
    /**
     * Helper: Count keyword frequency
     */
    private countKeywordFrequency;
    /**
     * Helper: Generate synonyms
     */
    private generateSynonyms;
    /**
     * Helper: Generate related terms
     */
    private generateRelatedTerms;
    /**
     * Helper: Extract entities
     */
    private extractEntities;
    /**
     * Helper: Check if word is stopword
     */
    private isStopword;
    /**
     * Helper: Calculate cluster coherence
     */
    private calculateClusterCoherence;
    /**
     * Helper: Generate cache key
     */
    private generateCacheKey;
    /**
     * Helper: Record metrics
     */
    private recordMetrics;
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
    resolveProjectContext(projectId: string, tenantId: string, options?: {
        includeExternal?: boolean;
        minConfidence?: number;
        maxShards?: number;
        limit?: number;
        offset?: number;
    }): Promise<{
        project: Shard;
        linkedShards: Shard[];
        totalCount: number;
        hasMore: boolean;
    }>;
    /**
     * Batch load shards (DataLoader pattern)
     * Reduces Cosmos DB queries by batching requests
     */
    private batchLoadShards;
    /**
     * Hash options for cache key
     */
    private hashOptions;
    /**
     * Traverse internal relationships from a shard
     */
    traverseInternalRelationships(shardId: string, tenantId: string, options?: {
        maxDepth?: number;
    }): Promise<string[]>;
    /**
     * Traverse external relationships to find matching shards
     */
    traverseExternalRelationships(projectId: string, tenantId: string, options?: {
        minConfidence?: number;
    }): Promise<string[]>;
    /**
     * Apply confidence gating to filter shards by relationship confidence
     */
    applyConfidenceGating(project: Shard, shardIds: string[], tenantId: string, minConfidence: number): Promise<string[]>;
}
//# sourceMappingURL=ai-context-assembly.service.d.ts.map
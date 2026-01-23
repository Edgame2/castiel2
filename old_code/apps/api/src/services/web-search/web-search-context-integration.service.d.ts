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
import { Container } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { IntentAnalysisResult, AssembledContext, RAGChunk } from '../../types/ai-insights.types.js';
import { WebSearchService } from './web-search.service.js';
import { EmbeddingService } from './embedding.service.js';
/**
 * Options for web search context integration
 */
export interface WebSearchContextOptions {
    /** Enable deep search (scrape top pages) */
    enableDeepSearch?: boolean;
    /** Number of pages to scrape for deep search (1-5) */
    deepSearchPages?: number;
    /** Minimum relevance score for including chunks (0-1) */
    minRelevanceScore?: number;
    /** Maximum number of chunks to include in context */
    maxChunks?: number;
    /** Maximum age of cached pages in hours */
    maxCacheAge?: number;
    /** Skip web search even if intent suggests it */
    skipWebSearch?: boolean;
}
/**
 * Result of web search context integration
 */
export interface WebSearchContextResult {
    /** Whether web search was triggered */
    triggered: boolean;
    /** Reason for triggering (or not) */
    reason: string;
    /** Retrieved RAG chunks with relevance scores */
    ragChunks: RAGChunk[];
    /** Metadata about the search and retrieval */
    metadata: {
        /** Query used for web search */
        query?: string;
        /** Number of pages scraped */
        pagesScraped?: number;
        /** Total chunks available */
        totalChunksAvailable?: number;
        /** Chunks retrieved */
        chunksRetrieved: number;
        /** Average relevance score */
        avgRelevanceScore?: number;
        /** Deep search enabled */
        deepSearchEnabled: boolean;
        /** Time taken in ms */
        durationMs: number;
    };
}
/**
 * Web Search Context Integration Service
 */
export declare class WebSearchContextIntegrationService {
    private webSearchService;
    private embeddingService;
    private webpagesContainer;
    private redis?;
    private monitoring?;
    private readonly AUTO_TRIGGER_CONFIDENCE;
    private readonly MIN_RELEVANCE_SCORE;
    private readonly MAX_CACHE_AGE_HOURS;
    private readonly MAX_CHUNKS_DEFAULT;
    private readonly REDIS_CACHE_TTL;
    private readonly REDIS_CACHE_PREFIX;
    private readonly WEB_SEARCH_KEYWORDS;
    constructor(webSearchService: WebSearchService, embeddingService: EmbeddingService, webpagesContainer: Container, redis?: Redis, monitoring?: IMonitoringProvider);
    /**
     * Integrate web search results into context based on intent
     *
     * This is the main entry point called by InsightService.assembleContext()
     */
    integrateWebSearchContext(tenantId: string, projectId: string, intent: IntentAnalysisResult, userQuery: string, baseContext: AssembledContext, options?: WebSearchContextOptions): Promise<WebSearchContextResult>;
    /**
     * Determine if web search should be auto-triggered based on intent
     */
    private shouldTriggerWebSearch;
    /**
     * Extract clean search query from user query
     */
    private extractSearchQuery;
    /**
     * Get cached web pages for a query from c_webpages container
     */
    private getCachedPages;
    /**
     * Trigger web search (with optional deep search)
     */
    private triggerWebSearch;
    /**
     * Perform semantic retrieval using vector similarity
     */
    private performSemanticRetrieval;
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Generate highlight snippet for chunk
     */
    private generateHighlight;
    /**
     * Deduplicate similar chunks based on content similarity
     */
    private deduplicateChunks;
    /**
     * Calculate text similarity (simple Jaccard similarity)
     */
    private textSimilarity;
    /**
     * Format web search metadata for logging/monitoring
     */
    formatMetadataForLogging(result: WebSearchContextResult): Record<string, unknown>;
    /**
     * Get Redis cache key for a search query
     */
    private getCacheKey;
    /**
     * Simple hash function for query normalization
     */
    private hashQuery;
    /**
     * Invalidate cache for a specific query
     */
    invalidateCache(tenantId: string, projectId: string, query: string): Promise<void>;
    /**
     * Invalidate all cache entries for a tenant/project
     */
    invalidateProjectCache(tenantId: string, projectId: string): Promise<void>;
    /**
     * Get cache statistics (hit rate, etc.)
     */
    getCacheStats(tenantId: string, projectId?: string): Promise<{
        totalKeys: number;
        totalSize: number;
        hitRate?: number;
    }>;
}
//# sourceMappingURL=web-search-context-integration.service.d.ts.map
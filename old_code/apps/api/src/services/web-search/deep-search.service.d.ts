/**
 * Deep Search Service
 *
 * Orchestrates deep search operations: fetch search results,
 * scrape selected pages, chunk content, generate embeddings,
 * and save everything to the database.
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { WebPageDocument, DeepSearchOptions, ScrapingProgress, SearchResult } from './types.js';
import { WebSearchCosmosService } from './cosmos.service.js';
import { WebScraperService } from './scraper.service.js';
import { EmbeddingService } from './embedding.service.js';
/**
 * Scraping progress callback
 */
export type ProgressCallback = (progress: ScrapingProgress) => void;
/**
 * Deep search result
 */
export interface DeepSearchResult {
    pages: WebPageDocument[];
    statistics: {
        totalPages: number;
        successfulPages: number;
        failedPages: number;
        totalChunks: number;
        totalTokens: number;
        totalCost: number;
        totalDuration: number;
    };
}
export declare class DeepSearchService {
    private cosmosService;
    private scraperService;
    private embeddingService;
    private monitoring?;
    constructor(cosmosService: WebSearchCosmosService, scraperService: WebScraperService, embeddingService: EmbeddingService, monitoring?: IMonitoringProvider);
    /**
     * Execute deep search on provided URLs or search results
     */
    deepSearch(searchResults: SearchResult[] | string[], tenantId: string, projectId: string, sourceQuery: string, options?: DeepSearchOptions & {
        onProgress?: ProgressCallback;
    }): Promise<DeepSearchResult>;
    /**
     * Get search result ID for a URL if available
     */
    private getSearchResultId;
    /**
     * Emit progress update if callback is provided
     */
    private emitProgress;
    /**
     * Search for similar content across scraped pages
     */
    searchSimilarContent(tenantId: string, queryEmbedding: number[], options?: {
        limit?: number;
        threshold?: number;
    }): Promise<{
        page: WebPageDocument;
        content: string;
        similarity: number;
    }[]>;
    /**
     * Get scraping statistics for a tenant
     */
    getStatistics(tenantId: string): Promise<{
        totalSearches: number;
        totalWebPages: number;
        totalChunks: number;
        averageChunksPerPage: number;
    }>;
}
export default DeepSearchService;
//# sourceMappingURL=deep-search.service.d.ts.map
/**
 * Web Search Controller
 *
 * Handles HTTP request routing and business logic for web search endpoints
 */
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { WebSearchModule } from '../services/web-search/module.js';
import { ScrapingProgress } from '../services/web-search/types.js';
export declare class WebSearchController {
    private webSearchModule;
    private monitoring;
    constructor(webSearchModule: WebSearchModule, monitoring: IMonitoringProvider);
    /**
     * Execute a web search
     */
    search(tenantId: string, userId: string, query: string, options?: {
        type?: 'web' | 'news' | 'academic';
        maxResults?: number;
        useCache?: boolean;
        forceRefresh?: boolean;
    }): Promise<import("../services/web-search/types.js").SearchResponse>;
    /**
     * Execute a deep search (with scraping)
     */
    deepSearch(tenantId: string, userId: string, query: string, options?: {
        type?: 'web' | 'news' | 'academic';
        maxResults?: number;
        maxPages?: number;
    }): Promise<{
        search: import("../services/web-search/types.js").SearchDocument;
        deepSearch: {
            pages: import("../services/web-search/types.js").WebPageDocument[];
            totalCost: number;
            duration: number;
        };
        costBreakdown: {
            searchCost: number;
            deepSearchCost: number;
            totalCost: number;
        };
    }>;
    /**
     * Execute deep search with progress tracking
     */
    deepSearchWithProgress(tenantId: string, userId: string, query: string, options: {
        maxPages?: number;
    }, onProgress: (progress: ScrapingProgress) => void, onComplete: (result: any) => void, onError: (error: Error) => void): Promise<void>;
    /**
     * Get search history for a tenant
     */
    getSearchHistory(tenantId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        searches: {
            id: any;
            query: any;
            resultCount: any;
            createdAt: any;
            provider: any;
            cost: any;
        }[];
        total: number;
        limit: number;
        offset: number;
    }>;
    /**
     * Get search statistics for a tenant
     */
    getStatistics(tenantId: string): Promise<{
        totalSearches: number;
        totalWebPages: number;
        totalChunks: number;
        averageChunksPerPage: number;
    }>;
    /**
     * Cleanup expired searches
     */
    cleanupExpiredSearches(tenantId: string): Promise<{
        deletedCount: number;
        message: string;
    }>;
    /**
     * Get service status
     */
    getStatus(): {
        providers: string[];
        embeddingModel: string;
        scraperConfig: {
            timeout: number;
            maxPageSize: number;
        };
    };
    /**
     * Verify service configuration
     */
    verifyConfiguration(): Promise<{
        success: boolean;
        errors: string[];
    }>;
}
export default WebSearchController;
//# sourceMappingURL=web-search.controller.d.ts.map
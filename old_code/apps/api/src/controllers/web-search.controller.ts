/**
 * Web Search Controller
 * 
 * Handles HTTP request routing and business logic for web search endpoints
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import type { WebSearchModule } from '../services/web-search/module.js';
import { ScrapingProgress } from '../services/web-search/types.js';

export class WebSearchController {
    private webSearchModule: WebSearchModule;
    private monitoring: IMonitoringProvider;

    constructor(webSearchModule: WebSearchModule, monitoring: IMonitoringProvider) {
        this.webSearchModule = webSearchModule;
        this.monitoring = monitoring;
    }

    // ========================================================================
    // Search Operations
    // ========================================================================

    /**
     * Execute a web search
     */
    async search(
        tenantId: string,
        userId: string,
        query: string,
        options?: {
            type?: 'web' | 'news' | 'academic';
            maxResults?: number;
            useCache?: boolean;
            forceRefresh?: boolean;
        }
    ) {
        try {
            this.monitoring.trackEvent('search-initiated', {
                tenantId,
                userId,
                query: query.substring(0, 50), // Log first 50 chars
            });

            const result = await this.webSearchModule.webSearchService.search(tenantId, query, {
                maxResults: options?.maxResults || 10,
                useCache: options?.useCache !== false,
                type: options?.type || 'web',
                forceRefresh: options?.forceRefresh,
            });

            this.monitoring.trackEvent('search-completed', {
                tenantId,
                resultCount: result.search.resultCount,
                cost: result.costBreakdown.totalCost,
            });

            return result;
        } catch (error: any) {
            this.monitoring.trackException(error as Error, { operation: 'search-failed' });
            throw error;
        }
    }

    /**
     * Execute a deep search (with scraping)
     */
    async deepSearch(
        tenantId: string,
        userId: string,
        query: string,
        options?: {
            type?: 'web' | 'news' | 'academic';
            maxResults?: number;
            maxPages?: number;
        }
    ) {
        try {
            this.monitoring.trackEvent('deep-search-initiated', {
                tenantId,
                userId,
                query: query.substring(0, 50),
                maxPages: options?.maxPages || 3,
            });

            // 1. Perform search
            const searchResult = await this.webSearchModule.webSearchService.search(tenantId, query, {
                maxResults: options?.maxResults || 10,
                type: options?.type || 'web',
            });

            // 2. Perform deep search on results
            const deepSearchResult = await this.webSearchModule.deepSearchService.deepSearch(
                searchResult.search.results,
                tenantId,
                query, // Use query as project ID for grouping
                query,
                {
                    maxPages: options?.maxPages || 3,
                }
            );

            this.monitoring.trackEvent('deep-search-completed', {
                tenantId,
                pagesScraped: deepSearchResult.statistics.successfulPages,
                totalChunks: deepSearchResult.statistics.totalChunks,
                totalCost: deepSearchResult.statistics.totalCost,
            });

            return {
                search: searchResult.search,
                deepSearch: {
                    pages: deepSearchResult.pages,
                    totalCost: deepSearchResult.statistics.totalCost,
                    duration: deepSearchResult.statistics.totalDuration,
                },
                costBreakdown: {
                    searchCost: searchResult.costBreakdown.searchCost,
                    deepSearchCost: deepSearchResult.statistics.totalCost,
                    totalCost: searchResult.costBreakdown.searchCost + deepSearchResult.statistics.totalCost,
                },
            };
        } catch (error: any) {
            this.monitoring.trackException(error as Error, { operation: 'deep-search-failed' });
            throw error;
        }
    }

    /**
     * Execute deep search with progress tracking
     */
    async deepSearchWithProgress(
        tenantId: string,
        userId: string,
        query: string,
        options: { maxPages?: number },
        onProgress: (progress: ScrapingProgress) => void,
        onComplete: (result: any) => void,
        onError: (error: Error) => void
    ): Promise<void> {
        try {
            this.monitoring.trackEvent('deep-search-progress-initiated', {
                tenantId,
                userId,
                query: query.substring(0, 50),
            });

            // 1. Perform initial search
            onProgress({
                currentPage: 0,
                totalPages: 1,
                currentUrl: 'initializing',
                status: 'fetching',
                progress: 0,
                message: 'Initializing search...',
            });

            const searchResult = await this.webSearchModule.webSearchService.search(tenantId, query, {
                maxResults: 10,
            });

            // 2. Perform deep search with progress tracking
            const deepSearchResult = await this.webSearchModule.deepSearchService.deepSearch(
                searchResult.search.results,
                tenantId,
                query,
                query,
                {
                    maxPages: options.maxPages || 3,
                    onProgress,
                }
            );

            // 3. Return complete result
            const result = {
                search: searchResult.search,
                deepSearch: {
                    pages: deepSearchResult.pages,
                    totalCost: deepSearchResult.statistics.totalCost,
                    duration: deepSearchResult.statistics.totalDuration,
                },
                costBreakdown: {
                    searchCost: searchResult.costBreakdown.searchCost,
                    deepSearchCost: deepSearchResult.statistics.totalCost,
                    totalCost: searchResult.costBreakdown.searchCost + deepSearchResult.statistics.totalCost,
                },
            };

            onComplete(result);

            this.monitoring.trackEvent('deep-search-progress-completed', {
                tenantId,
                pagesScraped: deepSearchResult.statistics.successfulPages,
            });
        } catch (error: any) {
            this.monitoring.trackException(error as Error, { operation: 'deep-search-progress-failed' });
            onError(error);
        }
    }

    // ========================================================================
    // Search History and Statistics
    // ========================================================================

    /**
     * Get search history for a tenant
     */
    async getSearchHistory(
        tenantId: string,
        options?: { limit?: number; offset?: number }
    ) {
        try {
            const result = await this.webSearchModule.cosmosService.getSearchesByTenant(tenantId, options);

            return {
                searches: result.searches.map((s: any) => ({
                    id: s.id,
                    query: s.query,
                    resultCount: s.resultCount,
                    createdAt: s.metadata.createdAt,
                    provider: s.metadata.provider,
                    cost: s.metadata.cost,
                })),
                total: result.total,
                limit: options?.limit || 20,
                offset: options?.offset || 0,
            };
        } catch (error: any) {
            this.monitoring.trackException(error as Error, { operation: 'get-search-history-failed' });
            throw error;
        }
    }

    /**
     * Get search statistics for a tenant
     */
    async getStatistics(tenantId: string) {
        try {
            const stats = await this.webSearchModule.cosmosService.getStats(tenantId);

            return {
                totalSearches: stats.totalSearches,
                totalWebPages: stats.totalWebPages,
                totalChunks: stats.totalChunks,
                averageChunksPerPage: stats.averageChunksPerPage,
            };
        } catch (error: any) {
            this.monitoring.trackException(error as Error, { operation: 'get-statistics-failed' });
            throw error;
        }
    }

    /**
     * Cleanup expired searches
     */
    async cleanupExpiredSearches(tenantId: string) {
        try {
            const deleted = await this.webSearchModule.cosmosService.deleteExpiredSearches(tenantId);

            this.monitoring.trackEvent('search-cleanup-completed', {
                tenantId,
                deletedCount: deleted,
            });

            return {
                deletedCount: deleted,
                message: `Deleted ${deleted} expired search results`,
            };
        } catch (error: any) {
            this.monitoring.trackException(error as Error, { operation: 'cleanup-failed' });
            throw error;
        }
    }

    // ========================================================================
    // Admin Operations
    // ========================================================================

    /**
     * Get service status
     */
    getStatus() {
        return this.webSearchModule.getStatus();
    }

    /**
     * Verify service configuration
     */
    async verifyConfiguration() {
        return this.webSearchModule.verify();
    }
}

export default WebSearchController;

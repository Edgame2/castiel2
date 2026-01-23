/**
 * Web Search Controller
 *
 * Handles HTTP request routing and business logic for web search endpoints
 */
export class WebSearchController {
    webSearchModule;
    monitoring;
    constructor(webSearchModule, monitoring) {
        this.webSearchModule = webSearchModule;
        this.monitoring = monitoring;
    }
    // ========================================================================
    // Search Operations
    // ========================================================================
    /**
     * Execute a web search
     */
    async search(tenantId, userId, query, options) {
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
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'search-failed' });
            throw error;
        }
    }
    /**
     * Execute a deep search (with scraping)
     */
    async deepSearch(tenantId, userId, query, options) {
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
            const deepSearchResult = await this.webSearchModule.deepSearchService.deepSearch(searchResult.search.results, tenantId, query, // Use query as project ID for grouping
            query, {
                maxPages: options?.maxPages || 3,
            });
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
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'deep-search-failed' });
            throw error;
        }
    }
    /**
     * Execute deep search with progress tracking
     */
    async deepSearchWithProgress(tenantId, userId, query, options, onProgress, onComplete, onError) {
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
            const deepSearchResult = await this.webSearchModule.deepSearchService.deepSearch(searchResult.search.results, tenantId, query, query, {
                maxPages: options.maxPages || 3,
                onProgress,
            });
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
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'deep-search-progress-failed' });
            onError(error);
        }
    }
    // ========================================================================
    // Search History and Statistics
    // ========================================================================
    /**
     * Get search history for a tenant
     */
    async getSearchHistory(tenantId, options) {
        try {
            const result = await this.webSearchModule.cosmosService.getSearchesByTenant(tenantId, options);
            return {
                searches: result.searches.map((s) => ({
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
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'get-search-history-failed' });
            throw error;
        }
    }
    /**
     * Get search statistics for a tenant
     */
    async getStatistics(tenantId) {
        try {
            const stats = await this.webSearchModule.cosmosService.getStats(tenantId);
            return {
                totalSearches: stats.totalSearches,
                totalWebPages: stats.totalWebPages,
                totalChunks: stats.totalChunks,
                averageChunksPerPage: stats.averageChunksPerPage,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'get-statistics-failed' });
            throw error;
        }
    }
    /**
     * Cleanup expired searches
     */
    async cleanupExpiredSearches(tenantId) {
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
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'cleanup-failed' });
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
//# sourceMappingURL=web-search.controller.js.map
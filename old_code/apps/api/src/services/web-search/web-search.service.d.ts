/**
 * Web Search Service
 *
 * High-level service for performing web searches with caching,
 * provider fallback, and cost tracking.
 */
import { SearchDocument, SearchOptions, SearchResponse } from './types.js';
import { WebSearchCosmosService } from './cosmos.service.js';
import { SearchProviderFactory } from './providers.js';
export declare class WebSearchService {
    private cosmosService;
    private providerFactory;
    private costTracker;
    constructor(cosmosService: WebSearchCosmosService, providerFactory: SearchProviderFactory);
    /**
     * Execute a web search with caching and provider fallback
     */
    search(tenantId: string, query: string, options?: SearchOptions): Promise<SearchResponse>;
    /**
     * Build search results with citation information
     */
    private buildSearchResults;
    /**
     * Extract domain from URL
     */
    private extractDomain;
    /**
     * Calculate trust score for a source
     * This is a simple heuristic; real implementation would use ML model
     */
    private calculateTrustScore;
    /**
     * Generate consistent hash for query deduplication
     */
    private generateQueryHash;
    /**
     * Calculate expiry time based on cache duration
     */
    private getExpiryTime;
    /**
     * Get search history for a tenant
     */
    getSearchHistory(tenantId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        searches: SearchDocument[];
        total: number;
    }>;
    /**
     * Clear expired searches (manual cleanup)
     */
    cleanupExpiredSearches(tenantId: string): Promise<number>;
    /**
     * Track search cost per tenant
     */
    private trackCost;
    /**
     * Get cost tracking data for a tenant
     */
    getCostData(tenantId: string): {
        totalCost: number;
        estimatedMonthly: number;
    };
    /**
     * Get provider configuration
     */
    getProviderConfig(): {
        primary: string;
        fallback: string[];
    };
}
export default WebSearchService;
//# sourceMappingURL=web-search.service.d.ts.map
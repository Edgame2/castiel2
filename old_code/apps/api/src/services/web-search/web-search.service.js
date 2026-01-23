// @ts-nocheck - Optional service, not used by workers
/**
 * Web Search Service
 *
 * High-level service for performing web searches with caching,
 * provider fallback, and cost tracking.
 */
import crypto from 'crypto';
export class WebSearchService {
    cosmosService;
    providerFactory;
    costTracker = new Map();
    constructor(cosmosService, providerFactory) {
        this.cosmosService = cosmosService;
        this.providerFactory = providerFactory;
    }
    // ========================================================================
    // Main Search Method
    // ========================================================================
    /**
     * Execute a web search with caching and provider fallback
     */
    async search(tenantId, query, options) {
        const startTime = Date.now();
        try {
            // 1. Generate query hash for caching
            const queryHash = this.generateQueryHash(query);
            // 2. Check cache if enabled
            if (options?.useCache !== false) {
                const cached = await this.cosmosService.getSearchByQueryHash(tenantId, queryHash);
                if (cached && this.cosmosService.isFresh(cached)) {
                    return {
                        search: cached,
                        costBreakdown: {
                            searchCost: 0, // Cache hit, no cost
                            totalCost: 0,
                        },
                    };
                }
            }
            // 3. Execute search via provider factory
            const providerResponse = await this.providerFactory.search(query, options);
            // 4. Build search results with citations
            const results = this.buildSearchResults(providerResponse.results);
            // 5. Create search document
            const searchDoc = {
                id: crypto.randomUUID(),
                tenantId,
                queryHash,
                query,
                searchType: options?.type || 'web',
                resultCount: results.length,
                results,
                metadata: {
                    createdAt: new Date().toISOString(),
                    expiresAt: this.getExpiryTime(options?.cacheDuration || 3600),
                    freshResults: true,
                    searchDuration: Date.now() - startTime,
                    cost: providerResponse.cost || 0.002,
                    provider: providerResponse.provider || 'serpapi',
                    queryParams: {
                        maxResults: options?.maxResults,
                        location: options?.location,
                        language: options?.language,
                    },
                },
            };
            // Set TTL in seconds (30 days)
            searchDoc.ttl = 60 * 60 * 24 * 30;
            // 6. Save to database
            const saved = await this.cosmosService.saveSearchResult(searchDoc);
            // 7. Track cost
            this.trackCost(tenantId, searchDoc.metadata.cost);
            return {
                search: saved,
                costBreakdown: {
                    searchCost: searchDoc.metadata.cost,
                    totalCost: searchDoc.metadata.cost,
                },
            };
        }
        catch (error) {
            throw new Error(`Search failed: ${error}`);
        }
    }
    // ========================================================================
    // Search Result Building
    // ========================================================================
    /**
     * Build search results with citation information
     */
    buildSearchResults(providerResults) {
        return providerResults.map((result, index) => ({
            id: crypto.randomUUID(),
            position: index + 1,
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            citation: {
                title: result.title,
                url: result.url,
                domain: this.extractDomain(result.url),
                accessedAt: new Date().toISOString(),
                trustScore: this.calculateTrustScore(result.url),
            },
            relevanceScore: 1 - (index / providerResults.length) * 0.5, // Simple scoring based on position
        }));
    }
    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        }
        catch {
            return url;
        }
    }
    /**
     * Calculate trust score for a source
     * This is a simple heuristic; real implementation would use ML model
     */
    calculateTrustScore(url) {
        const trustedDomains = ['wikipedia.org', 'github.com', 'stackoverflow.com', 'medium.com'];
        const domain = this.extractDomain(url);
        if (trustedDomains.some((trusted) => domain.includes(trusted))) {
            return 0.9;
        }
        if (domain.includes('gov') || domain.includes('edu')) {
            return 0.85;
        }
        // Default trust score for other sources
        return 0.7;
    }
    // ========================================================================
    // Caching and Query Management
    // ========================================================================
    /**
     * Generate consistent hash for query deduplication
     */
    generateQueryHash(query) {
        return crypto
            .createHash('sha256')
            .update(query.toLowerCase().trim())
            .digest('hex')
            .substring(0, 16); // Use first 16 chars for partition key
    }
    /**
     * Calculate expiry time based on cache duration
     */
    getExpiryTime(seconds) {
        const expiryDate = new Date(Date.now() + seconds * 1000);
        return expiryDate.toISOString();
    }
    /**
     * Get search history for a tenant
     */
    async getSearchHistory(tenantId, options) {
        return this.cosmosService.getSearchesByTenant(tenantId, options);
    }
    /**
     * Clear expired searches (manual cleanup)
     */
    async cleanupExpiredSearches(tenantId) {
        return this.cosmosService.deleteExpiredSearches(tenantId);
    }
    // ========================================================================
    // Cost Tracking
    // ========================================================================
    /**
     * Track search cost per tenant
     */
    trackCost(tenantId, cost) {
        const current = this.costTracker.get(tenantId) || 0;
        this.costTracker.set(tenantId, current + cost);
    }
    /**
     * Get cost tracking data for a tenant
     */
    getCostData(tenantId) {
        const totalCost = this.costTracker.get(tenantId) || 0;
        // Estimate: assume this session data scales to monthly average
        return {
            totalCost,
            estimatedMonthly: totalCost * 30,
        };
    }
    /**
     * Get provider configuration
     */
    getProviderConfig() {
        return this.providerFactory.getProviderConfig();
    }
}
export default WebSearchService;
//# sourceMappingURL=web-search.service.js.map
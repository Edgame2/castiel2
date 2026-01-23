/**
 * Search Provider Factory and Base Classes
 *
 * Factory for creating search provider instances with fallback support.
 * Base abstract class for implementing specific search providers.
 */
import axios from 'axios';
/**
 * Base class for search providers with common functionality
 */
export class BaseSearchProvider {
    config;
    client;
    constructor(config) {
        this.config = {
            timeout: 10000,
            retries: 3,
            backoffMultiplier: 2,
            ...config,
        };
        this.client = axios.create({
            timeout: this.config.timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Castiel/1.0; +https://castiel.ai) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });
    }
    /**
     * Retry logic with exponential backoff
     */
    async retryWithBackoff(fn, retries = this.config.retries) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                if (attempt === retries - 1) {
                    throw error;
                }
                const backoff = Math.pow(this.config.backoffMultiplier || 2, attempt);
                const delay = 1000 * backoff;
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        throw new Error('Retry logic error');
    }
    /**
     * Check if provider is available
     */
    async isAvailable() {
        try {
            // Subclasses can override for specific availability checks
            return !!this.config.apiKey;
        }
        catch {
            return false;
        }
    }
    /**
     * Normalize search results to common format
     */
    normalizeResults(results) {
        return {
            results,
            executionTime: Date.now(),
        };
    }
    /**
     * Validate and sanitize query
     */
    sanitizeQuery(query) {
        return query.trim().replace(/\s+/g, ' ').slice(0, 2000);
    }
}
/**
 * Search provider factory for creating and managing provider instances
 */
export class SearchProviderFactory {
    providers = new Map();
    primaryProvider;
    fallbackProviders;
    constructor(primaryProvider, fallbackProviders = []) {
        this.primaryProvider = primaryProvider;
        this.fallbackProviders = fallbackProviders;
    }
    /**
     * Register a search provider
     */
    registerProvider(name, provider) {
        this.providers.set(name, provider);
    }
    /**
     * Get a specific provider
     */
    getProvider(name) {
        return this.providers.get(name);
    }
    /**
     * Execute search with fallback strategy
     */
    async search(query, options) {
        const providersToTry = [this.primaryProvider, ...this.fallbackProviders];
        const errors = new Map();
        for (const providerName of providersToTry) {
            const provider = this.getProvider(providerName);
            if (!provider) {
                errors.set(providerName, new Error('Provider not found'));
                continue;
            }
            try {
                const isAvailable = await provider.isAvailable();
                if (!isAvailable) {
                    errors.set(providerName, new Error('Provider not available'));
                    continue;
                }
                const result = await provider.search(query, options);
                // Add provider name to result (extend the type)
                result.provider = provider.name;
                return result;
            }
            catch (error) {
                errors.set(providerName, error instanceof Error ? error : new Error(String(error)));
                // Continue to next provider
            }
        }
        // All providers failed
        const errorMessages = Array.from(errors.entries())
            .map(([name, err]) => `${name}: ${err.message}`)
            .join('; ');
        throw new Error(`All search providers failed: ${errorMessages}`);
    }
    /**
     * Get the list of registered providers
     */
    getRegisteredProviders() {
        return Array.from(this.providers.keys());
    }
    /**
     * Get provider configuration
     */
    getProviderConfig() {
        return {
            primary: this.primaryProvider,
            fallback: this.fallbackProviders,
        };
    }
}
// ============================================================================
// Provider Implementation Stubs (actual implementations below)
// ============================================================================
/**
 * SerpAPI Search Provider
 * Primary provider for web search with high reliability
 * Costs: $0.002 per search (100k searches for $200)
 */
export class SerpAPIProvider extends BaseSearchProvider {
    name = 'serpapi';
    constructor(config) {
        super({
            apiUrl: 'https://serpapi.com/search',
            ...config,
        });
    }
    async search(query, options) {
        return this.retryWithBackoff(async () => {
            const sanitized = this.sanitizeQuery(query);
            const response = await this.client.get(this.config.apiUrl, {
                params: {
                    q: sanitized,
                    api_key: this.config.apiKey,
                    num: options?.maxResults || 10,
                    gl: options?.location || 'us',
                    hl: options?.language || 'en',
                },
            });
            const startTime = Date.now();
            const results = (response.data.organic_results || []).map((result, index) => ({
                position: index + 1,
                title: result.title,
                url: result.link,
                snippet: result.snippet,
            }));
            return {
                results,
                totalResults: response.data.search_information?.total_results,
                executionTime: Date.now() - startTime,
                cost: 0.002, // Fixed cost per search
            };
        });
    }
}
/**
 * Bing Search Provider
 * Fallback provider with Microsoft ecosystem integration
 * Costs: $0.002-0.007 per search (pay per 1000 searches)
 */
export class BingSearchProvider extends BaseSearchProvider {
    name = 'bing';
    constructor(config) {
        super({
            apiUrl: 'https://api.bing.microsoft.com/v7.0/search',
            ...config,
        });
    }
    async search(query, options) {
        return this.retryWithBackoff(async () => {
            const sanitized = this.sanitizeQuery(query);
            const response = await this.client.get(this.config.apiUrl, {
                headers: {
                    'Ocp-Apim-Subscription-Key': this.config.apiKey,
                },
                params: {
                    q: sanitized,
                    count: options?.maxResults || 10,
                    cc: options?.location?.toUpperCase() || 'US',
                },
            });
            const startTime = Date.now();
            const results = (response.data.webPages?.value || []).map((result, index) => ({
                position: index + 1,
                title: result.name,
                url: result.url,
                snippet: result.snippet,
            }));
            return {
                results,
                totalResults: response.data.webPages?.totalEstimatedMatches,
                executionTime: Date.now() - startTime,
                cost: 0.005, // Average cost per search
            };
        });
    }
}
/**
 * Google Search Provider (via Programmable Search Engine)
 * Alternative provider with Google's search quality
 * Costs: Free tier (100 queries/day), $5/month for higher limits
 */
export class GoogleSearchProvider extends BaseSearchProvider {
    name = 'google';
    searchEngineId;
    constructor(config) {
        super(config);
        this.searchEngineId = config.searchEngineId;
    }
    async search(query, options) {
        return this.retryWithBackoff(async () => {
            const sanitized = this.sanitizeQuery(query);
            const response = await this.client.get('https://www.googleapis.com/customsearch/v1', {
                params: {
                    q: sanitized,
                    key: this.config.apiKey,
                    cx: this.searchEngineId,
                    num: options?.maxResults || 10,
                    gl: options?.location?.toLowerCase() || 'us',
                    lr: options?.language ? `lang_${options.language}` : 'lang_en',
                },
            });
            const startTime = Date.now();
            const results = (response.data.items || []).map((result, index) => ({
                position: index + 1,
                title: result.title,
                url: result.link,
                snippet: result.snippet,
            }));
            return {
                results,
                totalResults: parseInt(response.data.queries?.request?.[0]?.totalResults || '0'),
                executionTime: Date.now() - startTime,
                cost: 0, // Free tier or subscription cost amortized
            };
        });
    }
}
export default SearchProviderFactory;
//# sourceMappingURL=providers.js.map
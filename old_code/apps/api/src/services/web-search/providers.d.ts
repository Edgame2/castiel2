/**
 * Search Provider Factory and Base Classes
 *
 * Factory for creating search provider instances with fallback support.
 * Base abstract class for implementing specific search providers.
 */
import { AxiosInstance } from 'axios';
import { SearchProvider, ProviderSearchResponse, SearchOptions } from './types.js';
/**
 * Configuration for a search provider
 */
export interface ProviderConfig {
    apiKey: string;
    apiUrl?: string;
    timeout?: number;
    retries?: number;
    backoffMultiplier?: number;
}
/**
 * Base class for search providers with common functionality
 */
export declare abstract class BaseSearchProvider implements SearchProvider {
    abstract name: string;
    protected config: ProviderConfig;
    protected client: AxiosInstance;
    constructor(config: ProviderConfig);
    /**
     * Retry logic with exponential backoff
     */
    protected retryWithBackoff<T>(fn: () => Promise<T>, retries?: number): Promise<T>;
    /**
     * Abstract search method to be implemented by subclasses
     */
    abstract search(query: string, options?: SearchOptions): Promise<ProviderSearchResponse>;
    /**
     * Check if provider is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Normalize search results to common format
     */
    protected normalizeResults(results: Array<{
        position: number;
        title: string;
        url: string;
        snippet: string;
    }>): ProviderSearchResponse;
    /**
     * Validate and sanitize query
     */
    protected sanitizeQuery(query: string): string;
}
/**
 * Search provider factory for creating and managing provider instances
 */
export declare class SearchProviderFactory {
    private providers;
    private primaryProvider;
    private fallbackProviders;
    constructor(primaryProvider: string, fallbackProviders?: string[]);
    /**
     * Register a search provider
     */
    registerProvider(name: string, provider: SearchProvider): void;
    /**
     * Get a specific provider
     */
    getProvider(name: string): SearchProvider | undefined;
    /**
     * Execute search with fallback strategy
     */
    search(query: string, options?: SearchOptions): Promise<ProviderSearchResponse>;
    /**
     * Get the list of registered providers
     */
    getRegisteredProviders(): string[];
    /**
     * Get provider configuration
     */
    getProviderConfig(): {
        primary: string;
        fallback: string[];
    };
}
/**
 * SerpAPI Search Provider
 * Primary provider for web search with high reliability
 * Costs: $0.002 per search (100k searches for $200)
 */
export declare class SerpAPIProvider extends BaseSearchProvider {
    name: string;
    constructor(config: ProviderConfig);
    search(query: string, options?: SearchOptions): Promise<ProviderSearchResponse>;
}
/**
 * Bing Search Provider
 * Fallback provider with Microsoft ecosystem integration
 * Costs: $0.002-0.007 per search (pay per 1000 searches)
 */
export declare class BingSearchProvider extends BaseSearchProvider {
    name: string;
    constructor(config: ProviderConfig);
    search(query: string, options?: SearchOptions): Promise<ProviderSearchResponse>;
}
/**
 * Google Search Provider (via Programmable Search Engine)
 * Alternative provider with Google's search quality
 * Costs: Free tier (100 queries/day), $5/month for higher limits
 */
export declare class GoogleSearchProvider extends BaseSearchProvider {
    name: string;
    private searchEngineId;
    constructor(config: ProviderConfig & {
        searchEngineId: string;
    });
    search(query: string, options?: SearchOptions): Promise<ProviderSearchResponse>;
}
export default SearchProviderFactory;
//# sourceMappingURL=providers.d.ts.map
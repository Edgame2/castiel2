import type { AxiosInstance } from 'axios';
import { SerpApiProvider } from './serpapi.provider.js';
import type { SearchResultItem } from '../web-search.types.js';

export interface SearchProvider {
    name: 'serpapi';
    search(query: string, options?: { searchType?: string; maxResults?: number }): Promise<SearchResultItem[]>;
    isHealthy?(): Promise<boolean>;
}

export interface ProviderFactoryOptions {
    httpClient: AxiosInstance;
    serpApiKey?: string;
}

export class SearchProviderFactory {
    private serpapi: SearchProvider;

    constructor(private options: ProviderFactoryOptions) {
        this.serpapi = new SerpApiProvider(options.httpClient, options.serpApiKey);
    }

    async searchWithFallback(
        query: string,
        options?: { searchType?: string; maxResults?: number }
    ): Promise<{ provider: string; results: SearchResultItem[] }> {
        // Use SerpAPI for all search types (web, news, finance, google, bing all supported by SerpAPI)
        const results = await this.serpapi.search(query, options);
        return { provider: 'serpapi', results };
    }
}

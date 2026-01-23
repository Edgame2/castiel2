import type { AxiosInstance } from 'axios';
import type { SearchResultItem } from '../web-search.types.js';
export interface SearchProvider {
    name: 'serpapi';
    search(query: string, options?: {
        searchType?: string;
        maxResults?: number;
    }): Promise<SearchResultItem[]>;
    isHealthy?(): Promise<boolean>;
}
export interface ProviderFactoryOptions {
    httpClient: AxiosInstance;
    serpApiKey?: string;
}
export declare class SearchProviderFactory {
    private options;
    private serpapi;
    constructor(options: ProviderFactoryOptions);
    searchWithFallback(query: string, options?: {
        searchType?: string;
        maxResults?: number;
    }): Promise<{
        provider: string;
        results: SearchResultItem[];
    }>;
}
//# sourceMappingURL=provider.factory.d.ts.map
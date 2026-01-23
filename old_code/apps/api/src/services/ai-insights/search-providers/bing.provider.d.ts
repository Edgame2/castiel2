import type { AxiosInstance } from 'axios';
import type { SearchResultItem } from '../web-search.types.js';
export declare class BingProvider {
    private http;
    private apiKey?;
    name: 'bing';
    constructor(http: AxiosInstance, apiKey?: string | undefined);
    search(query: string, options?: {
        searchType?: string;
        maxResults?: number;
    }): Promise<SearchResultItem[]>;
    private mockResults;
}
//# sourceMappingURL=bing.provider.d.ts.map
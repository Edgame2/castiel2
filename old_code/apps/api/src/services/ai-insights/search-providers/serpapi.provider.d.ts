import type { AxiosInstance } from 'axios';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { SearchResultItem } from '../web-search.types.js';
export declare class SerpApiProvider {
    private http;
    private apiKey?;
    private monitoring?;
    name: 'serpapi';
    private readonly baseUrl;
    private isEnabled;
    constructor(http: AxiosInstance, apiKey?: string | undefined, monitoring?: IMonitoringProvider | undefined);
    search(query: string, options?: {
        searchType?: string;
        maxResults?: number;
    }): Promise<SearchResultItem[]>;
    private buildParams;
    private parseResults;
}
//# sourceMappingURL=serpapi.provider.d.ts.map
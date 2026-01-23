import type { IMonitoringProvider } from '@castiel/monitoring';
import { AIInsightsCosmosService } from './cosmos.service.js';
import type { SearchQueryOptions, ScrapedPageDocument } from './web-search.types.js';
export interface WebSearchServiceOptions {
    serpApiKey?: string;
    azureOpenAiEndpoint?: string;
    azureOpenAiApiKey?: string;
    azureOpenAiDeploymentName?: string;
    defaultMaxPages?: number;
}
export declare class WebSearchService {
    private monitoring;
    private cosmos;
    private http;
    private providerFactory;
    private chunking;
    private embeddings;
    private scraper;
    constructor(monitoring: IMonitoringProvider, cosmos: AIInsightsCosmosService, options?: WebSearchServiceOptions);
    search(query: string, opts: SearchQueryOptions): Promise<{
        provider: string;
        results: import("./web-search.types.js").SearchResultItem[];
        queryHash: string;
        searchId: string;
        scrapedPages: ScrapedPageDocument[];
    }>;
    private performDeepSearch;
    private hashQuery;
}
//# sourceMappingURL=web-search.service.d.ts.map
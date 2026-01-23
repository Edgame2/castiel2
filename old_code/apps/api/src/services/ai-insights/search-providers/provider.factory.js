import { SerpApiProvider } from './serpapi.provider.js';
export class SearchProviderFactory {
    options;
    serpapi;
    constructor(options) {
        this.options = options;
        this.serpapi = new SerpApiProvider(options.httpClient, options.serpApiKey);
    }
    async searchWithFallback(query, options) {
        // Use SerpAPI for all search types (web, news, finance, google, bing all supported by SerpAPI)
        const results = await this.serpapi.search(query, options);
        return { provider: 'serpapi', results };
    }
}
//# sourceMappingURL=provider.factory.js.map
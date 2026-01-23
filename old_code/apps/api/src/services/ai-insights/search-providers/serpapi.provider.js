export class SerpApiProvider {
    http;
    apiKey;
    monitoring;
    name = 'serpapi';
    baseUrl = 'https://serpapi.com/search';
    isEnabled;
    constructor(http, apiKey, monitoring) {
        this.http = http;
        this.apiKey = apiKey;
        this.monitoring = monitoring;
        this.isEnabled = !!apiKey;
        if (!apiKey && process.env.NODE_ENV !== 'test') {
            this.monitoring?.trackEvent('serpapi.provider.disabled', { reason: 'api-key-not-configured' });
        }
    }
    async search(query, options) {
        if (!this.isEnabled) {
            return [];
        }
        const searchType = options?.searchType || 'web';
        const params = this.buildParams(query, searchType, options?.maxResults);
        const response = await this.http.get(this.baseUrl, {
            params: {
                ...params,
                api_key: this.apiKey,
            },
            timeout: 30000, // 30s timeout
        });
        const results = this.parseResults(response.data, searchType, options?.maxResults);
        if (results.length === 0) {
            throw new Error(`No results found from SerpAPI for query: "${query}"`);
        }
        return results;
    }
    buildParams(query, searchType, maxResults = 10) {
        const params = {
            q: query,
            num: Math.min(maxResults, 100), // SerpAPI supports up to 100 results per request
        };
        // Map search types to SerpAPI engine parameters
        switch (searchType) {
            case 'news':
                params.engine = 'google_news_light';
                break;
            case 'finance':
                params.engine = 'google_finance';
                break;
            case 'bing':
                params.engine = 'bing';
                break;
            case 'google':
            case 'web':
            default:
                // Default Google Search engine
                params.engine = 'google';
                break;
        }
        return params;
    }
    parseResults(data, searchType, maxResults = 10) {
        let results = [];
        try {
            // Extract results based on search type
            switch (searchType) {
                case 'news': {
                    const newsResults = data.news_results || [];
                    if (newsResults.length === 0) {
                        throw new Error('No news results in SerpAPI response');
                    }
                    results = newsResults.slice(0, maxResults).map((item, idx) => ({
                        id: `serp-news-${idx + 1}`,
                        title: item.title || '',
                        url: item.link || '',
                        snippet: item.snippet || '',
                        rank: item.position || idx + 1,
                        source: item.source || 'news',
                    }));
                    break;
                }
                case 'finance': {
                    const financeResults = data.finance_results || [];
                    if (financeResults.length === 0) {
                        throw new Error('No finance results in SerpAPI response');
                    }
                    results = financeResults.slice(0, maxResults).map((item, idx) => ({
                        id: `serp-finance-${idx + 1}`,
                        title: item.title || item.ticker || '',
                        url: item.link || '',
                        snippet: `${item.ticker || 'N/A'}`,
                        rank: item.position || idx + 1,
                        source: 'finance',
                    }));
                    break;
                }
                case 'web':
                case 'google':
                case 'bing':
                default: {
                    // For Google and Bing, use organic_results
                    const organicResults = data.organic_results || data.search_results || [];
                    if (organicResults.length === 0) {
                        throw new Error('No organic results in SerpAPI response');
                    }
                    results = organicResults.slice(0, maxResults).map((item, idx) => ({
                        id: `serp-${idx + 1}`,
                        title: item.title || '',
                        url: item.link || '',
                        snippet: item.snippet || '',
                        rank: item.position || idx + 1,
                        source: searchType === 'bing' ? 'bing' : 'google',
                    }));
                    break;
                }
            }
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'serpapi.provider.parse-response' });
            throw error;
        }
        return results;
    }
}
//# sourceMappingURL=serpapi.provider.js.map
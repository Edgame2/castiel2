export class BingProvider {
    http;
    apiKey;
    name = 'bing';
    constructor(http, apiKey) {
        this.http = http;
        this.apiKey = apiKey;
    }
    async search(query, options) {
        if (!this.apiKey) {
            return this.mockResults(query, options?.maxResults);
        }
        // NOTE: Real Bing Search API call would go here.
        return this.mockResults(query, options?.maxResults);
    }
    mockResults(query, maxResults = 5) {
        return Array.from({ length: maxResults }).map((_, idx) => ({
            id: `bing-${idx + 1}`,
            title: `Bing Result ${idx + 1} for ${query}`,
            url: `https://bing.example.com/${encodeURIComponent(query)}/${idx + 1}`,
            snippet: `Bing snippet ${idx + 1} for ${query}`,
            rank: idx + 1,
            source: 'bing',
        }));
    }
}
//# sourceMappingURL=bing.provider.js.map
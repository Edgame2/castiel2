import type { AxiosInstance } from 'axios';
import type { SearchResultItem } from '../web-search.types.js';

export class BingProvider {
    name: 'bing' = 'bing';

    constructor(private http: AxiosInstance, private apiKey?: string) { }

    async search(query: string, options?: { searchType?: string; maxResults?: number }): Promise<SearchResultItem[]> {
        if (!this.apiKey) {
            return this.mockResults(query, options?.maxResults);
        }
        // NOTE: Real Bing Search API call would go here.
        return this.mockResults(query, options?.maxResults);
    }

    private mockResults(query: string, maxResults = 5): SearchResultItem[] {
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

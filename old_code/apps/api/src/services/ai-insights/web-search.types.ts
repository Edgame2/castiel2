export interface SearchQueryOptions {
    tenantId: string;
    userId: string;
    projectId?: string;
    conversationId?: string;
    deepSearch?: boolean;
    maxPages?: number;
    searchType?: 'web' | 'news' | 'finance' | 'bing';
    provider?: 'serpapi' | 'bing';
}

export interface SearchResultItem {
    id: string;
    title: string;
    url: string;
    snippet: string;
    rank: number;
    source: 'serpapi' | 'bing';
}

export interface SearchResultDocument {
    id: string;
    tenantId: string;
    query: string;
    queryHash: string;
    partitionKey: string[];
    type: 'search-result';
    provider: string;
    results: SearchResultItem[];
    metadata: {
        createdAt: string;
        deepSearch: boolean;
    };
}

export interface ScrapedPageChunk {
    text: string;
    embedding: number[];
    startIndex: number;
}

export interface ScrapedPageDocument {
    id: string;
    tenantId: string;
    projectId: string;
    sourceQuery: string;
    partitionKey: string[];
    type: 'webpage';
    url: string;
    content: string;
    embedding: {
        model: string;
        chunkSize: number;
        chunks: ScrapedPageChunk[];
    };
    metadata: {
        title: string;
        scrapedAt: string;
        scrapeDuration: number;
        searchType: string;
    };
}

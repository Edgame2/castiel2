export type SearchType = 'web' | 'news' | 'academic'

export interface SearchResultItem {
    id?: string
    title: string
    url: string
    snippet?: string
    provider?: string
    domain?: string
    relevanceScore?: number
    publishedDate?: string
    faviconUrl?: string
}

export interface SearchCostBreakdown {
    searchCost: number
    deepSearchCost?: number
    totalCost: number
}

export interface SearchResponsePayload {
    search: {
        id?: string
        query?: string
        results: SearchResultItem[]
        resultCount?: number
        createdAt?: string
        provider?: string
        metadata?: Record<string, unknown>
    }
    deepSearch?: {
        pages: DeepSearchPage[]
        totalCost: number
        duration: number
    }
    costBreakdown: SearchCostBreakdown
}

export interface DeepSearchPage {
    url: string
    status?: 'pending' | 'processing' | 'completed' | 'failed'
    title?: string
    contentLength?: number
    chunks?: SemanticChunk[]
    scrapedAt?: string
    error?: string
}

export interface SemanticChunk {
    id?: string
    text: string
    embedding?: number[]
    similarity?: number
    tokenCount?: number
}

export interface ScrapingProgressEvent {
    currentPage: number
    totalPages: number
    currentUrl: string
    status: 'fetching' | 'parsing' | 'chunking' | 'embedding' | 'complete' | 'error'
    progress: number
    message?: string
}

export interface SearchHistoryItem {
    id: string
    query: string
    resultCount: number
    provider?: string
    cost?: number
    createdAt: string
}

export interface SearchStatistics {
    totalSearches: number
    totalWebPages: number
    totalChunks: number
    averageChunksPerPage: number
}

export interface RecurringSearchRequest {
    query: string
    searchType: SearchType
    deepSearch?: boolean
    deepSearchPages?: number
    schedule?: string
    projectId?: string
}

export interface RecurringSearchResponse {
    searchId: string
    executedAt: string
    nextExecution?: string
}

export interface WebPagePreviewData {
    url: string
    title?: string
    author?: string
    publishDate?: string
    content?: string
    chunks?: SemanticChunk[]
    scrapedAt?: string
    sourceQuery?: string
    searchType?: SearchType
}

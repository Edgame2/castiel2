/**
 * Web Search Types
 * 
 * Core type definitions for web search and deep search functionality
 * including search results, scraped pages, embeddings, and chunks.
 */

// ============================================================================
// Search Result Types
// ============================================================================

/**
 * Metadata associated with a search query execution
 */
export interface SearchMetadata {
    /** When the search was performed */
    createdAt: string; // ISO 8601
    /** When the search results expire */
    expiresAt: string; // ISO 8601
    /** Whether these are fresh results from the API or cached */
    freshResults: boolean;
    /** Duration of the search in milliseconds */
    searchDuration: number;
    /** Cost in USD for this search execution */
    cost: number;
    /** Provider that executed the search */
    provider: 'serpapi' | 'bing' | 'google';
    /** Query parameters used */
    queryParams?: Record<string, unknown>;
}

/**
 * Citation information for a search result
 */
export interface Citation {
    /** Title of the source */
    title: string;
    /** URL of the source */
    url: string;
    /** Domain name extracted from URL */
    domain: string;
    /** When the page was last accessed */
    accessedAt: string; // ISO 8601
    /** Trust score for this source (0-1) */
    trustScore: number;
    /** Whether this source was deeply scraped */
    deepSearched?: boolean;
}

/**
 * A single search result with snippet and metadata
 */
export interface SearchResult {
    /** Unique ID for this result */
    id: string;
    /** Result position in the search results */
    position: number;
    /** Title of the result */
    title: string;
    /** URL of the result */
    url: string;
    /** Text snippet from the search result */
    snippet: string;
    /** Citation metadata */
    citation: Citation;
    /** Relevance score (0-1) assigned by search provider */
    relevanceScore: number;
    /** Whether result was selected for deep search */
    selected?: boolean;
}

/**
 * Complete search execution document stored in c_search container
 */
export interface SearchDocument {
    /** Cosmos DB document ID */
    id: string;
    /** Partition key: tenant ID */
    tenantId: string;
    /** Query hash for deduplication and caching */
    queryHash: string;
    /** Original search query */
    query: string;
    /** Search type: web, news, academic, etc. */
    searchType: 'web' | 'news' | 'academic' | 'images' | 'shopping';
    /** Number of results returned */
    resultCount: number;
    /** Array of search results */
    results: SearchResult[];
    /** Metadata about the search execution */
    metadata: SearchMetadata;
    /** Link to related AI insights document if created */
    relatedInsightId?: string;
    /** TTL: 30 days from creation */
    ttl?: number;
}

// ============================================================================
// Scraped Page Types
// ============================================================================

/**
 * A semantic chunk of text extracted and embedded from a scraped page
 */
export interface SemanticChunk {
    /** Unique ID for this chunk */
    id: string;
    /** The chunk content (max ~512 tokens) */
    content: string;
    /** Character position in source document */
    startPosition: number;
    /** Character position in source document */
    endPosition: number;
    /** Tokens in this chunk (estimate) */
    tokenCount: number;
    /** OpenAI embedding for semantic search (1536 dimensions) */
    embedding: number[];
    /** Embedding model used */
    embeddingModel: 'text-embedding-3-small';
    /** When the embedding was created */
    embeddedAt: string; // ISO 8601
    /** Cost in USD for embedding */
    embeddingCost: number;
}

/**
 * Structured metadata extracted from a web page
 */
export interface PageMetadata {
    /** Canonical URL of the page */
    canonicalUrl?: string;
    /** OpenGraph title */
    ogTitle?: string;
    /** OpenGraph description */
    ogDescription?: string;
    /** OpenGraph image URL */
    ogImage?: string;
    /** Meta description */
    description?: string;
    /** Extracted keywords */
    keywords?: string[];
    /** Author of the content */
    author?: string;
    /** Publish date */
    publishedDate?: string; // ISO 8601
    /** Last modified date */
    modifiedDate?: string; // ISO 8601
    /** Language of the content */
    language?: string;
    /** Character encoding */
    charset?: string;
}

/**
 * Audit trail for a scraped page
 */
export interface PageAudit {
    /** Number of times accessed */
    accessCount: number;
    /** Last access timestamp */
    lastAccessedAt: string; // ISO 8601
    /** In how many conversations was this used */
    usedInConversations: number;
    /** Relevance feedback scores */
    relevanceScores?: number[];
    /** Average relevance score */
    avgRelevanceScore?: number;
}

/**
 * Scrape execution metadata
 */
export interface ScrapeMetadata {
    /** When the page was scraped */
    scrapedAt: string; // ISO 8601
    /** HTTP status code from the fetch */
    statusCode: number;
    /** Content type of the response */
    contentType: string;
    /** Size of the response in bytes */
    contentSize: number;
    /** How long the page took to fetch (ms) */
    fetchDuration: number;
    /** How long parsing and chunking took (ms) */
    processingDuration: number;
    /** Cost in USD for this scraping operation */
    cost: number;
    /** Whether scraping succeeded */
    success: boolean;
    /** Error message if scraping failed */
    errorMessage?: string;
}

/**
 * Complete scraped page document stored in c_webpages container
 */
export interface WebPageDocument {
    /** Cosmos DB document ID */
    id: string;
    /** Partition key: tenant ID */
    tenantId: string;
    /** Project ID for organization */
    projectId: string;
    /** Source query used to find this page */
    sourceQuery: string;
    /** URL that was scraped */
    url: string;
    /** Page title */
    title: string;
    /** Complete HTML content (raw) */
    htmlContent: string;
    /** Extracted plain text */
    textContent: string;
    /** Extracted metadata */
    pageMetadata: PageMetadata;
    /** Semantic chunks with embeddings */
    chunks: SemanticChunk[];
    /** Number of chunks created */
    chunkCount: number;
    /** Scraping metadata */
    metadata: ScrapeMetadata;
    /** Audit trail */
    audit: PageAudit;
    /** Related search result ID if from search */
    searchResultId?: string;
    /** Related recurring search ID */
    recurringSearchId?: string;
    /** Related conversation ID if being used in chat */
    conversationId?: string;
    /** TTL: 30 days from creation */
    ttl?: number;
}

// ============================================================================
// Embedding Types
// ============================================================================

/**
 * Embedding result with metadata
 */
export interface EmbeddingResult {
    /** The text that was embedded */
    text: string;
    /** Vector embedding (1536 dimensions for text-embedding-3-small) */
    embedding: number[];
    /** Embedding model used */
    model: 'text-embedding-3-small';
    /** Number of tokens used */
    tokenCount: number;
    /** Cost in USD */
    cost: number;
    /** When embedding was created */
    createdAt: string; // ISO 8601
}

// ============================================================================
// Search Service Types
// ============================================================================

/**
 * Options for a web search operation
 */
export interface SearchOptions {
    /** Maximum number of results to return */
    maxResults?: number; // default: 10, max: 100
    /** Whether to use cached results if available */
    useCache?: boolean; // default: true
    /** Time in seconds to cache results */
    cacheDuration?: number; // default: 3600 (1 hour)
    /** Specific search type */
    type?: 'web' | 'news' | 'academic';
    /** Geographic location for localized results */
    location?: string;
    /** Language for results */
    language?: string;
    /** Whether to fetch fresh results regardless of cache */
    forceRefresh?: boolean;
}

/**
 * Options for deep search (scraping) operation
 */
export interface DeepSearchOptions {
    /** URLs to scrape (if not provided, uses top search results) */
    urls?: string[];
    /** Number of results to scrape (default: 3) */
    maxPages?: number;
    /** Custom CSS selectors for content extraction */
    selectors?: {
        mainContent?: string;
        article?: string;
        body?: string;
    };
    /** Whether to use a headless browser for JavaScript rendering */
    renderJavaScript?: boolean;
    /** Timeout in milliseconds for each page */
    timeout?: number; // default: 10000
}

/**
 * Scraping progress update sent via WebSocket/SSE
 */
export interface ScrapingProgress {
    /** Current page number being scraped */
    currentPage: number;
    /** Total pages to scrape */
    totalPages: number;
    /** URL being scraped */
    currentUrl: string;
    /** Status of current operation */
    status: 'fetching' | 'parsing' | 'chunking' | 'embedding' | 'complete';
    /** Progress percentage (0-100) */
    progress: number;
    /** Human-readable status message */
    message: string;
    /** Chunks extracted so far */
    chunksExtracted?: number;
    /** Elapsed time in milliseconds */
    elapsedMs?: number;
}

/**
 * Complete search response with optional deep search results
 */
export interface SearchResponse {
    /** Search document from cache/API */
    search: SearchDocument;
    /** Deep search results if requested */
    deepSearch?: {
        /** Pages that were scraped */
        pages: WebPageDocument[];
        /** Total cost of deep search in USD */
        totalCost: number;
        /** Time taken for deep search in milliseconds */
        duration: number;
    };
    /** Cost breakdown */
    costBreakdown: {
        searchCost: number;
        deepSearchCost?: number;
        embeddingsCost?: number;
        totalCost: number;
    };
}

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Normalized search provider response
 */
export interface ProviderSearchResponse {
    /** Results returned by the provider */
    results: Array<{
        position: number;
        title: string;
        url: string;
        snippet: string;
    }>;
    /** Total results available (may be higher than returned) */
    totalResults?: number;
    /** Execution time */
    executionTime?: number;
    /** Cost incurred */
    cost?: number;
    /** Any warnings or notices */
    notices?: string[];
}

/**
 * Search provider interface
 */
export interface SearchProvider {
    /** Name of the provider */
    name: string;
    /** Search method */
    search(query: string, options?: SearchOptions): Promise<ProviderSearchResponse>;
    /** Check if provider is available */
    isAvailable(): Promise<boolean>;
}

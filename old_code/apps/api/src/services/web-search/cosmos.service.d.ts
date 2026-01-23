/**
 * Web Search Cosmos DB Service
 *
 * Handles all database operations for web search and deep search data,
 * including saving search results, scraped pages, chunks, and embeddings.
 */
import { Database } from '@azure/cosmos';
import { SearchDocument, WebPageDocument, SemanticChunk } from './types.js';
export declare class WebSearchCosmosService {
    private searchContainer;
    private webpagesContainer;
    constructor(database: Database);
    /**
     * Save a complete search execution result
     */
    saveSearchResult(document: SearchDocument): Promise<SearchDocument>;
    /**
     * Get search results by query hash (check cache)
     */
    getSearchByQueryHash(tenantId: string, queryHash: string): Promise<SearchDocument | null>;
    /**
     * Get all searches for a tenant, paginated
     */
    getSearchesByTenant(tenantId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        searches: SearchDocument[];
        total: number;
    }>;
    /**
     * Check if search results are still fresh (not expired)
     */
    isFresh(document: SearchDocument): boolean;
    /**
     * Save a scraped web page with chunks and embeddings
     */
    saveWebPage(document: WebPageDocument): Promise<WebPageDocument>;
    /**
     * Get a web page by URL and tenant
     */
    getWebPageByUrl(tenantId: string, projectId: string, url: string): Promise<WebPageDocument | null>;
    /**
     * Get all web pages for a project
     */
    getWebPagesByProject(tenantId: string, projectId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        pages: WebPageDocument[];
        total: number;
    }>;
    /**
     * Get web pages by recurring search ID
     */
    getWebPagesByRecurringSearch(tenantId: string, recurringSearchId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        pages: WebPageDocument[];
        total: number;
    }>;
    /**
     * Update access metadata for a web page
     */
    updatePageAccess(pageId: string, tenantId: string): Promise<void>;
    /**
     * Add conversation reference to a web page
     */
    addConversationReference(pageId: string, tenantId: string, conversationId: string): Promise<void>;
    /**
     * Search for chunks by semantic similarity (vector search)
     * Note: This requires vector index to be configured in Azure Portal
     */
    searchChunksBySimilarity(tenantId: string, embedding: number[], options?: {
        limit?: number;
        threshold?: number;
    }): Promise<{
        page: WebPageDocument;
        chunk: SemanticChunk;
        similarity: number;
    }[]>;
    /**
     * Compute cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Delete old search results (cleanup expired data)
     */
    deleteExpiredSearches(tenantId: string): Promise<number>;
    /**
     * Get database statistics
     */
    getStats(tenantId: string): Promise<{
        totalSearches: number;
        totalWebPages: number;
        totalChunks: number;
        averageChunksPerPage: number;
    }>;
}
export default WebSearchCosmosService;
//# sourceMappingURL=cosmos.service.d.ts.map
/**
 * Web Search Cosmos DB Service
 *
 * Handles all database operations for web search and deep search data,
 * including saving search results, scraped pages, chunks, and embeddings.
 */
export class WebSearchCosmosService {
    searchContainer;
    webpagesContainer;
    constructor(database) {
        this.searchContainer = database.container('c_search');
        this.webpagesContainer = database.container('c_webpages');
    }
    // ========================================================================
    // Search Results Operations
    // ========================================================================
    /**
     * Save a complete search execution result
     */
    async saveSearchResult(document) {
        try {
            const response = await this.searchContainer.items.create(document);
            return response.resource;
        }
        catch (error) {
            throw new Error(`Failed to save search result: ${error}`);
        }
    }
    /**
     * Get search results by query hash (check cache)
     */
    async getSearchByQueryHash(tenantId, queryHash) {
        try {
            const querySpec = {
                query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.queryHash = @queryHash`,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@queryHash', value: queryHash },
                ],
            };
            const { resources } = await this.searchContainer.items
                .query(querySpec)
                .fetchAll();
            return resources.length > 0 ? resources[0] : null;
        }
        catch (error) {
            throw new Error(`Failed to fetch search by query hash: ${error}`);
        }
    }
    /**
     * Get all searches for a tenant, paginated
     */
    async getSearchesByTenant(tenantId, options) {
        try {
            const limit = options?.limit || 20;
            const offset = options?.offset || 0;
            // Get count
            const countQuerySpec = {
                query: `SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId`,
                parameters: [{ name: '@tenantId', value: tenantId }],
            };
            const { resources: countResults } = await this.searchContainer.items
                .query(countQuerySpec)
                .fetchAll();
            const total = countResults[0]?.value || 0;
            // Get paginated results
            const searchesQuerySpec = {
                query: `SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.metadata.createdAt DESC OFFSET @offset LIMIT @limit`,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@offset', value: offset },
                    { name: '@limit', value: limit },
                ],
            };
            const { resources: searches } = await this.searchContainer.items
                .query(searchesQuerySpec)
                .fetchAll();
            return { searches, total };
        }
        catch (error) {
            throw new Error(`Failed to fetch searches by tenant: ${error}`);
        }
    }
    /**
     * Check if search results are still fresh (not expired)
     */
    isFresh(document) {
        const expiryTime = new Date(document.metadata.expiresAt).getTime();
        return expiryTime > Date.now();
    }
    // ========================================================================
    // Web Pages Operations (Deep Search)
    // ========================================================================
    /**
     * Save a scraped web page with chunks and embeddings
     */
    async saveWebPage(document) {
        try {
            const response = await this.webpagesContainer.items.create(document);
            return response.resource;
        }
        catch (error) {
            throw new Error(`Failed to save web page: ${error}`);
        }
    }
    /**
     * Get a web page by URL and tenant
     */
    async getWebPageByUrl(tenantId, projectId, url) {
        try {
            const querySpec = {
                query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.projectId = @projectId AND c.url = @url`,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@projectId', value: projectId },
                    { name: '@url', value: url },
                ],
            };
            const { resources } = await this.webpagesContainer.items
                .query(querySpec)
                .fetchAll();
            return resources.length > 0 ? resources[0] : null;
        }
        catch (error) {
            throw new Error(`Failed to fetch web page by URL: ${error}`);
        }
    }
    /**
     * Get all web pages for a project
     */
    async getWebPagesByProject(tenantId, projectId, options) {
        try {
            const limit = options?.limit || 20;
            const offset = options?.offset || 0;
            // Get count
            const countQuerySpec = {
                query: `SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.projectId = @projectId`,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@projectId', value: projectId },
                ],
            };
            const { resources: countResults } = await this.webpagesContainer.items
                .query(countQuerySpec)
                .fetchAll();
            const total = countResults[0]?.value || 0;
            // Get paginated results
            const pagesQuerySpec = {
                query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.projectId = @projectId ORDER BY c.metadata.scrapedAt DESC OFFSET @offset LIMIT @limit`,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@projectId', value: projectId },
                    { name: '@offset', value: offset },
                    { name: '@limit', value: limit },
                ],
            };
            const { resources: pages } = await this.webpagesContainer.items
                .query(pagesQuerySpec)
                .fetchAll();
            return { pages, total };
        }
        catch (error) {
            throw new Error(`Failed to fetch web pages by project: ${error}`);
        }
    }
    /**
     * Get web pages by recurring search ID
     */
    async getWebPagesByRecurringSearch(tenantId, recurringSearchId, options) {
        try {
            const limit = options?.limit || 20;
            const offset = options?.offset || 0;
            // Get count
            const countQuerySpec = {
                query: `SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.recurringSearchId = @recurringSearchId`,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@recurringSearchId', value: recurringSearchId },
                ],
            };
            const { resources: countResults } = await this.webpagesContainer.items
                .query(countQuerySpec)
                .fetchAll();
            const total = countResults[0]?.value || 0;
            // Get paginated results, ordered by access count (most used first)
            const pagesQuerySpec = {
                query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.recurringSearchId = @recurringSearchId ORDER BY c.audit.accessCount DESC OFFSET @offset LIMIT @limit`,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@recurringSearchId', value: recurringSearchId },
                    { name: '@offset', value: offset },
                    { name: '@limit', value: limit },
                ],
            };
            const { resources: pages } = await this.webpagesContainer.items
                .query(pagesQuerySpec)
                .fetchAll();
            return { pages, total };
        }
        catch (error) {
            throw new Error(`Failed to fetch web pages by recurring search: ${error}`);
        }
    }
    /**
     * Update access metadata for a web page
     */
    async updatePageAccess(pageId, tenantId) {
        try {
            const page = await this.webpagesContainer.item(pageId, tenantId).read();
            if (!page.resource) {
                throw new Error('Page not found');
            }
            const updatedPage = page.resource;
            updatedPage.audit.accessCount++;
            updatedPage.audit.lastAccessedAt = new Date().toISOString();
            await this.webpagesContainer.item(pageId, tenantId).replace(updatedPage);
        }
        catch (error) {
            throw new Error(`Failed to update page access: ${error}`);
        }
    }
    /**
     * Add conversation reference to a web page
     */
    async addConversationReference(pageId, tenantId, conversationId) {
        try {
            const page = await this.webpagesContainer.item(pageId, tenantId).read();
            if (!page.resource) {
                throw new Error('Page not found');
            }
            const updatedPage = page.resource;
            updatedPage.conversationId = conversationId;
            updatedPage.audit.usedInConversations++;
            await this.webpagesContainer.item(pageId, tenantId).replace(updatedPage);
        }
        catch (error) {
            throw new Error(`Failed to add conversation reference: ${error}`);
        }
    }
    // ========================================================================
    // Semantic Search Operations
    // ========================================================================
    /**
     * Search for chunks by semantic similarity (vector search)
     * Note: This requires vector index to be configured in Azure Portal
     */
    async searchChunksBySimilarity(tenantId, embedding, options) {
        try {
            const limit = options?.limit || 10;
            const threshold = options?.threshold || 0.7;
            // For now, this is a placeholder that demonstrates the query pattern
            // Full vector search requires Azure Cosmos DB Vector Search API (preview)
            // and proper vector index configuration
            const querySpec = {
                query: `SELECT * FROM c WHERE c.tenantId = @tenantId AND ARRAY_LENGTH(c.chunks) > 0`,
                parameters: [{ name: '@tenantId', value: tenantId }],
            };
            const { resources } = await this.webpagesContainer.items
                .query(querySpec)
                .fetchAll();
            const results = [];
            // Compute similarity scores (using cosine distance as placeholder)
            for (const page of resources) {
                for (const chunk of page.chunks) {
                    const similarity = this.cosineSimilarity(embedding, chunk.embedding);
                    if (similarity >= threshold) {
                        results.push({ page, chunk, similarity });
                    }
                }
            }
            // Sort by similarity and return top results
            return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
        }
        catch (error) {
            throw new Error(`Failed to search chunks by similarity: ${error}`);
        }
    }
    /**
     * Compute cosine similarity between two vectors
     */
    cosineSimilarity(a, b) {
        const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }
        return dotProduct / (magnitudeA * magnitudeB);
    }
    // ========================================================================
    // Bulk Operations
    // ========================================================================
    /**
     * Delete old search results (cleanup expired data)
     */
    async deleteExpiredSearches(tenantId) {
        try {
            const querySpec = {
                query: `SELECT c.id FROM c WHERE c.tenantId = @tenantId AND c.metadata.expiresAt < GetCurrentTimestamp()`,
                parameters: [{ name: '@tenantId', value: tenantId }],
            };
            const { resources } = await this.searchContainer.items
                .query(querySpec)
                .fetchAll();
            let deleted = 0;
            for (const item of resources) {
                await this.searchContainer.item(item.id, tenantId).delete();
                deleted++;
            }
            return deleted;
        }
        catch (error) {
            throw new Error(`Failed to delete expired searches: ${error}`);
        }
    }
    /**
     * Get database statistics
     */
    async getStats(tenantId) {
        try {
            // Count searches
            const searchCountQuerySpec = {
                query: `SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId`,
                parameters: [{ name: '@tenantId', value: tenantId }],
            };
            const { resources: searchCount } = await this.searchContainer.items
                .query(searchCountQuerySpec)
                .fetchAll();
            // Count pages
            const pageCountQuerySpec = {
                query: `SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId`,
                parameters: [{ name: '@tenantId', value: tenantId }],
            };
            const { resources: pageCount } = await this.webpagesContainer.items
                .query(pageCountQuerySpec)
                .fetchAll();
            // Count total chunks and avg
            const chunkStatsQuerySpec = {
                query: `SELECT VALUE {
            totalChunks: SUM(c.chunkCount),
            totalPages: COUNT(1)
          } FROM c WHERE c.tenantId = @tenantId`,
                parameters: [{ name: '@tenantId', value: tenantId }],
            };
            const { resources: chunkStats } = await this.webpagesContainer.items
                .query(chunkStatsQuerySpec)
                .fetchAll();
            const stats = chunkStats[0];
            return {
                totalSearches: searchCount[0]?.value || 0,
                totalWebPages: pageCount[0]?.value || 0,
                totalChunks: stats?.totalChunks || 0,
                averageChunksPerPage: stats && stats.totalPages > 0 ? stats.totalChunks / stats.totalPages : 0,
            };
        }
        catch (error) {
            throw new Error(`Failed to get statistics: ${error}`);
        }
    }
}
export default WebSearchCosmosService;
//# sourceMappingURL=cosmos.service.js.map
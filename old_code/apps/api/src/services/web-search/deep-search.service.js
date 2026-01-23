/**
 * Deep Search Service
 *
 * Orchestrates deep search operations: fetch search results,
 * scrape selected pages, chunk content, generate embeddings,
 * and save everything to the database.
 */
export class DeepSearchService {
    cosmosService;
    scraperService;
    embeddingService;
    monitoring;
    constructor(cosmosService, scraperService, embeddingService, monitoring) {
        this.cosmosService = cosmosService;
        this.scraperService = scraperService;
        this.embeddingService = embeddingService;
        this.monitoring = monitoring;
    }
    // ========================================================================
    // Main Deep Search Operation
    // ========================================================================
    /**
     * Execute deep search on provided URLs or search results
     */
    async deepSearch(searchResults, tenantId, projectId, sourceQuery, options) {
        const startTime = Date.now();
        const urls = Array.isArray(searchResults[0])
            ? searchResults
            : searchResults.map((r) => r.url);
        const maxPages = Math.min(options?.maxPages || 3, urls.length);
        const pagesToScrape = urls.slice(0, maxPages);
        const result = {
            pages: [],
            statistics: {
                totalPages: pagesToScrape.length,
                successfulPages: 0,
                failedPages: 0,
                totalChunks: 0,
                totalTokens: 0,
                totalCost: 0,
                totalDuration: 0,
            },
        };
        // Scrape and process each page
        for (let i = 0; i < pagesToScrape.length; i++) {
            const url = pagesToScrape[i];
            try {
                // Progress: fetching
                this.emitProgress(options?.onProgress, {
                    currentPage: i + 1,
                    totalPages: maxPages,
                    currentUrl: url,
                    status: 'fetching',
                    progress: Math.floor((i / maxPages) * 25), // 0-25% for fetching phase
                    message: `Fetching ${url}...`,
                });
                // 1. Scrape the page
                const doc = await this.scraperService.scrapeAndCreateDocument(url, tenantId, projectId, sourceQuery, {
                    searchResultId: this.getSearchResultId(searchResults, url),
                });
                if (!doc) {
                    result.statistics.failedPages++;
                    continue;
                }
                // Progress: parsing
                this.emitProgress(options?.onProgress, {
                    currentPage: i + 1,
                    totalPages: maxPages,
                    currentUrl: url,
                    status: 'parsing',
                    progress: Math.floor((i / maxPages) * 25 + 25), // 25-50% for parsing
                    message: `Parsing content from ${url}...`,
                });
                // 2. Chunk the content (already done in scrapeAndCreateDocument)
                const chunks = doc.chunks;
                // Progress: chunking
                this.emitProgress(options?.onProgress, {
                    currentPage: i + 1,
                    totalPages: maxPages,
                    currentUrl: url,
                    status: 'chunking',
                    progress: Math.floor((i / maxPages) * 25 + 50), // 50-75% for chunking
                    message: `Created ${chunks.length} chunks for ${url}...`,
                    chunksExtracted: chunks.length,
                });
                // 3. Generate embeddings for chunks
                const embeddedChunks = await this.embeddingService.embedChunks(chunks);
                doc.chunks = embeddedChunks;
                // Update chunk cost
                const chunkCost = embeddedChunks.reduce((sum, c) => sum + c.embeddingCost, 0);
                doc.metadata.cost += chunkCost;
                // Progress: embedding
                this.emitProgress(options?.onProgress, {
                    currentPage: i + 1,
                    totalPages: maxPages,
                    currentUrl: url,
                    status: 'embedding',
                    progress: Math.floor((i / maxPages) * 25 + 75), // 75-100% for embedding
                    message: `Generated embeddings for ${chunks.length} chunks...`,
                    chunksExtracted: chunks.length,
                });
                // 4. Save to database
                const savedDoc = await this.cosmosService.saveWebPage(doc);
                // Update statistics
                result.pages.push(savedDoc);
                result.statistics.successfulPages++;
                result.statistics.totalChunks += chunks.length;
                result.statistics.totalTokens += embeddedChunks.reduce((sum, c) => sum + c.tokenCount, 0);
                result.statistics.totalCost += savedDoc.metadata.cost;
            }
            catch (error) {
                this.monitoring?.trackException(error, { operation: 'deep-search.scrape-page', url });
                result.statistics.failedPages++;
            }
        }
        // Final progress
        result.statistics.totalDuration = Date.now() - startTime;
        this.emitProgress(options?.onProgress, {
            currentPage: maxPages,
            totalPages: maxPages,
            currentUrl: pagesToScrape[maxPages - 1] || '',
            status: 'complete',
            progress: 100,
            message: `Deep search complete: ${result.statistics.successfulPages}/${result.statistics.totalPages} pages processed`,
            elapsedMs: result.statistics.totalDuration,
        });
        return result;
    }
    // ========================================================================
    // Helper Methods
    // ========================================================================
    /**
     * Get search result ID for a URL if available
     */
    getSearchResultId(searchResults, url) {
        if (Array.isArray(searchResults[0]) && typeof searchResults[0] === 'string') {
            return undefined;
        }
        const searchResult = searchResults.find((r) => r.url === url);
        return searchResult?.id;
    }
    /**
     * Emit progress update if callback is provided
     */
    emitProgress(callback, progress) {
        if (callback) {
            callback(progress);
        }
    }
    /**
     * Search for similar content across scraped pages
     */
    async searchSimilarContent(tenantId, queryEmbedding, options) {
        const results = await this.cosmosService.searchChunksBySimilarity(tenantId, queryEmbedding, options);
        return results.map((result) => ({
            page: result.page,
            content: result.chunk.content,
            similarity: result.similarity,
        }));
    }
    /**
     * Get scraping statistics for a tenant
     */
    async getStatistics(tenantId) {
        return this.cosmosService.getStats(tenantId);
    }
}
export default DeepSearchService;
//# sourceMappingURL=deep-search.service.js.map
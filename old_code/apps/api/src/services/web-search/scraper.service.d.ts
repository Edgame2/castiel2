/**
 * Web Scraper Service
 *
 * Handles scraping web pages, extracting content, chunking text,
 * and preparing content for embeddings.
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { WebPageDocument, SemanticChunk, PageMetadata } from './types.js';
/**
 * Scraping configuration
 */
export interface ScraperConfig {
    timeout?: number;
    maxPageSize?: number;
    defaultChunkSize?: number;
    userAgent?: string;
}
/**
 * Scraping result
 */
export interface ScrapeResult {
    success: boolean;
    url: string;
    title: string;
    htmlContent: string;
    textContent: string;
    pageMetadata: PageMetadata;
    statusCode: number;
    contentSize: number;
    fetchDuration: number;
    errorMessage?: string;
}
export declare class WebScraperService {
    private client;
    private config;
    private monitoring?;
    constructor(config?: ScraperConfig, monitoring?: IMonitoringProvider);
    /**
     * Scrape a single web page
     */
    scrapePage(url: string): Promise<ScrapeResult>;
    /**
     * Remove script and style tags from DOM
     */
    private removeScripts;
    /**
     * Extract plain text from parsed HTML
     */
    private extractText;
    /**
     * Extract metadata from HTML head
     */
    private extractMetadata;
    /**
     * Break text into semantic chunks
     * Uses simple heuristics: sentences, paragraphs, and character limits
     */
    chunkText(text: string, maxChunkSize?: number): string[];
    /**
     * Split text into sentences
     */
    private splitSentences;
    /**
     * Estimate token count (rough approximation)
     * Assumes ~4 characters per token on average
     */
    estimateTokenCount(text: string): number;
    /**
     * Create semantic chunk objects with metadata
     */
    createChunks(text: string, sourceUrl: string): SemanticChunk[];
    /**
     * Complete scrape operation: fetch, parse, chunk
     * Returns a WebPageDocument ready for database storage
     */
    scrapeAndCreateDocument(url: string, tenantId: string, projectId: string, sourceQuery: string, metadata?: {
        searchResultId?: string;
        recurringSearchId?: string;
    }): Promise<WebPageDocument | null>;
    /**
     * Calculate scraping cost based on page size
     * Rough estimate: ~$0.0001 per MB for hosting and processing
     */
    private calculateScrapingCost;
}
export default WebScraperService;
//# sourceMappingURL=scraper.service.d.ts.map
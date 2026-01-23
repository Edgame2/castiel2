/**
 * Web Scraper Service
 *
 * Handles scraping web pages, extracting content, chunking text,
 * and preparing content for embeddings.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
export class WebScraperService {
    client;
    config;
    monitoring;
    constructor(config, monitoring) {
        this.config = {
            timeout: config?.timeout || 10000,
            maxPageSize: config?.maxPageSize || 5 * 1024 * 1024, // 5 MB
            defaultChunkSize: config?.defaultChunkSize || 1500, // characters
            userAgent: config?.userAgent ||
                'Mozilla/5.0 (Castiel/1.0; +https://castiel.ai) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        };
        this.monitoring = monitoring;
        this.client = axios.create({
            timeout: this.config.timeout,
            headers: {
                'User-Agent': this.config.userAgent,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
            },
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 400,
        });
    }
    // ========================================================================
    // Web Scraping
    // ========================================================================
    /**
     * Scrape a single web page
     */
    async scrapePage(url) {
        const startTime = Date.now();
        try {
            const response = await this.client.get(url);
            const htmlContent = response.data;
            const contentSize = Buffer.byteLength(htmlContent, 'utf8');
            // Check size limits
            if (contentSize > this.config.maxPageSize) {
                return {
                    success: false,
                    url,
                    title: '',
                    htmlContent: '',
                    textContent: '',
                    pageMetadata: {},
                    statusCode: 413, // Payload too large
                    contentSize,
                    fetchDuration: Date.now() - startTime,
                    errorMessage: `Page size (${contentSize} bytes) exceeds limit (${this.config.maxPageSize} bytes)`,
                };
            }
            // Parse HTML
            const $ = cheerio.load(htmlContent);
            // Extract title
            const title = $('title').first().text() || $('h1').first().text() || 'Untitled';
            // Extract metadata
            const pageMetadata = this.extractMetadata($);
            // Extract text content
            this.removeScripts($);
            const textContent = this.extractText($);
            return {
                success: true,
                url,
                title,
                htmlContent,
                textContent,
                pageMetadata,
                statusCode: response.status,
                contentSize,
                fetchDuration: Date.now() - startTime,
            };
        }
        catch (error) {
            const fetchDuration = Date.now() - startTime;
            return {
                success: false,
                url,
                title: '',
                htmlContent: '',
                textContent: '',
                pageMetadata: {},
                statusCode: error.response?.status || 500,
                contentSize: 0,
                fetchDuration,
                errorMessage: error.message,
            };
        }
    }
    // ========================================================================
    // HTML Parsing and Content Extraction
    // ========================================================================
    /**
     * Remove script and style tags from DOM
     */
    removeScripts($) {
        $('script, style, noscript, meta, link').remove();
    }
    /**
     * Extract plain text from parsed HTML
     */
    extractText($) {
        const mainContent = $('main').html() || $('article').html() || $('[role="main"]').html() || $('body').html();
        if (!mainContent) {
            return '';
        }
        const $content = cheerio.load(mainContent);
        let text = $content.text();
        // Clean up whitespace
        text = text
            .replace(/\s+/g, ' ') // Multiple spaces to single space
            .replace(/\n+/g, '\n') // Multiple newlines to single
            .trim();
        return text;
    }
    /**
     * Extract metadata from HTML head
     */
    extractMetadata($) {
        return {
            canonicalUrl: $('link[rel="canonical"]').attr('href'),
            ogTitle: $('meta[property="og:title"]').attr('content'),
            ogDescription: $('meta[property="og:description"]').attr('content'),
            ogImage: $('meta[property="og:image"]').attr('content'),
            description: $('meta[name="description"]').attr('content'),
            keywords: $('meta[name="keywords"]')
                .attr('content')
                ?.split(',')
                .map((k) => k.trim()),
            author: $('meta[name="author"]').attr('content'),
            publishedDate: $('meta[property="article:published_time"]').attr('content'),
            modifiedDate: $('meta[property="article:modified_time"]').attr('content'),
            language: $('html').attr('lang'),
            charset: $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content'),
        };
    }
    // ========================================================================
    // Text Chunking
    // ========================================================================
    /**
     * Break text into semantic chunks
     * Uses simple heuristics: sentences, paragraphs, and character limits
     */
    chunkText(text, maxChunkSize = this.config.defaultChunkSize) {
        if (!text || text.length === 0) {
            return [];
        }
        const chunks = [];
        const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
        let currentChunk = '';
        for (const paragraph of paragraphs) {
            const paragraphLength = paragraph.length;
            // If paragraph alone exceeds max size, split it further
            if (paragraphLength > maxChunkSize) {
                // Flush current chunk first
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
                // Split large paragraph by sentences
                const sentences = this.splitSentences(paragraph);
                let sentenceChunk = '';
                for (const sentence of sentences) {
                    if ((sentenceChunk + sentence).length > maxChunkSize) {
                        if (sentenceChunk.length > 0) {
                            chunks.push(sentenceChunk.trim());
                        }
                        sentenceChunk = sentence;
                    }
                    else {
                        sentenceChunk += sentence;
                    }
                }
                if (sentenceChunk.length > 0) {
                    chunks.push(sentenceChunk.trim());
                }
            }
            else {
                // Add paragraph to current chunk
                const combined = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
                if (combined.length > maxChunkSize) {
                    if (currentChunk.length > 0) {
                        chunks.push(currentChunk.trim());
                    }
                    currentChunk = paragraph;
                }
                else {
                    currentChunk = combined;
                }
            }
        }
        // Add final chunk
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
        }
        return chunks;
    }
    /**
     * Split text into sentences
     */
    splitSentences(text) {
        // Simple sentence splitting on periods, exclamation marks, question marks
        // followed by space and capital letter or end of string
        const sentencePattern = /([^.!?]*[.!?]+)\s+(?=[A-Z])|([^.!?]*[.!?]+)$/g;
        const sentences = [];
        let match;
        while ((match = sentencePattern.exec(text)) !== null) {
            const sentence = (match[1] || match[2]).trim();
            if (sentence.length > 0) {
                sentences.push(sentence + ' ');
            }
        }
        // Handle remaining text
        const lastIndex = sentencePattern.lastIndex;
        if (lastIndex < text.length) {
            const remaining = text.substring(lastIndex).trim();
            if (remaining.length > 0) {
                sentences.push(remaining);
            }
        }
        return sentences;
    }
    /**
     * Estimate token count (rough approximation)
     * Assumes ~4 characters per token on average
     */
    estimateTokenCount(text) {
        return Math.ceil(text.length / 4);
    }
    // ========================================================================
    // Chunk Object Creation
    // ========================================================================
    /**
     * Create semantic chunk objects with metadata
     */
    createChunks(text, sourceUrl) {
        const chunks = this.chunkText(text);
        const semanticChunks = [];
        let currentPosition = 0;
        for (let i = 0; i < chunks.length; i++) {
            const content = chunks[i];
            const startPosition = text.indexOf(content, currentPosition);
            const endPosition = startPosition + content.length;
            semanticChunks.push({
                id: crypto.randomUUID(),
                content,
                startPosition,
                endPosition,
                tokenCount: this.estimateTokenCount(content),
                embedding: [], // Will be filled by EmbeddingService
                embeddingModel: 'text-embedding-3-small',
                embeddedAt: new Date().toISOString(),
                embeddingCost: 0, // Will be calculated by EmbeddingService
            });
            currentPosition = endPosition;
        }
        return semanticChunks;
    }
    // ========================================================================
    // Complete Scrape and Create Document
    // ========================================================================
    /**
     * Complete scrape operation: fetch, parse, chunk
     * Returns a WebPageDocument ready for database storage
     */
    async scrapeAndCreateDocument(url, tenantId, projectId, sourceQuery, metadata) {
        const startTime = Date.now();
        // 1. Scrape the page
        const scrapeResult = await this.scrapePage(url);
        if (!scrapeResult.success) {
            // Return null on failure; caller can handle error tracking
            this.monitoring?.trackException(new Error(scrapeResult.errorMessage || 'Scraping failed'), { operation: 'scraper.scrape-page', url });
            return null;
        }
        // 2. Create chunks
        const chunks = this.createChunks(scrapeResult.textContent, url);
        // 3. Build web page document
        const processingDuration = Date.now() - startTime - scrapeResult.fetchDuration;
        const document = {
            id: crypto.randomUUID(),
            tenantId,
            projectId,
            sourceQuery,
            url,
            title: scrapeResult.title,
            htmlContent: scrapeResult.htmlContent,
            textContent: scrapeResult.textContent,
            pageMetadata: scrapeResult.pageMetadata,
            chunks,
            chunkCount: chunks.length,
            metadata: {
                scrapedAt: new Date().toISOString(),
                statusCode: scrapeResult.statusCode,
                contentType: 'text/html',
                contentSize: scrapeResult.contentSize,
                fetchDuration: scrapeResult.fetchDuration,
                processingDuration,
                cost: this.calculateScrapingCost(scrapeResult.contentSize),
                success: true,
            },
            audit: {
                accessCount: 0,
                lastAccessedAt: new Date().toISOString(),
                usedInConversations: 0,
            },
            searchResultId: metadata?.searchResultId,
            recurringSearchId: metadata?.recurringSearchId,
        };
        // Set TTL (30 days)
        document.ttl = 60 * 60 * 24 * 30;
        return document;
    }
    /**
     * Calculate scraping cost based on page size
     * Rough estimate: ~$0.0001 per MB for hosting and processing
     */
    calculateScrapingCost(contentSize) {
        const megabytes = contentSize / (1024 * 1024);
        return Math.max(0.0001, megabytes * 0.0001);
    }
}
export default WebScraperService;
//# sourceMappingURL=scraper.service.js.map
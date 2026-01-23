/**
 * Google News Integration Adapter
 * Uses Google News RSS or News API for fetching news articles
 */
import { BaseIntegrationAdapter, adapterRegistry, } from '../base-adapter.js';
import { IntegrationCategory, } from '../../types/integration.types.js';
/**
 * Google News Integration Adapter
 */
export class GoogleNewsAdapter extends BaseIntegrationAdapter {
    apiKey = '';
    constructor(monitoring, connectionService, tenantId, connectionId) {
        super(monitoring, connectionService, 'google-news', tenantId, connectionId);
    }
    /**
     * Get Google News integration definition
     */
    getDefinition() {
        return GOOGLE_NEWS_DEFINITION;
    }
    /**
     * Initialize with API key from connection
     */
    async initialize() {
        if (this.apiKey) {
            return;
        }
        const credentials = await this.connectionService.getDecryptedCredentials(this.connectionId, this.integrationId);
        if (credentials?.type === 'api_key') {
            this.apiKey = credentials.apiKey;
        }
        else if (credentials?.type === 'custom') {
            this.apiKey = credentials.data.apiKey;
        }
    }
    /**
     * Test connection to Google News API
     */
    async testConnection() {
        await this.initialize();
        if (!this.apiKey) {
            return { success: false, error: 'API key not configured' };
        }
        try {
            // Test with a simple query
            const result = await this.fetchFromNewsAPI({
                entity: 'article',
                filters: { q: 'test' },
                limit: 1,
            });
            return {
                success: result.records.length > 0 || result.total === 0,
                details: {
                    totalResults: result.total,
                },
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Fetch news articles
     */
    async fetch(options) {
        await this.initialize();
        // Use News API if API key is available
        if (this.apiKey) {
            return this.fetchFromNewsAPI(options);
        }
        // Fallback to RSS parsing (limited)
        return this.fetchFromRSS(options);
    }
    /**
     * Fetch from News API
     */
    async fetchFromNewsAPI(options) {
        const { filters = {}, limit = 20, offset = 0 } = options;
        const params = new URLSearchParams();
        // Query parameters
        if (filters.q || filters.query) {
            params.set('q', filters.q || filters.query);
        }
        if (filters.sources) {
            params.set('sources', Array.isArray(filters.sources) ? filters.sources.join(',') : filters.sources);
        }
        if (filters.domains) {
            params.set('domains', Array.isArray(filters.domains) ? filters.domains.join(',') : filters.domains);
        }
        if (filters.from) {
            params.set('from', new Date(filters.from).toISOString().split('T')[0]);
        }
        if (filters.to) {
            params.set('to', new Date(filters.to).toISOString().split('T')[0]);
        }
        if (filters.language) {
            params.set('language', filters.language);
        }
        if (filters.country) {
            params.set('country', filters.country);
        }
        if (filters.category) {
            params.set('category', filters.category);
        }
        if (filters.sortBy) {
            params.set('sortBy', filters.sortBy);
        }
        // Pagination
        params.set('pageSize', String(Math.min(limit, 100)));
        params.set('page', String(Math.floor(offset / limit) + 1));
        params.set('apiKey', this.apiKey);
        // Determine endpoint
        const endpoint = filters.q || filters.query
            ? 'https://newsapi.org/v2/everything'
            : 'https://newsapi.org/v2/top-headlines';
        try {
            const response = await fetch(`${endpoint}?${params.toString()}`);
            if (!response.ok) {
                const error = await response.json();
                this.monitoring.trackEvent('googlenews.fetch.error', {
                    status: response.status,
                    error: error.message,
                });
                return { records: [], hasMore: false };
            }
            const data = await response.json();
            const articles = data.articles.map((article, index) => ({
                id: this.generateArticleId(article),
                title: article.title,
                description: article.description,
                url: article.url,
                source: {
                    name: article.source?.name,
                    url: article.source?.url,
                },
                publishedAt: article.publishedAt,
                author: article.author,
                imageUrl: article.urlToImage,
                content: article.content,
            }));
            return {
                records: articles,
                total: data.totalResults,
                hasMore: offset + articles.length < data.totalResults,
                nextOffset: offset + articles.length,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'googlenews.fetchFromNewsAPI',
            });
            return { records: [], hasMore: false };
        }
    }
    /**
     * Fetch from Google News RSS (fallback)
     */
    async fetchFromRSS(options) {
        const { filters = {}, limit = 20 } = options;
        // Build RSS URL
        let rssUrl = 'https://news.google.com/rss';
        if (filters.q || filters.query) {
            rssUrl += '/search?q=' + encodeURIComponent(filters.q || filters.query);
        }
        else if (filters.topic) {
            rssUrl += `/topics/${filters.topic}`;
        }
        if (filters.hl) {
            rssUrl += (rssUrl.includes('?') ? '&' : '?') + `hl=${filters.hl}`;
        }
        if (filters.gl) {
            rssUrl += (rssUrl.includes('?') ? '&' : '?') + `gl=${filters.gl}`;
        }
        try {
            const response = await fetch(rssUrl);
            const xml = await response.text();
            // Parse RSS XML (basic parsing)
            const articles = this.parseRSSXML(xml, limit);
            return {
                records: articles,
                hasMore: false,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'googlenews.fetchFromRSS',
            });
            return { records: [], hasMore: false };
        }
    }
    /**
     * Parse RSS XML to articles
     */
    parseRSSXML(xml, limit) {
        const articles = [];
        // Simple regex-based XML parsing
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) !== null && articles.length < limit) {
            const item = match[1];
            const title = this.extractXMLValue(item, 'title');
            const link = this.extractXMLValue(item, 'link');
            const description = this.extractXMLValue(item, 'description');
            const pubDate = this.extractXMLValue(item, 'pubDate');
            const source = this.extractXMLValue(item, 'source');
            if (title && link) {
                articles.push({
                    id: this.hashString(link),
                    title: this.decodeHTMLEntities(title),
                    description: this.decodeHTMLEntities(description || ''),
                    url: link,
                    source: {
                        name: source || 'Google News',
                    },
                    publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                });
            }
        }
        return articles;
    }
    /**
     * Extract value from XML tag
     */
    extractXMLValue(xml, tag) {
        const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const match = regex.exec(xml);
        return match ? (match[1] || match[2] || '').trim() : '';
    }
    /**
     * Decode HTML entities
     */
    decodeHTMLEntities(text) {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/<[^>]*>/g, ''); // Strip HTML tags
    }
    /**
     * Generate article ID from URL
     */
    generateArticleId(article) {
        return this.hashString(article.url || `${article.title}-${article.publishedAt}`);
    }
    /**
     * Simple hash function
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * Push not supported for news
     */
    async push(_data, _options) {
        return {
            success: false,
            error: 'Google News does not support pushing data',
        };
    }
    /**
     * Get entity schema for articles
     */
    async getEntitySchema(entityName) {
        if (entityName !== 'article') {
            return null;
        }
        return GOOGLE_NEWS_ARTICLE_ENTITY;
    }
    /**
     * Search news articles
     */
    async search(options) {
        await this.initialize();
        const startTime = Date.now();
        const { query, limit = 20, offset = 0, filters } = options;
        // Use fetch to get articles matching the query
        const fetchResult = await this.fetch({
            entity: 'article',
            filters: {
                q: query,
                ...filters?.fieldFilters,
                ...(filters?.dateRange?.start && { from: filters.dateRange.start.toISOString().split('T')[0] }),
                ...(filters?.dateRange?.end && { to: filters.dateRange.end.toISOString().split('T')[0] }),
            },
            limit,
            offset,
        });
        // Transform articles to SearchResultItem
        const searchResults = fetchResult.records.map((article) => {
            // Calculate relevance score based on query match
            const score = this.calculateRelevanceScore(query, article);
            // Extract highlights
            const highlights = this.extractHighlights(query, article);
            return {
                id: article.id,
                entity: 'article',
                title: article.title,
                description: article.description,
                url: article.url,
                score,
                highlights,
                metadata: {
                    source: article.source,
                    publishedAt: article.publishedAt,
                    author: article.author,
                    imageUrl: article.imageUrl,
                },
                integrationId: this.integrationId,
                integrationName: '', // Will be set by search service
                providerName: 'google-news',
            };
        });
        return {
            results: searchResults,
            total: fetchResult.total || searchResults.length,
            took: Date.now() - startTime,
            hasMore: fetchResult.hasMore || false,
        };
    }
    /**
     * Calculate relevance score for a news article
     */
    calculateRelevanceScore(query, article) {
        const queryLower = query.toLowerCase();
        let score = 0.5; // Base score
        // Title match (highest relevance)
        if (article.title?.toLowerCase().includes(queryLower)) {
            score = 0.9;
        }
        // Description match
        if (article.description?.toLowerCase().includes(queryLower)) {
            score = Math.max(score, 0.7);
        }
        // Content match (if available)
        if (article.content?.toLowerCase().includes(queryLower)) {
            score = Math.max(score, 0.6);
        }
        // Source match
        if (article.source?.name?.toLowerCase().includes(queryLower)) {
            score = Math.max(score, 0.5);
        }
        return Math.min(score, 1.0);
    }
    /**
     * Extract highlighted text from article
     */
    extractHighlights(query, article) {
        const queryLower = query.toLowerCase();
        const highlights = [];
        // Extract from title
        if (article.title?.toLowerCase().includes(queryLower)) {
            const index = article.title.toLowerCase().indexOf(queryLower);
            const start = Math.max(0, index - 30);
            const end = Math.min(article.title.length, index + query.length + 30);
            highlights.push(article.title.substring(start, end));
        }
        // Extract from description
        if (article.description?.toLowerCase().includes(queryLower)) {
            const index = article.description.toLowerCase().indexOf(queryLower);
            const start = Math.max(0, index - 30);
            const end = Math.min(article.description.length, index + query.length + 30);
            highlights.push(article.description.substring(start, end));
        }
        return highlights.slice(0, 3); // Limit to 3 highlights
    }
    /**
     * List available entities
     */
    async listEntities() {
        return [GOOGLE_NEWS_ARTICLE_ENTITY];
    }
}
/**
 * Google News article entity
 */
const GOOGLE_NEWS_ARTICLE_ENTITY = {
    name: 'article',
    displayName: 'News Article',
    description: 'News articles from various sources',
    fields: [
        { name: 'id', displayName: 'ID', type: 'string', required: true, readOnly: true },
        { name: 'title', displayName: 'Title', type: 'string', required: true, readOnly: true },
        { name: 'description', displayName: 'Description', type: 'string', required: false, readOnly: true },
        { name: 'url', displayName: 'URL', type: 'string', required: true, readOnly: true },
        { name: 'source', displayName: 'Source', type: 'object', required: true, readOnly: true },
        { name: 'publishedAt', displayName: 'Published At', type: 'datetime', required: true, readOnly: true },
        { name: 'author', displayName: 'Author', type: 'string', required: false, readOnly: true },
        { name: 'imageUrl', displayName: 'Image URL', type: 'string', required: false, readOnly: true },
        { name: 'content', displayName: 'Content', type: 'string', required: false, readOnly: true },
    ],
    supportsPull: true,
    supportsPush: false,
    supportsDelete: false,
    supportsWebhook: false,
    idField: 'id',
    modifiedField: 'publishedAt',
};
/**
 * Google News integration definition
 */
export const GOOGLE_NEWS_DEFINITION = {
    id: 'google-news',
    name: 'google_news',
    displayName: 'Google News',
    description: 'Fetch news articles from Google News based on keywords, topics, or industries.',
    category: IntegrationCategory.DATA_SOURCE,
    icon: 'newspaper',
    color: '#4285F4',
    visibility: 'superadmin_only', // System-wide integration
    isPremium: false,
    capabilities: ['read', 'search'],
    supportedSyncDirections: ['pull'],
    supportsRealtime: false,
    supportsWebhooks: false,
    authType: 'api_key',
    availableEntities: [GOOGLE_NEWS_ARTICLE_ENTITY],
    connectionScope: 'system', // One connection for all tenants
    status: 'active',
    version: '1.0.0',
    documentationUrl: 'https://newsapi.org/docs',
    createdAt: new Date(),
    updatedAt: new Date(),
};
/**
 * Google News adapter factory
 */
export const googleNewsAdapterFactory = {
    create(monitoring, connectionService, tenantId, connectionId) {
        return new GoogleNewsAdapter(monitoring, connectionService, tenantId, connectionId);
    },
};
// Register adapter
adapterRegistry.register('google-news', googleNewsAdapterFactory);
//# sourceMappingURL=google-news.adapter.js.map
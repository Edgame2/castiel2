/**
 * Google News Integration Adapter
 * Uses Google News RSS or News API for fetching news articles
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseIntegrationAdapter, FetchOptions, FetchResult, PushOptions, PushResult, IntegrationAdapterFactory } from '../base-adapter.js';
import { IntegrationConnectionService } from '../../services/integration-connection.service.js';
import { IntegrationDefinition, IntegrationEntity, SearchOptions, SearchResult } from '../../types/integration.types.js';
/**
 * Google News Integration Adapter
 */
export declare class GoogleNewsAdapter extends BaseIntegrationAdapter {
    private apiKey;
    constructor(monitoring: IMonitoringProvider, connectionService: IntegrationConnectionService, tenantId: string, connectionId: string);
    /**
     * Get Google News integration definition
     */
    getDefinition(): IntegrationDefinition;
    /**
     * Initialize with API key from connection
     */
    private initialize;
    /**
     * Test connection to Google News API
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }>;
    /**
     * Fetch news articles
     */
    fetch(options: FetchOptions): Promise<FetchResult>;
    /**
     * Fetch from News API
     */
    private fetchFromNewsAPI;
    /**
     * Fetch from Google News RSS (fallback)
     */
    private fetchFromRSS;
    /**
     * Parse RSS XML to articles
     */
    private parseRSSXML;
    /**
     * Extract value from XML tag
     */
    private extractXMLValue;
    /**
     * Decode HTML entities
     */
    private decodeHTMLEntities;
    /**
     * Generate article ID from URL
     */
    private generateArticleId;
    /**
     * Simple hash function
     */
    private hashString;
    /**
     * Push not supported for news
     */
    push(_data: Record<string, any>, _options: PushOptions): Promise<PushResult>;
    /**
     * Get entity schema for articles
     */
    getEntitySchema(entityName: string): Promise<IntegrationEntity | null>;
    /**
     * Search news articles
     */
    search(options: SearchOptions): Promise<SearchResult>;
    /**
     * Calculate relevance score for a news article
     */
    private calculateRelevanceScore;
    /**
     * Extract highlighted text from article
     */
    private extractHighlights;
    /**
     * List available entities
     */
    listEntities(): Promise<IntegrationEntity[]>;
}
/**
 * Google News integration definition
 */
export declare const GOOGLE_NEWS_DEFINITION: IntegrationDefinition;
/**
 * Google News adapter factory
 */
export declare const googleNewsAdapterFactory: IntegrationAdapterFactory;
//# sourceMappingURL=google-news.adapter.d.ts.map
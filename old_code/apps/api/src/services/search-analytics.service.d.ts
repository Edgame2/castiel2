/**
 * Search Analytics Service
 *
 * Comprehensive analytics for vector search including:
 * - Query analytics
 * - Zero-result detection
 * - Satisfaction metrics
 * - Popular terms dashboard
 */
import { Database } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import type { SearchQueryEvent, QueryAnalytics, ZeroResultQuery, SatisfactionMetric, PopularTermsDashboard, SearchAnalyticsRequest, SearchInteractionEvent } from '../types/search-analytics.types.js';
export declare class SearchAnalyticsService {
    private readonly redis;
    private readonly monitoring;
    private analyticsContainer;
    private interactionsContainer;
    private readonly RETENTION_DAYS;
    constructor(database: Database, redis: Redis | null, monitoring: IMonitoringProvider);
    /**
     * Hash a query string for deduplication
     */
    private hashQuery;
    /**
     * Record a search query event
     */
    recordSearchEvent(event: Omit<SearchQueryEvent, 'id' | 'queryHash'>): Promise<SearchQueryEvent>;
    /**
     * Record a user interaction with search results
     */
    recordInteraction(event: Omit<SearchInteractionEvent, 'queryHash'> & {
        query: string;
        filters?: Record<string, any>;
    }): Promise<void>;
    /**
     * Get analytics for a specific query
     */
    getQueryAnalytics(tenantId: string, query: string, filters?: Record<string, any>): Promise<QueryAnalytics | null>;
    /**
     * Get zero-result queries
     */
    getZeroResultQueries(request: SearchAnalyticsRequest): Promise<ZeroResultQuery[]>;
    /**
     * Get satisfaction metrics
     */
    getSatisfactionMetrics(tenantId: string, queryHash?: string): Promise<SatisfactionMetric[]>;
    /**
     * Get popular terms dashboard
     */
    getPopularTermsDashboard(request: SearchAnalyticsRequest): Promise<PopularTermsDashboard>;
    private getDateKey;
    private getStartDateForPeriod;
    private generateSuggestions;
    private getTopQueries;
    private getTopZeroResultQueries;
    private getSearchVolumeTrend;
    private getAggregateMetrics;
}
//# sourceMappingURL=search-analytics.service.d.ts.map
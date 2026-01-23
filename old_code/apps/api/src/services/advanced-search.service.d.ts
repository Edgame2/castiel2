import { IMonitoringProvider } from '@castiel/monitoring';
import { Container } from '@azure/cosmos';
import { AdvancedSearchQuery, AdvancedSearchResult, SavedSearch, CreateSavedSearchInput, UpdateSavedSearchInput, PopularSearchTerm } from '../types/advanced-search.types.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardEdgeRepository } from '../repositories/shard-edge.repository.js';
import { Redis } from 'ioredis';
interface AdvancedSearchServiceOptions {
    monitoring: IMonitoringProvider;
    shardContainer: Container;
    shardRepository: ShardRepository;
    shardEdgeRepository: ShardEdgeRepository;
    redis?: Redis;
}
/**
 * Advanced Search Service
 * Complex querying with facets, filters, and saved searches
 */
export declare class AdvancedSearchService {
    private monitoring;
    private shardContainer;
    private shardRepository;
    private shardEdgeRepository;
    private redis?;
    private savedSearchesContainer?;
    constructor(options: AdvancedSearchServiceOptions);
    /**
     * Execute advanced search query
     */
    search(query: AdvancedSearchQuery): Promise<AdvancedSearchResult>;
    /**
     * Build Cosmos DB query from advanced search query
     */
    private buildCosmosQuery;
    /**
     * Build SQL for condition group
     */
    private buildConditionGroupSql;
    /**
     * Build SQL for single condition
     */
    private buildConditionSql;
    /**
     * Calculate facets from results
     */
    private calculateFacets;
    /**
     * Calculate a single facet
     */
    private calculateFacet;
    /**
     * Get total count for query
     */
    private getTotalCount;
    /**
     * Extract highlights from result
     */
    private extractHighlights;
    /**
     * Count filters in query
     */
    private countFilters;
    /**
     * Count conditions in group
     */
    private countConditions;
    /**
     * Get nested value from object
     */
    private getNestedValue;
    /**
     * Create a saved search
     */
    createSavedSearch(input: CreateSavedSearchInput): Promise<SavedSearch>;
    /**
     * Update a saved search
     */
    updateSavedSearch(id: string, tenantId: string, input: UpdateSavedSearchInput): Promise<SavedSearch | null>;
    /**
     * Get a saved search
     */
    getSavedSearch(id: string, tenantId: string): Promise<SavedSearch | null>;
    /**
     * List saved searches
     */
    listSavedSearches(tenantId: string, userId: string, options?: {
        visibility?: 'private' | 'team' | 'tenant';
        limit?: number;
    }): Promise<SavedSearch[]>;
    /**
     * Delete a saved search
     */
    deleteSavedSearch(id: string, tenantId: string): Promise<boolean>;
    /**
     * Execute a saved search
     */
    executeSavedSearch(id: string, tenantId: string, overrides?: Partial<AdvancedSearchQuery>): Promise<AdvancedSearchResult>;
    /**
     * Track search event
     */
    private trackSearchEvent;
    /**
     * Get popular search terms
     */
    getPopularSearchTerms(tenantId: string, limit?: number): Promise<PopularSearchTerm[]>;
}
export {};
//# sourceMappingURL=advanced-search.service.d.ts.map
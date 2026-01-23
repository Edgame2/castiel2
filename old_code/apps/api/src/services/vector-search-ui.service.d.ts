/**
 * Vector Search UI Service
 *
 * Manages search history, saved searches, and autocomplete for vector search
 */
import { Database } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import type { SearchHistoryEntry, SavedVectorSearch, CreateSavedVectorSearchInput, UpdateSavedVectorSearchInput, AutocompleteRequest, AutocompleteResponse } from '../types/vector-search-ui.types.js';
export declare class VectorSearchUIService {
    private readonly redis;
    private readonly monitoring;
    private historyContainer;
    private savedSearchesContainer;
    private readonly MAX_HISTORY_PER_USER;
    private readonly HISTORY_RETENTION_DAYS;
    constructor(database: Database, redis: Redis | null, monitoring: IMonitoringProvider);
    /**
     * Record a search in history
     */
    recordSearchHistory(userId: string, tenantId: string, query: string, options?: {
        filters?: Record<string, any>;
        resultCount?: number;
        shardTypeId?: string;
        topK?: number;
        minScore?: number;
    }): Promise<SearchHistoryEntry>;
    /**
     * Get search history for a user
     */
    getSearchHistory(userId: string, tenantId: string, options?: {
        limit?: number;
        offset?: number;
        shardTypeId?: string;
    }): Promise<{
        entries: SearchHistoryEntry[];
        total: number;
    }>;
    /**
     * Clear search history for a user
     */
    clearSearchHistory(userId: string, tenantId: string): Promise<void>;
    /**
     * Create a saved search
     */
    createSavedSearch(userId: string, tenantId: string, input: CreateSavedVectorSearchInput): Promise<SavedVectorSearch>;
    /**
     * Get saved searches for a user
     */
    getSavedSearches(userId: string, tenantId: string, options?: {
        includeShared?: boolean;
        visibility?: 'private' | 'team' | 'tenant';
    }): Promise<SavedVectorSearch[]>;
    /**
     * Get a saved search by ID
     */
    getSavedSearch(id: string, userId: string, tenantId: string): Promise<SavedVectorSearch | null>;
    /**
     * Update a saved search
     */
    updateSavedSearch(id: string, userId: string, tenantId: string, input: UpdateSavedVectorSearchInput): Promise<SavedVectorSearch | null>;
    /**
     * Delete a saved search
     */
    deleteSavedSearch(id: string, userId: string, tenantId: string): Promise<boolean>;
    /**
     * Record usage of a saved search
     */
    recordSavedSearchUsage(id: string, userId: string, tenantId: string): Promise<void>;
    /**
     * Get autocomplete suggestions
     */
    getAutocompleteSuggestions(userId: string, tenantId: string, request: AutocompleteRequest): Promise<AutocompleteResponse>;
    /**
     * Track popular search terms (called after successful searches)
     */
    trackPopularSearch(tenantId: string, query: string, options?: {
        shardTypeId?: string;
    }): Promise<void>;
}
//# sourceMappingURL=vector-search-ui.service.d.ts.map
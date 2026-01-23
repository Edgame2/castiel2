/**
 * Vector Search UI Service
 * 
 * Manages search history, saved searches, and autocomplete for vector search
 */

import { Container, Database } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { Redis } from 'ioredis';
import type {
  SearchHistoryEntry,
  SavedVectorSearch,
  CreateSavedVectorSearchInput,
  UpdateSavedVectorSearchInput,
  AutocompleteRequest,
  AutocompleteResponse,
  AutocompleteSuggestion,
} from '../types/vector-search-ui.types.js';

const SEARCH_HISTORY_CONTAINER = 'search-history';
const SAVED_SEARCHES_CONTAINER = 'saved-searches';

export class VectorSearchUIService {
  private historyContainer: Container;
  private savedSearchesContainer: Container;
  private readonly MAX_HISTORY_PER_USER = 100;
  private readonly HISTORY_RETENTION_DAYS = 90;

  constructor(
    database: Database,
    private readonly redis: Redis | null,
    private readonly monitoring: IMonitoringProvider
  ) {
    this.historyContainer = database.container(SEARCH_HISTORY_CONTAINER);
    this.savedSearchesContainer = database.container(SAVED_SEARCHES_CONTAINER);
  }

  /**
   * Record a search in history
   */
  async recordSearchHistory(
    userId: string,
    tenantId: string,
    query: string,
    options?: {
      filters?: Record<string, any>;
      resultCount?: number;
      shardTypeId?: string;
      topK?: number;
      minScore?: number;
    }
  ): Promise<SearchHistoryEntry> {
    const entry: SearchHistoryEntry = {
      id: uuidv4(),
      userId,
      tenantId,
      query: query.trim(),
      filters: options?.filters,
      resultCount: options?.resultCount,
      searchedAt: new Date(),
      shardTypeId: options?.shardTypeId,
      topK: options?.topK,
      minScore: options?.minScore,
    };

    try {
      // Store in Cosmos DB
      await this.historyContainer.items.upsert(entry);

      // Also cache in Redis for fast autocomplete
      if (this.redis) {
        const cacheKey = `search:history:${tenantId}:${userId}`;
        await this.redis.lpush(cacheKey, JSON.stringify(entry));
        await this.redis.ltrim(cacheKey, 0, this.MAX_HISTORY_PER_USER - 1);
        await this.redis.expire(cacheKey, this.HISTORY_RETENTION_DAYS * 24 * 60 * 60);
      }

      this.monitoring.trackEvent('vector-search.history.recorded', {
        userId,
        tenantId,
        queryLength: query.length,
      });

      return entry;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'vector-search-ui.record-history',
        userId,
        tenantId,
      });
      // Don't throw - history recording is non-critical
      return entry;
    }
  }

  /**
   * Get search history for a user
   */
  async getSearchHistory(
    userId: string,
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      shardTypeId?: string;
    }
  ): Promise<{
    entries: SearchHistoryEntry[];
    total: number;
  }> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    try {
      // Try Redis cache first
      if (this.redis) {
        const cacheKey = `search:history:${tenantId}:${userId}`;
        const cached = await this.redis.lrange(cacheKey, 0, limit + offset - 1);
        
        if (cached.length > 0) {
          const entries = cached
            .map(item => JSON.parse(item) as SearchHistoryEntry)
            .filter(entry => !options?.shardTypeId || entry.shardTypeId === options.shardTypeId)
            .slice(offset, offset + limit);

          return {
            entries,
            total: cached.length,
          };
        }
      }

      // Fallback to Cosmos DB
      const query = {
        query: 'SELECT * FROM c WHERE c.userId = @userId AND c.tenantId = @tenantId ORDER BY c.searchedAt DESC OFFSET @offset LIMIT @limit',
        parameters: [
          { name: '@userId', value: userId },
          { name: '@tenantId', value: tenantId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ],
      };

      if (options?.shardTypeId) {
        query.query = 'SELECT * FROM c WHERE c.userId = @userId AND c.tenantId = @tenantId AND c.shardTypeId = @shardTypeId ORDER BY c.searchedAt DESC OFFSET @offset LIMIT @limit';
        query.parameters.push({ name: '@shardTypeId', value: options.shardTypeId });
      }

      const { resources } = await this.historyContainer.items.query<SearchHistoryEntry>(query).fetchAll();

      return {
        entries: resources,
        total: resources.length,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'vector-search-ui.get-history',
        userId,
        tenantId,
      });
      return { entries: [], total: 0 };
    }
  }

  /**
   * Clear search history for a user
   */
  async clearSearchHistory(
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      // Delete from Cosmos DB
      const query = {
        query: 'SELECT * FROM c WHERE c.userId = @userId AND c.tenantId = @tenantId',
        parameters: [
          { name: '@userId', value: userId },
          { name: '@tenantId', value: tenantId },
        ],
      };

      const { resources } = await this.historyContainer.items.query<SearchHistoryEntry>(query).fetchAll();

      for (const entry of resources) {
        await this.historyContainer.item(entry.id, tenantId).delete();
      }

      // Clear Redis cache
      if (this.redis) {
        const cacheKey = `search:history:${tenantId}:${userId}`;
        await this.redis.del(cacheKey);
      }

      this.monitoring.trackEvent('vector-search.history.cleared', {
        userId,
        tenantId,
        deletedCount: resources.length,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'vector-search-ui.clear-history',
        userId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Create a saved search
   */
  async createSavedSearch(
    userId: string,
    tenantId: string,
    input: CreateSavedVectorSearchInput
  ): Promise<SavedVectorSearch> {
    const savedSearch: SavedVectorSearch = {
      id: uuidv4(),
      userId,
      tenantId,
      name: input.name,
      description: input.description,
      query: input.query,
      filters: input.filters,
      topK: input.topK,
      minScore: input.minScore,
      similarityMetric: input.similarityMetric,
      visibility: input.visibility || 'private',
      sharedWith: input.sharedWith,
      usageCount: 0,
      isPinned: input.tags?.includes('pinned') || false,
      tags: input.tags,
      icon: input.icon,
      color: input.color,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await this.savedSearchesContainer.items.upsert(savedSearch);

      this.monitoring.trackEvent('vector-search.saved-search.created', {
        userId,
        tenantId,
        searchId: savedSearch.id,
      });

      return savedSearch;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'vector-search-ui.create-saved-search',
        userId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Get saved searches for a user
   */
  async getSavedSearches(
    userId: string,
    tenantId: string,
    options?: {
      includeShared?: boolean;
      visibility?: 'private' | 'team' | 'tenant';
    }
  ): Promise<SavedVectorSearch[]> {
    try {
      const query: any = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
        parameters: [{ name: '@tenantId', value: tenantId }],
      };

      if (options?.visibility === 'private') {
        query.query += ' AND c.userId = @userId AND c.visibility = @visibility';
        query.parameters.push(
          { name: '@userId', value: userId },
          { name: '@visibility', value: 'private' }
        );
      } else if (options?.includeShared) {
        query.query += ' AND (c.userId = @userId OR c.visibility IN (@team, @tenant) OR @userId = ANY(c.sharedWith))';
        query.parameters.push(
          { name: '@userId', value: userId },
          { name: '@team', value: 'team' },
          { name: '@tenant', value: 'tenant' }
        );
      } else {
        query.query += ' AND c.userId = @userId';
        query.parameters.push({ name: '@userId', value: userId });
      }

      query.query += ' ORDER BY c.isPinned DESC, c.lastUsedAt DESC, c.createdAt DESC';

      const { resources } = await this.savedSearchesContainer.items.query<SavedVectorSearch>(query).fetchAll();

      return resources;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'vector-search-ui.get-saved-searches',
        userId,
        tenantId,
      });
      return [];
    }
  }

  /**
   * Get a saved search by ID
   */
  async getSavedSearch(
    id: string,
    userId: string,
    tenantId: string
  ): Promise<SavedVectorSearch | null> {
    try {
      const { resource } = await this.savedSearchesContainer
        .item(id, tenantId)
        .read<SavedVectorSearch>();

      if (!resource) {
        return null;
      }

      // Check access
      if (resource.userId !== userId && resource.visibility === 'private') {
        return null;
      }

      if (resource.visibility === 'team' && !resource.sharedWith?.includes(userId)) {
        return null;
      }

      return resource;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a saved search
   */
  async updateSavedSearch(
    id: string,
    userId: string,
    tenantId: string,
    input: UpdateSavedVectorSearchInput
  ): Promise<SavedVectorSearch | null> {
    const existing = await this.getSavedSearch(id, userId, tenantId);
    
    if (!existing) {
      return null;
    }

    // Only owner can update
    if (existing.userId !== userId) {
      throw new Error('Only the owner can update a saved search');
    }

    const updated: SavedVectorSearch = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      await this.savedSearchesContainer.items.upsert(updated);

      this.monitoring.trackEvent('vector-search.saved-search.updated', {
        userId,
        tenantId,
        searchId: id,
      });

      return updated;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'vector-search-ui.update-saved-search',
        userId,
        tenantId,
        searchId: id,
      });
      throw error;
    }
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(
    id: string,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    const existing = await this.getSavedSearch(id, userId, tenantId);
    
    if (!existing) {
      return false;
    }

    // Only owner can delete
    if (existing.userId !== userId) {
      throw new Error('Only the owner can delete a saved search');
    }

    try {
      await this.savedSearchesContainer.item(id, tenantId).delete();

      this.monitoring.trackEvent('vector-search.saved-search.deleted', {
        userId,
        tenantId,
        searchId: id,
      });

      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Record usage of a saved search
   */
  async recordSavedSearchUsage(
    id: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const savedSearch = await this.getSavedSearch(id, userId, tenantId);
      if (!savedSearch) {
        return;
      }

      savedSearch.usageCount++;
      savedSearch.lastUsedAt = new Date();
      savedSearch.updatedAt = new Date();

      await this.savedSearchesContainer.items.upsert(savedSearch);
    } catch (error) {
      // Non-critical - don't throw
      this.monitoring.trackException(error as Error, {
        operation: 'vector-search-ui.record-usage',
        searchId: id,
      });
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async getAutocompleteSuggestions(
    userId: string,
    tenantId: string,
    request: AutocompleteRequest
  ): Promise<AutocompleteResponse> {
    const suggestions: AutocompleteSuggestion[] = [];
    const limit = request.limit || 10;
    const partialQuery = request.partialQuery.toLowerCase().trim();

    if (partialQuery.length === 0) {
      return { suggestions: [], total: 0 };
    }

    try {
      // 1. Get suggestions from search history
      if (request.includeHistory !== false) {
        const history = await this.getSearchHistory(userId, tenantId, {
          limit: 50,
          shardTypeId: request.shardTypeId,
        });

        const historySuggestions = history.entries
          .filter(entry => entry.query.toLowerCase().includes(partialQuery))
          .map(entry => ({
            query: entry.query,
            type: 'history' as const,
            score: 0.9,
            metadata: {
              resultCount: entry.resultCount,
              lastSearched: entry.searchedAt,
            },
          }));

        suggestions.push(...historySuggestions);
      }

      // 2. Get popular search terms (from Redis or Cosmos DB)
      if (request.includePopular !== false && this.redis) {
        const popularKey = `search:popular:${tenantId}${request.shardTypeId ? `:${request.shardTypeId}` : ''}`;
        const popularTerms = await this.redis.zrevrange(popularKey, 0, limit - 1, 'WITHSCORES');

        for (let i = 0; i < popularTerms.length; i += 2) {
          const query = popularTerms[i];
          const score = parseFloat(popularTerms[i + 1] || '0');

          if (query.toLowerCase().includes(partialQuery)) {
            suggestions.push({
              query,
              type: 'popular',
              score: score / 100, // Normalize score
              metadata: {
                searchCount: Math.round(score),
              },
            });
          }
        }
      }

      // 3. Get suggestions from saved searches
      if (request.includeSuggestions !== false) {
        const savedSearches = await this.getSavedSearches(userId, tenantId, { includeShared: true });
        
        const savedSuggestions = savedSearches
          .filter(search => search.query.toLowerCase().includes(partialQuery))
          .map(search => ({
            query: search.query,
            type: 'suggestion' as const,
            score: 0.8,
            metadata: {
              searchName: search.name,
            },
          }));

        suggestions.push(...savedSuggestions);
      }

      // Deduplicate and sort by score
      const uniqueSuggestions = new Map<string, AutocompleteSuggestion>();
      
      for (const suggestion of suggestions) {
        const existing = uniqueSuggestions.get(suggestion.query);
        if (!existing || (suggestion.score || 0) > (existing.score || 0)) {
          uniqueSuggestions.set(suggestion.query, suggestion);
        }
      }

      const sortedSuggestions = Array.from(uniqueSuggestions.values())
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, limit);

      this.monitoring.trackEvent('vector-search.autocomplete.generated', {
        userId,
        tenantId,
        partialQuery,
        suggestionCount: sortedSuggestions.length,
      });

      return {
        suggestions: sortedSuggestions,
        total: sortedSuggestions.length,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'vector-search-ui.autocomplete',
        userId,
        tenantId,
      });
      return { suggestions: [], total: 0 };
    }
  }

  /**
   * Track popular search terms (called after successful searches)
   */
  async trackPopularSearch(
    tenantId: string,
    query: string,
    options?: {
      shardTypeId?: string;
    }
  ): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const key = `search:popular:${tenantId}${options?.shardTypeId ? `:${options.shardTypeId}` : ''}`;
      await this.redis.zincrby(key, 1, query.toLowerCase());
      await this.redis.expire(key, 90 * 24 * 60 * 60); // 90 days
    } catch (error) {
      // Non-critical - don't throw
      this.monitoring.trackException(error as Error, {
        operation: 'vector-search-ui.track-popular',
        tenantId,
      });
    }
  }
}


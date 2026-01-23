// @ts-nocheck - Optional service, not used by workers
/**
 * Entity Resolution Service
 * Resolves entity names (documents, opportunities, notes) to shardIds for context-aware queries
 */

import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '@castiel/api-core';
import { Shard } from '../types/shard.types.js';

// Cache configuration
const CACHE_PREFIX = 'entity:';
const CACHE_PREFIX_PROJECT = 'entity:project:';
const CACHE_PREFIX_CHOICE = 'entity:choice:';
const CACHE_TTL = 3600; // 1 hour (Redis cache)
const IN_MEMORY_CACHE_TTL = 300; // 5 minutes (in-memory cache)
const IN_MEMORY_CACHE_MAX_SIZE = 1000; // Maximum entries in memory cache

// Supported entity shard types
const ENTITY_SHARD_TYPES = ['c_document', 'c_opportunity', 'c_note'];

// Levenshtein distance threshold for fuzzy matching
const MAX_LEVENSHTEIN_DISTANCE = 2;

/**
 * In-memory cache entry
 */
interface InMemoryCacheEntry {
  value: ResolvedEntity[];
  expiresAt: number;
}

/**
 * Resolved entity result
 */
export interface ResolvedEntity {
  shardId: string;
  shardType: string;
  name: string;
  projectId?: string;
  score: number; // 0-1 similarity score
  lastModified?: Date;
}

/**
 * Entity suggestion for autocomplete
 */
export interface EntitySuggestion {
  shardId: string;
  shardType: string;
  name: string;
  projectId?: string;
  preview?: string;
}

/**
 * Entity Resolution Service
 */
export class EntityResolutionService {
  // In-memory cache (L2) for fast local access
  private inMemoryCache = new Map<string, InMemoryCacheEntry>();
  private lastCacheCleanup = Date.now();
  private readonly CACHE_CLEANUP_INTERVAL = 60000; // Clean up every minute

  constructor(
    private shardRepository: ShardRepository,
    private monitoring: IMonitoringProvider,
    private redis?: Redis
  ) {
    // Periodic cleanup of expired entries
    setInterval(() => {
      this.cleanupInMemoryCache();
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Normalize entity name for caching and comparison
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s-]/g, '');
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = [];

    for (let i = 0; i <= m; i++) {
      dp[i] = [i];
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // deletion
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate similarity score (0-1) based on Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) {return 1;}
    return 1 - distance / maxLength;
  }

  /**
   * Get cache key for entity resolution
   */
  private getCacheKey(tenantId: string, normalizedName: string): string {
    return `${CACHE_PREFIX}${tenantId}:${normalizedName}`;
  }

  /**
   * Get cache key for project-scoped entity resolution
   */
  private getProjectCacheKey(projectId: string, normalizedName: string): string {
    return `${CACHE_PREFIX_PROJECT}${projectId}:${normalizedName}`;
  }

  /**
   * Get cache key for user's entity choice
   */
  private getChoiceCacheKey(tenantId: string, queryHash: string): string {
    return `${CACHE_PREFIX_CHOICE}${tenantId}:${queryHash}`;
  }

  /**
   * Clean up expired entries from in-memory cache
   */
  private cleanupInMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.inMemoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.inMemoryCache.delete(key);
        cleaned++;
      }
    }

    // If cache is too large, remove oldest entries (LRU-like eviction)
    if (this.inMemoryCache.size > IN_MEMORY_CACHE_MAX_SIZE) {
      const entries = Array.from(this.inMemoryCache.entries())
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      
      const toRemove = this.inMemoryCache.size - IN_MEMORY_CACHE_MAX_SIZE;
      for (let i = 0; i < toRemove; i++) {
        this.inMemoryCache.delete(entries[i][0]);
      }
    }

    if (cleaned > 0 || this.inMemoryCache.size > IN_MEMORY_CACHE_MAX_SIZE) {
      this.monitoring.trackEvent('entity-resolution.cache.cleanup', {
        cleaned,
        remaining: this.inMemoryCache.size,
      });
    }
  }

  /**
   * Get from in-memory cache (L2)
   */
  private getFromInMemoryCache(cacheKey: string): ResolvedEntity[] | null {
    const entry = this.inMemoryCache.get(cacheKey);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      // Expired, remove it
      this.inMemoryCache.delete(cacheKey);
      return null;
    }

    return entry.value;
  }

  /**
   * Set in-memory cache (L2)
   */
  private setInMemoryCache(cacheKey: string, value: ResolvedEntity[]): void {
    // Cleanup if needed before adding
    if (this.inMemoryCache.size >= IN_MEMORY_CACHE_MAX_SIZE) {
      this.cleanupInMemoryCache();
    }

    this.inMemoryCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + IN_MEMORY_CACHE_TTL * 1000,
    });
  }

  /**
   * Invalidate in-memory cache for a specific key
   */
  private invalidateInMemoryCache(cacheKey: string): void {
    this.inMemoryCache.delete(cacheKey);
  }

  /**
   * Resolve entity name to shardId
   * Supports fuzzy matching and project-scoped resolution
   */
  async resolveEntity(
    tenantId: string,
    entityName: string,
    options: {
      projectId?: string; // Scope to project
      shardTypes?: string[]; // Filter by types: ['c_document', 'c_opportunity', 'c_note']
      limit?: number;
    } = {}
  ): Promise<ResolvedEntity[]> {
    const startTime = Date.now();
    const normalizedName = this.normalizeName(entityName);
    const shardTypes = options.shardTypes || ENTITY_SHARD_TYPES;
    const limit = options.limit || 10;

    try {
      const cacheKey = options.projectId
        ? this.getProjectCacheKey(options.projectId, normalizedName)
        : this.getCacheKey(tenantId, normalizedName);

      // L2 Cache: Check in-memory cache first (fastest)
      const inMemoryResult = this.getFromInMemoryCache(cacheKey);
      if (inMemoryResult) {
        this.monitoring.trackDependency(
          'memory.entity.resolve',
          'Memory',
          'cache',
          Date.now() - startTime,
          true
        );
        return inMemoryResult.slice(0, limit);
      }

      // L1 Cache: Check Redis cache (distributed)
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const cachedResults: ResolvedEntity[] = JSON.parse(cached);
          
          // Populate in-memory cache from Redis
          this.setInMemoryCache(cacheKey, cachedResults);
          
          this.monitoring.trackDependency(
            'redis.entity.resolve',
            'Redis',
            'cache',
            Date.now() - startTime,
            true
          );
          return cachedResults.slice(0, limit);
        }
      }

      // L3: Database query with fuzzy search
      const results: ResolvedEntity[] = [];

      // First, try exact match
      // Note: ShardRepository.list() only supports single shardTypeId, so we'll query each type separately
      // and combine results, then filter by projectId if needed
      const exactResults: Shard[] = [];
      
      for (const shardType of shardTypes) {
        const queryResult = await this.shardRepository.list({
          filter: {
            tenantId,
            shardTypeId: shardType,
          },
          limit: 50,
        });
        exactResults.push(...queryResult.shards);
      }

      // Filter by projectId if specified (check internal_relationships)
      let filteredResults = exactResults;
      if (options.projectId) {
        filteredResults = exactResults.filter(shard => {
          // Check if shard is linked to the project via relationships
          const hasProjectRelationship = shard.internal_relationships?.some(
            rel => rel.shardId === options.projectId
          );
          // Also check if projectId is in structuredData (some shards might store it directly)
          const hasProjectInData = shard.structuredData?.projectId === options.projectId;
          return hasProjectRelationship || hasProjectInData;
        });
      }

      // Process exact matches
      for (const shard of filteredResults) {
        if (!shard.name) {continue;}

        const normalizedShardName = this.normalizeName(shard.name);
        const similarity = this.calculateSimilarity(normalizedName, normalizedShardName);

        // Exact match gets high score
        if (normalizedShardName === normalizedName) {
          // Extract projectId from relationships or structuredData
          const projectId = shard.internal_relationships?.find(
            rel => rel.shardTypeId === 'c_project'
          )?.shardId || shard.structuredData?.projectId;

          results.push({
            shardId: shard.id,
            shardType: shard.shardTypeId,
            name: shard.name,
            projectId,
            score: 1.0,
            lastModified: shard.updatedAt,
          });
        } else if (similarity >= 0.7) {
          // Fuzzy match with good similarity
          // Extract projectId from relationships or structuredData
          const projectId = shard.internal_relationships?.find(
            rel => rel.shardTypeId === 'c_project'
          )?.shardId || shard.structuredData?.projectId;

          results.push({
            shardId: shard.id,
            shardType: shard.shardTypeId,
            name: shard.name,
            projectId,
            score: similarity,
            lastModified: shard.updatedAt,
          });
        }
      }

      // If we have exact matches, return them
      if (results.length > 0) {
        // Sort by score descending
        results.sort((a, b) => b.score - a.score);

        // Cache results in both layers
        const cacheKey = options.projectId
          ? this.getProjectCacheKey(options.projectId, normalizedName)
          : this.getCacheKey(tenantId, normalizedName);
        
        // L2: In-memory cache
        this.setInMemoryCache(cacheKey, results);
        
        // L1: Redis cache
        if (this.redis) {
          await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results));
        }

        this.monitoring.trackDependency(
          'cosmosdb.entity.resolve',
          'CosmosDB',
          'query',
          Date.now() - startTime,
          true
        );

        return results.slice(0, limit);
      }

      // If no exact matches, do fuzzy search on all shards
      // This is more expensive, so we limit the search
      const fuzzyResults: Shard[] = [];
      
      for (const shardType of shardTypes) {
        const queryResult = await this.shardRepository.list({
          filter: {
            tenantId,
            shardTypeId: shardType,
          },
          limit: 200, // Get more for fuzzy matching
        });
        fuzzyResults.push(...queryResult.shards);
      }

      // Filter by projectId if specified
      let filteredFuzzyResults = fuzzyResults;
      if (options.projectId) {
        filteredFuzzyResults = fuzzyResults.filter(shard => {
          const hasProjectRelationship = shard.internal_relationships?.some(
            rel => rel.shardId === options.projectId
          );
          const hasProjectInData = shard.structuredData?.projectId === options.projectId;
          return hasProjectRelationship || hasProjectInData;
        });
      }

      // Calculate similarity for all shards
      for (const shard of filteredFuzzyResults) {
        if (!shard.name) {continue;}

        const normalizedShardName = this.normalizeName(shard.name);
        const distance = this.levenshteinDistance(normalizedName, normalizedShardName);

        if (distance <= MAX_LEVENSHTEIN_DISTANCE) {
          const similarity = this.calculateSimilarity(normalizedName, normalizedShardName);
          // Extract projectId from relationships or structuredData
          const projectId = shard.internal_relationships?.find(
            rel => rel.shardTypeId === 'c_project'
          )?.shardId || shard.structuredData?.projectId;

          results.push({
            shardId: shard.id,
            shardType: shard.shardTypeId,
            name: shard.name,
            projectId,
            score: similarity,
            lastModified: shard.updatedAt,
          });
        }
      }

      // Sort by score descending
      results.sort((a, b) => b.score - a.score);

      // Cache results in both layers (reuse cacheKey from line 242)
      // L2: In-memory cache
      this.setInMemoryCache(cacheKey, results);
      
      // L1: Redis cache
      if (this.redis) {
        await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results));
      }

      this.monitoring.trackDependency(
        'cosmosdb.entity.resolve',
        'CosmosDB',
        'query',
        Date.now() - startTime,
        true
      );

      return results.slice(0, limit);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'EntityResolutionService',
        operation: 'resolveEntity',
        tenantId,
        entityName,
        projectId: options.projectId,
      });

      throw error;
    }
  }

  /**
   * Autocomplete entity names
   */
  async autocomplete(
    tenantId: string,
    query: string,
    projectId?: string
  ): Promise<EntitySuggestion[]> {
    const startTime = Date.now();
    const normalizedQuery = this.normalizeName(query);

    if (normalizedQuery.length < 2) {
      return [];
    }

    try {
      // Query each shard type separately and combine
      const allResults: Shard[] = [];
      
      for (const shardType of ENTITY_SHARD_TYPES) {
        const queryResult = await this.shardRepository.list({
          filter: {
            tenantId,
            shardTypeId: shardType,
          },
          limit: 20,
        });
        allResults.push(...queryResult.shards);
      }

      // Filter by projectId if specified
      let filteredResults = allResults;
      if (projectId) {
        filteredResults = allResults.filter(shard => {
          const hasProjectRelationship = shard.internal_relationships?.some(
            rel => rel.shardId === projectId
          );
          const hasProjectInData = shard.structuredData?.projectId === projectId;
          return hasProjectRelationship || hasProjectInData;
        });
      }

      // Filter by search query (name matching)
      const normalizedQuery = this.normalizeName(query);
      const results = filteredResults.filter(shard => {
        if (!shard.name) {return false;}
        const normalizedName = this.normalizeName(shard.name);
        return normalizedName.includes(normalizedQuery);
      });

      const suggestions: EntitySuggestion[] = results
        .filter(shard => shard.name)
        .map(shard => {
          // Extract projectId from relationships or structuredData
          const extractedProjectId = shard.internal_relationships?.find(
            rel => rel.shardTypeId === 'c_project'
          )?.shardId || shard.structuredData?.projectId;

          return {
            shardId: shard.id,
            shardType: shard.shardTypeId,
            name: shard.name!,
            projectId: extractedProjectId,
            preview: this.extractPreview(shard),
          };
        })
        .slice(0, 10);

      this.monitoring.trackDependency(
        'cosmosdb.entity.autocomplete',
        'CosmosDB',
        'query',
        Date.now() - startTime,
        true
      );

      return suggestions;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'EntityResolutionService',
        operation: 'autocomplete',
        tenantId,
        query,
        projectId,
      });

      throw error;
    }
  }

  /**
   * Extract preview text from shard
   */
  private extractPreview(shard: Shard): string {
    if (shard.description) {
      return shard.description.substring(0, 100);
    }
    if (shard.structuredData) {
      // Try to extract a preview from structured data
      const data = shard.structuredData as any;
      if (data.content) {
        return String(data.content).substring(0, 100);
      }
      if (data.summary) {
        return String(data.summary).substring(0, 100);
      }
    }
    return '';
  }

  /**
   * Cache user's entity choice for disambiguation
   */
  async cacheUserChoice(
    tenantId: string,
    queryHash: string,
    selectedShardId: string
  ): Promise<void> {
    if (!this.redis) {return;}

    try {
      const cacheKey = this.getChoiceCacheKey(tenantId, queryHash);
      const value = JSON.stringify({
        selectedShardId,
        timestamp: new Date().toISOString(),
      });
      await this.redis.setex(cacheKey, CACHE_TTL, value);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'EntityResolutionService',
        operation: 'cacheUserChoice',
        tenantId,
        queryHash,
      });
    }
  }

  /**
   * Get cached user choice for disambiguation
   */
  async getCachedUserChoice(
    tenantId: string,
    queryHash: string
  ): Promise<string | null> {
    if (!this.redis) {return null;}

    try {
      const cacheKey = this.getChoiceCacheKey(tenantId, queryHash);
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        return data.selectedShardId;
      }
      return null;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'EntityResolutionService',
        operation: 'getCachedUserChoice',
        tenantId,
        queryHash,
      });
      return null;
    }
  }

  /**
   * Invalidate cache for an entity
   * Invalidates both in-memory (L2) and Redis (L1) caches
   */
  async invalidateCache(tenantId: string, shardId: string, projectId?: string): Promise<void> {
    try {
      // Get the shard to find its name
      const shard = await this.shardRepository.findById(shardId, tenantId);
      if (!shard || !shard.name) {return;}

      const normalizedName = this.normalizeName(shard.name);

      // Invalidate tenant cache (both layers)
      const cacheKey = this.getCacheKey(tenantId, normalizedName);
      this.invalidateInMemoryCache(cacheKey);
      if (this.redis) {
        await this.redis.del(cacheKey);
      }

      // Invalidate project cache if applicable (both layers)
      const extractedProjectId = projectId || shard.internal_relationships?.find(
        rel => rel.shardTypeId === 'c_project'
      )?.shardId || shard.structuredData?.projectId;

      if (extractedProjectId) {
        const projectCacheKey = this.getProjectCacheKey(extractedProjectId, normalizedName);
        this.invalidateInMemoryCache(projectCacheKey);
        if (this.redis) {
          await this.redis.del(projectCacheKey);
        }
      }

      this.monitoring.trackEvent('entity-resolution.cache.invalidated', {
        tenantId,
        shardId,
        projectId: extractedProjectId,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        component: 'EntityResolutionService',
        operation: 'invalidateCache',
        tenantId,
        shardId,
      });
    }
  }

  /**
   * Get cache statistics (for monitoring/debugging)
   */
  getCacheStats(): {
    inMemorySize: number;
    inMemoryMaxSize: number;
    hasRedis: boolean;
  } {
    return {
      inMemorySize: this.inMemoryCache.size,
      inMemoryMaxSize: IN_MEMORY_CACHE_MAX_SIZE,
      hasRedis: !!this.redis,
    };
  }
}


/**
 * Entity Resolution Service
 * Resolves entity names (documents, opportunities, notes) to shardIds for context-aware queries
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
/**
 * Resolved entity result
 */
export interface ResolvedEntity {
    shardId: string;
    shardType: string;
    name: string;
    projectId?: string;
    score: number;
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
export declare class EntityResolutionService {
    private shardRepository;
    private monitoring;
    private redis?;
    private inMemoryCache;
    private lastCacheCleanup;
    private readonly CACHE_CLEANUP_INTERVAL;
    constructor(shardRepository: ShardRepository, monitoring: IMonitoringProvider, redis?: Redis | undefined);
    /**
     * Normalize entity name for caching and comparison
     */
    private normalizeName;
    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance;
    /**
     * Calculate similarity score (0-1) based on Levenshtein distance
     */
    private calculateSimilarity;
    /**
     * Get cache key for entity resolution
     */
    private getCacheKey;
    /**
     * Get cache key for project-scoped entity resolution
     */
    private getProjectCacheKey;
    /**
     * Get cache key for user's entity choice
     */
    private getChoiceCacheKey;
    /**
     * Clean up expired entries from in-memory cache
     */
    private cleanupInMemoryCache;
    /**
     * Get from in-memory cache (L2)
     */
    private getFromInMemoryCache;
    /**
     * Set in-memory cache (L2)
     */
    private setInMemoryCache;
    /**
     * Invalidate in-memory cache for a specific key
     */
    private invalidateInMemoryCache;
    /**
     * Resolve entity name to shardId
     * Supports fuzzy matching and project-scoped resolution
     */
    resolveEntity(tenantId: string, entityName: string, options?: {
        projectId?: string;
        shardTypes?: string[];
        limit?: number;
    }): Promise<ResolvedEntity[]>;
    /**
     * Autocomplete entity names
     */
    autocomplete(tenantId: string, query: string, projectId?: string): Promise<EntitySuggestion[]>;
    /**
     * Extract preview text from shard
     */
    private extractPreview;
    /**
     * Cache user's entity choice for disambiguation
     */
    cacheUserChoice(tenantId: string, queryHash: string, selectedShardId: string): Promise<void>;
    /**
     * Get cached user choice for disambiguation
     */
    getCachedUserChoice(tenantId: string, queryHash: string): Promise<string | null>;
    /**
     * Invalidate cache for an entity
     * Invalidates both in-memory (L2) and Redis (L1) caches
     */
    invalidateCache(tenantId: string, shardId: string, projectId?: string): Promise<void>;
    /**
     * Get cache statistics (for monitoring/debugging)
     */
    getCacheStats(): {
        inMemorySize: number;
        inMemoryMaxSize: number;
        hasRedis: boolean;
    };
}
//# sourceMappingURL=entity-resolution.service.d.ts.map
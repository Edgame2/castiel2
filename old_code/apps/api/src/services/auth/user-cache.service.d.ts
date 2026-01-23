import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { User } from '../../types/user.types.js';
/**
 * User cache service for Redis-based user profile caching
 * Implements cache-aside pattern with 1-hour TTL
 */
export declare class UserCacheService {
    private redis;
    private monitoring?;
    private readonly CACHE_TTL;
    private readonly CACHE_PREFIX;
    constructor(redis: Redis, monitoring?: IMonitoringProvider);
    /**
     * Generate cache key for user profile
     * Pattern: tenant:{tenantId}:user:{userId}:profile
     */
    private getUserCacheKey;
    /**
     * Generate cache key pattern for all users in tenant
     */
    private getTenantUserPattern;
    /**
     * Get cached user profile
     * @param userId User ID
     * @param tenantId Tenant ID
     * @returns User object or null if not cached
     */
    getCachedUser(userId: string, tenantId: string): Promise<User | null>;
    /**
     * Cache user profile
     * @param user User object to cache
     */
    setCachedUser(user: User): Promise<void>;
    /**
     * Invalidate cached user profile
     * @param userId User ID
     * @param tenantId Tenant ID
     */
    invalidateUserCache(userId: string, tenantId: string): Promise<void>;
    /**
     * Invalidate all cached users for a tenant
     * @param tenantId Tenant ID
     */
    invalidateTenantUsers(tenantId: string): Promise<void>;
    /**
     * Publish cache invalidation event via Redis pub/sub
     * @param userId User ID
     * @param tenantId Tenant ID
     */
    publishCacheInvalidation(userId: string, tenantId: string): Promise<void>;
    /**
     * Subscribe to cache invalidation events
     * @param callback Function to call when invalidation event received
     */
    subscribeToCacheInvalidation(callback: (userId: string, tenantId: string) => void): void;
    /**
     * Get cache statistics
     * @param tenantId Optional tenant ID to get stats for specific tenant
     */
    getCacheStats(tenantId?: string): Promise<{
        totalKeys: number;
        memoryUsage?: number;
    }>;
}
//# sourceMappingURL=user-cache.service.d.ts.map
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { User } from '../../types/user.types.js';

/**
 * User cache service for Redis-based user profile caching
 * Implements cache-aside pattern with 1-hour TTL
 */
export class UserCacheService {
  private redis: Redis;
  private monitoring?: IMonitoringProvider;
  private readonly CACHE_TTL = 60 * 60; // 1 hour in seconds
  private readonly CACHE_PREFIX = 'tenant';

  constructor(redis: Redis, monitoring?: IMonitoringProvider) {
    this.redis = redis;
    this.monitoring = monitoring;
  }

  /**
   * Generate cache key for user profile
   * Pattern: tenant:{tenantId}:user:{userId}:profile
   */
  private getUserCacheKey(userId: string, tenantId: string): string {
    return `${this.CACHE_PREFIX}:${tenantId}:user:${userId}:profile`;
  }

  /**
   * Generate cache key pattern for all users in tenant
   */
  private getTenantUserPattern(tenantId: string): string {
    return `${this.CACHE_PREFIX}:${tenantId}:user:*:profile`;
  }

  /**
   * Get cached user profile
   * @param userId User ID
   * @param tenantId Tenant ID
   * @returns User object or null if not cached
   */
  async getCachedUser(userId: string, tenantId: string): Promise<User | null> {
    try {
      const key = this.getUserCacheKey(userId, tenantId);
      const cached = await this.redis.get(key);
      
      if (!cached) {
        return null;
      }

      const user = JSON.parse(cached) as User;
      
      // Restore Date objects
      user.createdAt = new Date(user.createdAt);
      user.updatedAt = new Date(user.updatedAt);
      if (user.lastLoginAt) {
        user.lastLoginAt = new Date(user.lastLoginAt);
      }
      if (user.verificationTokenExpiry) {
        user.verificationTokenExpiry = new Date(user.verificationTokenExpiry);
      }
      if (user.passwordResetTokenExpiry) {
        user.passwordResetTokenExpiry = new Date(user.passwordResetTokenExpiry);
      }
      if (user.providers) {
        user.providers = user.providers.map(p => ({
          ...p,
          connectedAt: new Date(p.connectedAt),
        }));
      }
      if (user.oauthProviders) {
        user.oauthProviders = user.oauthProviders.map(p => ({
          ...p,
          connectedAt: new Date(p.connectedAt),
        }));
      }

      return user;
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'user-cache.get-cached-user' });
      return null; // Graceful degradation
    }
  }

  /**
   * Cache user profile
   * @param user User object to cache
   */
  async setCachedUser(user: User): Promise<void> {
    try {
      const key = this.getUserCacheKey(user.id, user.tenantId);
      await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(user));
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'user-cache.cache-user' });
      // Don't throw - caching failure shouldn't break the application
    }
  }

  /**
   * Invalidate cached user profile
   * @param userId User ID
   * @param tenantId Tenant ID
   */
  async invalidateUserCache(userId: string, tenantId: string): Promise<void> {
    try {
      const key = this.getUserCacheKey(userId, tenantId);
      await this.redis.del(key);
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'user-cache.invalidate-user-cache' });
      // Don't throw - cache invalidation failure shouldn't break the application
    }
  }

  /**
   * Invalidate all user caches for a tenant
   * @param tenantId Tenant ID
   */
  async invalidateTenantUserCache(tenantId: string): Promise<void> {
    try {
      const pattern = this.getTenantUserPattern(tenantId);
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'user-cache.invalidate-tenant-user-cache' });
      // Don't throw - cache invalidation failure shouldn't break the application
    }
  }

  /**
   * Publish cache invalidation event (for distributed cache invalidation)
   * @param userId User ID
   * @param tenantId Tenant ID
   */
  async publishCacheInvalidation(userId: string, tenantId: string): Promise<void> {
    try {
      const channel = `cache-invalidation:user:${tenantId}:${userId}`;
      await this.redis.publish(channel, JSON.stringify({ userId, tenantId, timestamp: Date.now() }));
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), { operation: 'user-cache.publish-cache-invalidation' });
      // Don't throw - pub/sub failure shouldn't break the application
    }
  }
}

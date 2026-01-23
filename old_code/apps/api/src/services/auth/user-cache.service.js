/**
 * User cache service for Redis-based user profile caching
 * Implements cache-aside pattern with 1-hour TTL
 */
export class UserCacheService {
    redis;
    monitoring;
    CACHE_TTL = 60 * 60; // 1 hour in seconds
    CACHE_PREFIX = 'tenant';
    constructor(redis, monitoring) {
        this.redis = redis;
        this.monitoring = monitoring;
    }
    /**
     * Generate cache key for user profile
     * Pattern: tenant:{tenantId}:user:{userId}:profile
     */
    getUserCacheKey(userId, tenantId) {
        return `${this.CACHE_PREFIX}:${tenantId}:user:${userId}:profile`;
    }
    /**
     * Generate cache key pattern for all users in tenant
     */
    getTenantUserPattern(tenantId) {
        return `${this.CACHE_PREFIX}:${tenantId}:user:*:profile`;
    }
    /**
     * Get cached user profile
     * @param userId User ID
     * @param tenantId Tenant ID
     * @returns User object or null if not cached
     */
    async getCachedUser(userId, tenantId) {
        try {
            const key = this.getUserCacheKey(userId, tenantId);
            const cached = await this.redis.get(key);
            if (!cached) {
                return null;
            }
            const user = JSON.parse(cached);
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
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'user-cache.get-cached-user' });
            return null; // Graceful degradation
        }
    }
    /**
     * Cache user profile
     * @param user User object to cache
     */
    async setCachedUser(user) {
        try {
            const key = this.getUserCacheKey(user.id, user.tenantId);
            await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(user));
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'user-cache.cache-user' });
            // Don't throw - caching failure shouldn't break the application
        }
    }
    /**
     * Invalidate cached user profile
     * @param userId User ID
     * @param tenantId Tenant ID
     */
    async invalidateUserCache(userId, tenantId) {
        try {
            const key = this.getUserCacheKey(userId, tenantId);
            await this.redis.del(key);
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'user-cache.invalidate-user' });
            // Don't throw - cache invalidation failure shouldn't break the application
        }
    }
    /**
     * Invalidate all cached users for a tenant
     * @param tenantId Tenant ID
     */
    async invalidateTenantUsers(tenantId) {
        try {
            const pattern = this.getTenantUserPattern(tenantId);
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'user-cache.invalidate-tenant' });
        }
    }
    /**
     * Publish cache invalidation event via Redis pub/sub
     * @param userId User ID
     * @param tenantId Tenant ID
     */
    async publishCacheInvalidation(userId, tenantId) {
        try {
            const message = JSON.stringify({
                userId,
                tenantId,
                timestamp: new Date().toISOString(),
            });
            await this.redis.publish('user:cache:invalidate', message);
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'user-cache.publish-invalidation' });
        }
    }
    /**
     * Subscribe to cache invalidation events
     * @param callback Function to call when invalidation event received
     */
    subscribeToCacheInvalidation(callback) {
        try {
            // Create a separate Redis connection for pub/sub with enableOfflineQueue: true
            const subscriber = this.redis.duplicate({
                enableOfflineQueue: true, // Allow queueing commands while connecting
                lazyConnect: false, // Connect immediately
            });
            // Handle connection errors
            subscriber.on('error', (err) => {
                this.monitoring?.trackException(err, { operation: 'user-cache.redis-subscriber-error' });
            });
            subscriber.on('ready', () => {
                this.monitoring?.trackEvent('user-cache.redis-subscriber-ready');
            });
            subscriber.on('message', (_channel, message) => {
                try {
                    const { userId, tenantId } = JSON.parse(message);
                    callback(userId, tenantId);
                }
                catch (error) {
                    this.monitoring?.trackException(error, { operation: 'user-cache.process-invalidation-message' });
                }
            });
            subscriber.subscribe('user:cache:invalidate', (err) => {
                if (err) {
                    this.monitoring?.trackException(err, { operation: 'user-cache.subscribe-invalidation' });
                }
                else {
                    this.monitoring?.trackEvent('user-cache.subscribed-invalidation');
                }
            });
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'user-cache.setup-subscription' });
            // Don't throw - cache invalidation is not critical for operation
        }
    }
    /**
     * Get cache statistics
     * @param tenantId Optional tenant ID to get stats for specific tenant
     */
    async getCacheStats(tenantId) {
        try {
            const pattern = tenantId
                ? this.getTenantUserPattern(tenantId)
                : `${this.CACHE_PREFIX}:*:user:*:profile`;
            const keys = await this.redis.keys(pattern);
            return {
                totalKeys: keys.length,
            };
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'user-cache.get-stats' });
            return { totalKeys: 0 };
        }
    }
}
//# sourceMappingURL=user-cache.service.js.map
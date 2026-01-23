import { createHash } from 'crypto';
/**
 * JWT Validation Cache Service
 * Caches JWT validation results for 5 minutes to reduce validation overhead
 */
export class JWTValidationCacheService {
    redis;
    cacheTTL;
    constructor(redis, options) {
        this.redis = redis;
        this.cacheTTL = options?.cacheTTL || 5 * 60; // 5 minutes
    }
    /**
     * Cache JWT validation result
     */
    async cacheValidation(token, result) {
        const tokenHash = this.hashToken(token);
        const key = this.getValidationKey(tokenHash);
        const cacheData = {
            ...result,
            cachedAt: Date.now(),
        };
        await this.redis.setex(key, this.cacheTTL, JSON.stringify(cacheData));
    }
    /**
     * Get cached validation result
     */
    async getCachedValidation(token) {
        const tokenHash = this.hashToken(token);
        const key = this.getValidationKey(tokenHash);
        const data = await this.redis.get(key);
        if (!data) {
            return null;
        }
        try {
            return JSON.parse(data);
        }
        catch {
            // Invalid cache data, remove it
            await this.redis.del(key);
            return null;
        }
    }
    /**
     * Invalidate cached validation for a token
     */
    async invalidateToken(token) {
        const tokenHash = this.hashToken(token);
        const key = this.getValidationKey(tokenHash);
        await this.redis.del(key);
    }
    /**
     * Invalidate all cached validations for a user
     * Used when user permissions or roles change
     */
    async invalidateUser(userId) {
        const pattern = 'jwt:valid:*';
        let cursor = '0';
        let deletedCount = 0;
        do {
            const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            for (const key of keys) {
                const data = await this.redis.get(key);
                if (!data) {
                    continue;
                }
                try {
                    const cached = JSON.parse(data);
                    if (cached.userId === userId) {
                        await this.redis.del(key);
                        deletedCount++;
                    }
                }
                catch {
                    // Invalid cache data, delete it
                    await this.redis.del(key);
                    deletedCount++;
                }
            }
        } while (cursor !== '0');
        return deletedCount;
    }
    /**
     * Invalidate all cached validations for a tenant
     * Used when tenant-wide permission changes occur
     */
    async invalidateTenant(tenantId) {
        const pattern = 'jwt:valid:*';
        let cursor = '0';
        let deletedCount = 0;
        do {
            const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            for (const key of keys) {
                const data = await this.redis.get(key);
                if (!data) {
                    continue;
                }
                try {
                    const cached = JSON.parse(data);
                    if (cached.tenantId === tenantId) {
                        await this.redis.del(key);
                        deletedCount++;
                    }
                }
                catch {
                    // Invalid cache data, delete it
                    await this.redis.del(key);
                    deletedCount++;
                }
            }
        } while (cursor !== '0');
        return deletedCount;
    }
    /**
     * Clear all JWT validation cache
     */
    async clearAll() {
        const pattern = 'jwt:valid:*';
        let cursor = '0';
        let deletedCount = 0;
        do {
            const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 1000);
            cursor = nextCursor;
            if (keys.length > 0) {
                await this.redis.del(...keys);
                deletedCount += keys.length;
            }
        } while (cursor !== '0');
        return deletedCount;
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        const pattern = 'jwt:valid:*';
        let cursor = '0';
        let count = 0;
        let totalAge = 0;
        const now = Date.now();
        do {
            const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            for (const key of keys) {
                const data = await this.redis.get(key);
                if (!data) {
                    continue;
                }
                try {
                    const cached = JSON.parse(data);
                    const age = now - cached.cachedAt;
                    totalAge += age;
                    count++;
                }
                catch {
                    // Skip invalid data
                }
            }
        } while (cursor !== '0');
        return {
            totalCached: count,
            averageAge: count > 0 ? totalAge / count : 0,
        };
    }
    /**
     * Hash token to create consistent identifier
     */
    hashToken(token) {
        return createHash('sha256').update(token).digest('hex');
    }
    /**
     * Get Redis key for JWT validation cache
     */
    getValidationKey(tokenHash) {
        return `jwt:valid:${tokenHash}`;
    }
}
//# sourceMappingURL=jwt-validation-cache.service.js.map
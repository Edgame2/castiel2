import type { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { AuthUser, TokenValidationResult } from '../types/auth.types.js';
/**
 * Token Validation Cache Service
 * Caches JWT validation results in Redis with 5-minute TTL
 */
export declare class TokenValidationCacheService {
    private redis;
    private monitoring?;
    private readonly CACHE_TTL;
    private readonly KEY_PREFIX;
    private hits;
    private misses;
    private invalidations;
    constructor(redis: Redis, monitoring?: IMonitoringProvider);
    /**
     * Generate cache key from token
     * Uses SHA-256 hash of token for security
     * @param token JWT token
     * @returns Cache key
     */
    private getCacheKey;
    /**
     * Get cached validation result
     * @param token JWT token
     * @returns Cached validation result or null
     */
    getCachedValidation(token: string): Promise<TokenValidationResult | null>;
    /**
     * Cache validation result
     * @param token JWT token
     * @param result Validation result
     */
    setCachedValidation(token: string, result: {
        valid: boolean;
        user?: AuthUser;
    }): Promise<void>;
    /**
     * Invalidate cached token
     * @param token JWT token
     */
    invalidateToken(token: string): Promise<void>;
    /**
     * Invalidate all cached tokens for a user
     * @param userId User ID
     */
    invalidateUserTokens(userId: string): Promise<void>;
    /**
     * Get cache statistics
     * @returns Cache statistics
     */
    getStats(): Promise<{
        hits: number;
        misses: number;
        invalidations: number;
        keyCount: number;
    }>;
    /**
     * Check if cache is healthy
     * @returns True if Redis connection is healthy
     */
    isHealthy(): Promise<boolean>;
    /**
     * Clear all cached validations
     * Use with caution - mainly for testing
     */
    clearAll(): Promise<void>;
}
//# sourceMappingURL=token-validation-cache.service.d.ts.map
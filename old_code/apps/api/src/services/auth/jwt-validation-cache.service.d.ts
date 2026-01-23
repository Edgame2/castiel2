import type { Redis } from 'ioredis';
/**
 * JWT Validation Result
 */
export interface JWTValidationResult {
    valid: boolean;
    userId?: string;
    tenantId?: string;
    email?: string;
    roles?: string[];
    cachedAt: number;
}
/**
 * JWT Validation Cache Service
 * Caches JWT validation results for 5 minutes to reduce validation overhead
 */
export declare class JWTValidationCacheService {
    private redis;
    private cacheTTL;
    constructor(redis: Redis, options?: {
        cacheTTL?: number;
    });
    /**
     * Cache JWT validation result
     */
    cacheValidation(token: string, result: Omit<JWTValidationResult, 'cachedAt'>): Promise<void>;
    /**
     * Get cached validation result
     */
    getCachedValidation(token: string): Promise<JWTValidationResult | null>;
    /**
     * Invalidate cached validation for a token
     */
    invalidateToken(token: string): Promise<void>;
    /**
     * Invalidate all cached validations for a user
     * Used when user permissions or roles change
     */
    invalidateUser(userId: string): Promise<number>;
    /**
     * Invalidate all cached validations for a tenant
     * Used when tenant-wide permission changes occur
     */
    invalidateTenant(tenantId: string): Promise<number>;
    /**
     * Clear all JWT validation cache
     */
    clearAll(): Promise<number>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<{
        totalCached: number;
        averageAge: number;
    }>;
    /**
     * Hash token to create consistent identifier
     */
    private hashToken;
    /**
     * Get Redis key for JWT validation cache
     */
    private getValidationKey;
}
//# sourceMappingURL=jwt-validation-cache.service.d.ts.map
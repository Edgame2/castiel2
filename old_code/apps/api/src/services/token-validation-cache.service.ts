import { createHash } from 'crypto';
import type { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { AuthUser, TokenValidationResult } from '../types/auth.types.js';

/**
 * Token Validation Cache Service
 * Caches JWT validation results in Redis with 5-minute TTL
 */
export class TokenValidationCacheService {
  private redis: Redis;
  private monitoring?: IMonitoringProvider;
  private readonly CACHE_TTL = 5 * 60; // 5 minutes in seconds
  private readonly KEY_PREFIX = 'jwt:valid';
  private hits = 0;
  private misses = 0;
  private invalidations = 0;

  constructor(redis: Redis, monitoring?: IMonitoringProvider) {
    this.redis = redis;
    this.monitoring = monitoring;
  }

  /**
   * Generate cache key from token
   * Uses SHA-256 hash of token for security
   * @param token JWT token
   * @returns Cache key
   */
  private getCacheKey(token: string): string {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    return `${this.KEY_PREFIX}:${tokenHash}`;
  }

  /**
   * Get cached validation result
   * @param token JWT token
   * @returns Cached validation result or null
   */
  async getCachedValidation(token: string): Promise<TokenValidationResult | null> {
    try {
      const key = this.getCacheKey(token);
      const cached = await this.redis.get(key);
      
      if (!cached) {
        this.misses++;
        return null;
      }

      this.hits++;
      const data = JSON.parse(cached) as { valid: boolean; user?: AuthUser };
      
      return {
        valid: data.valid,
        user: data.user,
        cached: true,
      };
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'token-validation-cache.get-cached' });
      return null; // Graceful degradation
    }
  }

  /**
   * Cache validation result
   * @param token JWT token
   * @param result Validation result
   */
  async setCachedValidation(token: string, result: { valid: boolean; user?: AuthUser }): Promise<void> {
    try {
      const key = this.getCacheKey(token);
      await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(result));
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'token-validation-cache.cache-validation' });
      // Don't throw - caching failure shouldn't break authentication
    }
  }

  /**
   * Invalidate cached token
   * @param token JWT token
   */
  async invalidateToken(token: string): Promise<void> {
    try {
      const key = this.getCacheKey(token);
      const deleted = await this.redis.del(key);
      if (deleted > 0) {
        this.invalidations++;
      }
    } catch (error) {
      this.monitoring?.trackException(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'token-validation-cache.invalidate' }
      );
    }
  }

  /**
   * Invalidate all cached tokens for a user
   * @param userId User ID
   */
  async invalidateUserTokens(userId: string): Promise<void> {
    try {
      // This would require storing a reverse index of userId -> token hashes
      // For now, we'll just log it as tokens will expire naturally in 5 minutes
      this.monitoring?.trackEvent('token-validation-cache.invalidate-user', { userId });
      // In production, you might want to maintain a set: user:{userId}:token_hashes
    } catch (error) {
      this.monitoring?.trackException(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'token-validation-cache.invalidate-user', userId }
      );
    }
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    invalidations: number;
    keyCount: number;
  }> {
    try {
      const pattern = `${this.KEY_PREFIX}:*`;
      const keys = await this.redis.keys(pattern);
      
      return {
        hits: this.hits,
        misses: this.misses,
        invalidations: this.invalidations,
        keyCount: keys.length,
      };
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        component: 'TokenValidationCacheService',
        operation: 'getStats',
      });
      return {
        hits: this.hits,
        misses: this.misses,
        invalidations: this.invalidations,
        keyCount: 0,
      };
    }
  }

  /**
   * Check if cache is healthy
   * @returns True if Redis connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch (error) {
      this.monitoring?.trackException(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'token-validation-cache.health-check' }
      );
      return false;
    }
  }

  /**
   * Clear all cached validations
   * Use with caution - mainly for testing
   */
  async clearAll(): Promise<void> {
    try {
      const pattern = `${this.KEY_PREFIX}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      this.monitoring?.trackEvent('token-validation-cache.clear-all', { 
        keysCleared: keys.length 
      });
    } catch (error) {
      this.monitoring?.trackException(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'token-validation-cache.clear-all' }
      );
    }
  }
}

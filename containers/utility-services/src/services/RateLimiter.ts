/**
 * Rate Limiter
 * 
 * Enforces rate limits per user and organization
 * Will be fully implemented in Phase 4 with Redis
 */

import { getConfig } from '../config/index.js';

export class RateLimiter {
  private config = getConfig();
  private memoryCache: Map<string, { count: number; resetAt: number }> = new Map();

  /**
   * Check if request is within rate limit
   */
  async checkLimit(userId: string, organizationId: string): Promise<boolean> {
    const userLimit = this.config.notification?.defaults?.rate_limit_per_user || 100;
    const orgLimit = this.config.notification?.defaults?.rate_limit_per_org || 1000;

    // Check user limit
    const userKey = `user:${userId}`;
    const userCount = this.getCount(userKey);
    if (userCount >= userLimit) {
      return false;
    }

    // Check org limit
    const orgKey = `org:${organizationId}`;
    const orgCount = this.getCount(orgKey);
    if (orgCount >= orgLimit) {
      return false;
    }

    // Increment counters
    this.incrementCount(userKey);
    this.incrementCount(orgKey);

    return true;
  }

  /**
   * Get current count (in-memory implementation)
   * TODO: Replace with Redis in Phase 4
   */
  private getCount(key: string): number {
    const cached = this.memoryCache.get(key);
    if (!cached || cached.resetAt < Date.now()) {
      return 0;
    }
    return cached.count;
  }

  /**
   * Increment count (in-memory implementation)
   * TODO: Replace with Redis in Phase 4
   */
  private incrementCount(key: string): void {
    const cached = this.memoryCache.get(key);
    const resetAt = Date.now() + 60000; // 1 minute window
    
    if (!cached || cached.resetAt < Date.now()) {
      this.memoryCache.set(key, { count: 1, resetAt });
    } else {
      this.memoryCache.set(key, { count: cached.count + 1, resetAt: cached.resetAt });
    }
  }
}


import type { Redis } from 'ioredis';
import { createHash } from 'crypto';

/**
 * Token Blacklist Service
 * Manages blacklisted/revoked JWT tokens with TTL
 */
export class TokenBlacklistService {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Blacklist a token by JTI (JWT ID)
   * TTL should match the token's expiration time
   */
  async blacklistToken(jti: string, expiresInSeconds: number): Promise<void> {
    const key = this.getBlacklistKey(jti);
    await this.redis.setex(key, expiresInSeconds, '1');
  }

  /**
   * Blacklist a token by the full token string
   * Automatically calculates TTL from token expiration
   */
  async blacklistTokenString(
    token: string,
    expiresAt: number
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    const now = Date.now();
    const ttlMs = expiresAt - now;

    if (ttlMs <= 0) {
      // Token already expired, no need to blacklist
      return;
    }

    const ttlSeconds = Math.ceil(ttlMs / 1000);
    const key = this.getBlacklistKey(tokenHash);
    await this.redis.setex(key, ttlSeconds, '1');
  }

  /**
   * Check if a token is blacklisted by JTI
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const key = this.getBlacklistKey(jti);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Check if a token string is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    return this.isBlacklisted(tokenHash);
  }

  /**
   * Remove a token from blacklist (if needed)
   */
  async removeFromBlacklist(jti: string): Promise<void> {
    const key = this.getBlacklistKey(jti);
    await this.redis.del(key);
  }

  /**
   * Blacklist all tokens for a user
   * Used when forcing user logout across all devices
   */
  async blacklistUserTokens(
    tokenJtis: string[],
    ttlSeconds: number
  ): Promise<number> {
    if (tokenJtis.length === 0) {
      return 0;
    }

    const pipeline = this.redis.pipeline();

    for (const jti of tokenJtis) {
      const key = this.getBlacklistKey(jti);
      pipeline.setex(key, ttlSeconds, '1');
    }

    await pipeline.exec();

    return tokenJtis.length;
  }

  /**
   * Get the count of blacklisted tokens
   */
  async getBlacklistCount(): Promise<number> {
    const pattern = 'token:blacklist:*';
    let cursor = '0';
    let count = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        1000
      );

      cursor = nextCursor;
      count += keys.length;
    } while (cursor !== '0');

    return count;
  }

  /**
   * Clean up expired blacklist entries
   * This is handled automatically by Redis TTL, but this method
   * can be used for manual cleanup if needed
   */
  async cleanupExpiredEntries(): Promise<number> {
    // Redis automatically removes expired keys, so this is a no-op
    // But we can scan for any keys without TTL and remove them
    const pattern = 'token:blacklist:*';
    let cursor = '0';
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );

      cursor = nextCursor;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        
        // If TTL is -1, the key exists but has no expiration
        if (ttl === -1) {
          await this.redis.del(key);
          deletedCount++;
        }
      }
    } while (cursor !== '0');

    return deletedCount;
  }

  /**
   * Hash token to create consistent identifier
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get Redis key for blacklisted token
   */
  private getBlacklistKey(jti: string): string {
    return `token:blacklist:${jti}`;
  }
}

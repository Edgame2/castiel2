import type { Redis } from 'ioredis';
import {
  SessionService,
  TokenService,
  TokenBlacklistService,
  JWTValidationCacheService,
  CleanupJobService,
} from '../services/auth/index.js';

/**
 * Cache Manager
 * Centralizes all Redis-based caching and session management
 */
export class CacheManager {
  public readonly sessions: SessionService;
  public readonly tokens: TokenService;
  public readonly blacklist: TokenBlacklistService;
  public readonly jwtCache: JWTValidationCacheService;
  public readonly cleanupJob: CleanupJobService;

  constructor(redis: Redis, options?: {
    sessionTTL?: number;
    refreshTokenTTL?: number;
    jwtCacheTTL?: number;
    cleanupInterval?: number;
  }) {
    // Initialize services
    this.sessions = new SessionService(redis, {
      sessionTTL: options?.sessionTTL,
    });

    this.tokens = new TokenService(redis, {
      refreshTokenTTL: options?.refreshTokenTTL,
    });

    this.blacklist = new TokenBlacklistService(redis);

    this.jwtCache = new JWTValidationCacheService(redis, {
      cacheTTL: options?.jwtCacheTTL,
    });

    this.cleanupJob = new CleanupJobService(
      this.sessions,
      this.tokens,
      this.blacklist
    );

    // Start cleanup job if interval is provided
    if (options?.cleanupInterval) {
      this.cleanupJob.start(options.cleanupInterval);
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanup(intervalMs?: number): void {
    this.cleanupJob.start(intervalMs);
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup(): void {
    this.cleanupJob.stop();
  }

  /**
   * Get overall cache statistics
   */
  async getStats(): Promise<{
    sessions: {
      // Per-user session count would need user IDs
    };
    jwtCache: {
      totalCached: number;
      averageAge: number;
    };
    blacklist: {
      totalBlacklisted: number;
    };
    cleanup: {
      isRunning: boolean;
      hasInterval: boolean;
    };
  }> {
    const [jwtCacheStats, blacklistCount] = await Promise.all([
      this.jwtCache.getStats(),
      this.blacklist.getBlacklistCount(),
    ]);

    return {
      sessions: {},
      jwtCache: jwtCacheStats,
      blacklist: {
        totalBlacklisted: blacklistCount,
      },
      cleanup: this.cleanupJob.getStatus(),
    };
  }

  /**
   * Full logout - revoke all user sessions and tokens
   */
  async logoutUser(tenantId: string, userId: string): Promise<void> {
    await Promise.all([
      this.sessions.deleteAllUserSessions(tenantId, userId),
      this.tokens.revokeAllUserTokens(tenantId, userId),
      this.jwtCache.invalidateUser(userId),
    ]);
  }

  /**
   * Logout specific session
   */
  async logoutSession(
    tenantId: string,
    userId: string,
    sessionId: string
  ): Promise<void> {
    await this.sessions.deleteSession(tenantId, userId, sessionId);
  }

  /**
   * Invalidate all cache for a tenant
   * Used when tenant-wide changes occur
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    await this.jwtCache.invalidateTenant(tenantId);
  }
}

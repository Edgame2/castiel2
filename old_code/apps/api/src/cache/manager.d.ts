import type { Redis } from 'ioredis';
import { SessionService, TokenService, TokenBlacklistService, JWTValidationCacheService, CleanupJobService } from '../services/auth/index.js';
/**
 * Cache Manager
 * Centralizes all Redis-based caching and session management
 */
export declare class CacheManager {
    readonly sessions: SessionService;
    readonly tokens: TokenService;
    readonly blacklist: TokenBlacklistService;
    readonly jwtCache: JWTValidationCacheService;
    readonly cleanupJob: CleanupJobService;
    constructor(redis: Redis, options?: {
        sessionTTL?: number;
        refreshTokenTTL?: number;
        jwtCacheTTL?: number;
        cleanupInterval?: number;
    });
    /**
     * Start periodic cleanup
     */
    startCleanup(intervalMs?: number): void;
    /**
     * Stop periodic cleanup
     */
    stopCleanup(): void;
    /**
     * Get overall cache statistics
     */
    getStats(): Promise<{
        sessions: {};
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
    }>;
    /**
     * Full logout - revoke all user sessions and tokens
     */
    logoutUser(tenantId: string, userId: string): Promise<void>;
    /**
     * Logout specific session
     */
    logoutSession(tenantId: string, userId: string, sessionId: string): Promise<void>;
    /**
     * Invalidate all cache for a tenant
     * Used when tenant-wide changes occur
     */
    invalidateTenant(tenantId: string): Promise<void>;
}
//# sourceMappingURL=manager.d.ts.map
import type { Redis } from 'ioredis';
/**
 * Token Blacklist Service
 * Manages blacklisted/revoked JWT tokens with TTL
 */
export declare class TokenBlacklistService {
    private redis;
    constructor(redis: Redis);
    /**
     * Blacklist a token by JTI (JWT ID)
     * TTL should match the token's expiration time
     */
    blacklistToken(jti: string, expiresInSeconds: number): Promise<void>;
    /**
     * Blacklist a token by the full token string
     * Automatically calculates TTL from token expiration
     */
    blacklistTokenString(token: string, expiresAt: number): Promise<void>;
    /**
     * Check if a token is blacklisted by JTI
     */
    isBlacklisted(jti: string): Promise<boolean>;
    /**
     * Check if a token string is blacklisted
     */
    isTokenBlacklisted(token: string): Promise<boolean>;
    /**
     * Remove a token from blacklist (if needed)
     */
    removeFromBlacklist(jti: string): Promise<void>;
    /**
     * Blacklist all tokens for a user
     * Used when forcing user logout across all devices
     */
    blacklistUserTokens(tokenJtis: string[], ttlSeconds: number): Promise<number>;
    /**
     * Get the count of blacklisted tokens
     */
    getBlacklistCount(): Promise<number>;
    /**
     * Clean up expired blacklist entries
     * This is handled automatically by Redis TTL, but this method
     * can be used for manual cleanup if needed
     */
    cleanupExpiredEntries(): Promise<number>;
    /**
     * Hash token to create consistent identifier
     */
    private hashToken;
    /**
     * Get Redis key for blacklisted token
     */
    private getBlacklistKey;
}
//# sourceMappingURL=token-blacklist.service.d.ts.map
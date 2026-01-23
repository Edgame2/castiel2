import type { Redis } from 'ioredis';
import type { RefreshTokenData } from '../../types/index.js';
/**
 * Token Service
 * Manages refresh tokens with family tracking for reuse detection
 */
export declare class TokenService {
    private redis;
    private refreshTokenTTL;
    constructor(redis: Redis, options?: {
        refreshTokenTTL?: number;
    });
    /**
     * Create a new refresh token
     */
    createRefreshToken(userId: string, tenantId: string, familyId?: string, options?: {
        ttlSeconds?: number;
    }): Promise<{
        token: string;
        tokenData: RefreshTokenData;
    }>;
    /**
     * Rotate refresh token (use once and generate new one)
     */
    rotateRefreshToken(token: string): Promise<{
        token: string;
        tokenData: RefreshTokenData;
    } | null>;
    /**
     * Get token data
     */
    getTokenData(tokenId: string): Promise<RefreshTokenData | null>;
    /**
     * Validate token
     */
    validateToken(token: string): Promise<RefreshTokenData | null>;
    /**
     * Revoke a single token
     */
    revokeToken(tokenId: string): Promise<void>;
    /**
     * Revoke all tokens in a family (for reuse detection)
     */
    revokeFamily(familyId: string): Promise<number>;
    /**
     * Revoke all tokens for a user
     */
    revokeAllUserTokens(tenantId: string, userId: string): Promise<number>;
    /**
     * Get all token IDs for a user
     */
    getUserTokens(tenantId: string, userId: string): Promise<RefreshTokenData[]>;
    /**
     * Count active tokens for a user
     */
    countUserTokens(tenantId: string, userId: string): Promise<number>;
    /**
     * Clean up expired tokens
     * Should be run periodically
     */
    cleanupExpiredTokens(): Promise<number>;
    /**
     * Generate a secure random token
     */
    private generateToken;
    /**
     * Generate a family ID
     */
    private generateFamilyId;
    /**
     * Hash token to create token ID
     */
    private hashToken;
    /**
     * Get Redis key for a token
     */
    private getTokenKey;
    /**
     * Get Redis key for a token family
     */
    private getFamilyKey;
    /**
     * Get Redis key for user token index
     */
    private getUserTokenIndexKey;
}
//# sourceMappingURL=token.service.d.ts.map
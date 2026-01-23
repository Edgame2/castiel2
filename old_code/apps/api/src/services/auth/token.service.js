import { randomBytes, createHash } from 'crypto';
/**
 * Token Service
 * Manages refresh tokens with family tracking for reuse detection
 */
export class TokenService {
    redis;
    refreshTokenTTL;
    constructor(redis, options) {
        this.redis = redis;
        this.refreshTokenTTL = options?.refreshTokenTTL || 7 * 24 * 60 * 60; // 7 days
    }
    /**
     * Create a new refresh token
     */
    async createRefreshToken(userId, tenantId, familyId, options) {
        const token = this.generateToken();
        const tokenId = this.hashToken(token);
        const newFamilyId = familyId || this.generateFamilyId();
        const now = Date.now();
        const ttlSeconds = options?.ttlSeconds && options.ttlSeconds > 0
            ? Math.floor(options.ttlSeconds)
            : this.refreshTokenTTL;
        const tokenData = {
            tokenId,
            userId,
            tenantId,
            familyId: newFamilyId,
            createdAt: now,
            expiresAt: now + (ttlSeconds * 1000),
            rotationCount: 0,
            lastUsedAt: undefined,
        };
        // Store token data
        const key = this.getTokenKey(tokenId);
        await this.redis.setex(key, ttlSeconds, JSON.stringify(tokenData));
        // Add to family
        const familyKey = this.getFamilyKey(newFamilyId);
        await this.redis.sadd(familyKey, tokenId);
        await this.redis.expire(familyKey, ttlSeconds);
        // Create user token index
        const userIndexKey = this.getUserTokenIndexKey(tenantId, userId);
        await this.redis.sadd(userIndexKey, tokenId);
        await this.redis.expire(userIndexKey, ttlSeconds);
        return { token, tokenData };
    }
    /**
     * Rotate refresh token (use once and generate new one)
     */
    async rotateRefreshToken(token) {
        const tokenId = this.hashToken(token);
        const tokenData = await this.getTokenData(tokenId);
        if (!tokenData) {
            return null;
        }
        // Check if token was already used (reuse detection)
        if (tokenData.lastUsedAt) {
            // Token reuse detected! Revoke entire family
            await this.revokeFamily(tokenData.familyId);
            throw new Error('Token reuse detected. All tokens in family have been revoked.');
        }
        // Check if token is expired
        if (tokenData.expiresAt < Date.now()) {
            await this.revokeToken(tokenId);
            return null;
        }
        // Mark token as used
        tokenData.lastUsedAt = Date.now();
        tokenData.rotationCount += 1;
        const key = this.getTokenKey(tokenId);
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
            await this.redis.setex(key, ttl, JSON.stringify(tokenData));
        }
        // Create new token in the same family
        const newToken = await this.createRefreshToken(tokenData.userId, tokenData.tenantId, tokenData.familyId);
        // Delete old token after short delay (to prevent race conditions)
        setTimeout(() => {
            this.revokeToken(tokenId);
        }, 5000);
        return newToken;
    }
    /**
     * Get token data
     */
    async getTokenData(tokenId) {
        const key = this.getTokenKey(tokenId);
        const data = await this.redis.get(key);
        if (!data) {
            return null;
        }
        return JSON.parse(data);
    }
    /**
     * Validate token
     */
    async validateToken(token) {
        const tokenId = this.hashToken(token);
        const tokenData = await this.getTokenData(tokenId);
        if (!tokenData) {
            return null;
        }
        // Check if already used
        if (tokenData.lastUsedAt) {
            return null;
        }
        // Check if expired
        if (tokenData.expiresAt < Date.now()) {
            await this.revokeToken(tokenId);
            return null;
        }
        return tokenData;
    }
    /**
     * Revoke a single token
     */
    async revokeToken(tokenId) {
        const tokenData = await this.getTokenData(tokenId);
        if (!tokenData) {
            return;
        }
        // Delete token
        const key = this.getTokenKey(tokenId);
        await this.redis.del(key);
        // Remove from family
        const familyKey = this.getFamilyKey(tokenData.familyId);
        await this.redis.srem(familyKey, tokenId);
        // Remove from user index
        const userIndexKey = this.getUserTokenIndexKey(tokenData.tenantId, tokenData.userId);
        await this.redis.srem(userIndexKey, tokenId);
    }
    /**
     * Revoke all tokens in a family (for reuse detection)
     */
    async revokeFamily(familyId) {
        const familyKey = this.getFamilyKey(familyId);
        const tokenIds = await this.redis.smembers(familyKey);
        if (tokenIds.length === 0) {
            return 0;
        }
        // Delete all tokens in family
        for (const tokenId of tokenIds) {
            await this.revokeToken(tokenId);
        }
        // Delete family key
        await this.redis.del(familyKey);
        return tokenIds.length;
    }
    /**
     * Revoke all tokens for a user
     */
    async revokeAllUserTokens(tenantId, userId) {
        const userIndexKey = this.getUserTokenIndexKey(tenantId, userId);
        const tokenIds = await this.redis.smembers(userIndexKey);
        if (tokenIds.length === 0) {
            return 0;
        }
        // Delete all tokens
        for (const tokenId of tokenIds) {
            await this.revokeToken(tokenId);
        }
        // Delete index
        await this.redis.del(userIndexKey);
        return tokenIds.length;
    }
    /**
     * Get all token IDs for a user
     */
    async getUserTokens(tenantId, userId) {
        const userIndexKey = this.getUserTokenIndexKey(tenantId, userId);
        const tokenIds = await this.redis.smembers(userIndexKey);
        if (tokenIds.length === 0) {
            return [];
        }
        const tokens = [];
        for (const tokenId of tokenIds) {
            const tokenData = await this.getTokenData(tokenId);
            if (tokenData) {
                tokens.push(tokenData);
            }
        }
        return tokens;
    }
    /**
     * Count active tokens for a user
     */
    async countUserTokens(tenantId, userId) {
        const userIndexKey = this.getUserTokenIndexKey(tenantId, userId);
        return this.redis.scard(userIndexKey);
    }
    /**
     * Clean up expired tokens
     * Should be run periodically
     */
    async cleanupExpiredTokens() {
        const pattern = 'refresh:*';
        let cursor = '0';
        let deletedCount = 0;
        do {
            const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            for (const key of keys) {
                // Skip family and index keys
                if (key.includes(':family:') || key.includes(':index:')) {
                    continue;
                }
                const data = await this.redis.get(key);
                if (!data) {
                    continue;
                }
                try {
                    const tokenData = JSON.parse(data);
                    // Check if token is expired
                    if (tokenData.expiresAt < Date.now()) {
                        await this.revokeToken(tokenData.tokenId);
                        deletedCount++;
                    }
                }
                catch (error) {
                    // Invalid token data, delete it
                    await this.redis.del(key);
                    deletedCount++;
                }
            }
        } while (cursor !== '0');
        return deletedCount;
    }
    /**
     * Generate a secure random token
     */
    generateToken() {
        return randomBytes(64).toString('base64url');
    }
    /**
     * Generate a family ID
     */
    generateFamilyId() {
        return randomBytes(16).toString('hex');
    }
    /**
     * Hash token to create token ID
     */
    hashToken(token) {
        return createHash('sha256').update(token).digest('hex');
    }
    /**
     * Get Redis key for a token
     */
    getTokenKey(tokenId) {
        return `refresh:${tokenId}`;
    }
    /**
     * Get Redis key for a token family
     */
    getFamilyKey(familyId) {
        return `refresh:family:${familyId}`;
    }
    /**
     * Get Redis key for user token index
     */
    getUserTokenIndexKey(tenantId, userId) {
        return `refresh:index:${tenantId}:${userId}`;
    }
}
//# sourceMappingURL=token.service.js.map
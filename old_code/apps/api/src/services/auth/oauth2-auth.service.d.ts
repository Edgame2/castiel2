import type { Redis } from 'ioredis';
import type { OAuth2AuthorizationCode, OAuth2AccessToken, OAuth2TokenResponse, OAuth2Client } from '../../types/oauth2.types.js';
/**
 * OAuth2 Authorization Service
 * Handles authorization code flow, client credentials flow, and token generation
 */
export declare class OAuth2AuthService {
    private redis;
    private readonly AUTH_CODE_PREFIX;
    private readonly ACCESS_TOKEN_PREFIX;
    private readonly REFRESH_TOKEN_PREFIX;
    private readonly USER_TOKENS_PREFIX;
    private readonly AUTH_CODE_TTL;
    private readonly DEFAULT_ACCESS_TOKEN_TTL;
    private readonly DEFAULT_REFRESH_TOKEN_TTL;
    constructor(redis: Redis);
    /**
     * Generate authorization code
     * Used in authorization code flow after user consent
     */
    generateAuthorizationCode(clientId: string, userId: string, tenantId: string, redirectUri: string, scope: string[], codeChallenge?: string, codeChallengeMethod?: string): Promise<string>;
    /**
     * Validate and consume authorization code
     * Returns authorization code data and deletes it (one-time use)
     */
    validateAuthorizationCode(code: string, clientId: string, redirectUri: string, codeVerifier?: string): Promise<OAuth2AuthorizationCode | null>;
    /**
     * Generate access token and optional refresh token
     * Used for all grant types
     */
    generateTokens(client: OAuth2Client, scope: string[], userId?: string): Promise<OAuth2TokenResponse>;
    /**
     * Validate access token
     * Returns token data if valid, null if invalid/expired
     */
    validateAccessToken(accessToken: string): Promise<OAuth2AccessToken | null>;
    /**
     * Refresh access token using refresh token
     * Implements token rotation (old refresh token is revoked, new one issued)
     */
    refreshAccessToken(refreshToken: string, clientId: string, requestedScope?: string[]): Promise<OAuth2TokenResponse | null>;
    /**
     * Revoke access token
     */
    revokeAccessToken(accessToken: string): Promise<boolean>;
    /**
     * Revoke refresh token
     */
    revokeRefreshToken(refreshToken: string): Promise<boolean>;
    /**
     * Revoke all tokens for a user
     */
    revokeUserTokens(userId: string, tenantId: string): Promise<number>;
    /**
     * Revoke all tokens for a client
     */
    revokeClientTokens(clientId: string, tenantId: string): Promise<number>;
    /**
     * Generate random token
     */
    private generateToken;
    /**
     * Validate PKCE (Proof Key for Code Exchange)
     */
    private validatePKCE;
    /**
     * Track user's active tokens
     */
    private addUserToken;
    /**
     * Get active tokens count for a user
     */
    getUserActiveTokensCount(userId: string, tenantId: string): Promise<number>;
}
//# sourceMappingURL=oauth2-auth.service.d.ts.map
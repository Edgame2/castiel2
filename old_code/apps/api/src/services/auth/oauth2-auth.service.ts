import type { Redis } from 'ioredis';
import { randomBytes, createHash } from 'crypto';
import type {
  OAuth2AuthorizationCode,
  OAuth2AccessToken,
  OAuth2RefreshToken,
  OAuth2TokenResponse,
  OAuth2Client,
} from '../../types/oauth2.types.js';
import { OAuth2TokenType, OAuth2GrantType, OAuth2ClientType, OAuth2ClientStatus } from '../../types/oauth2.types.js';

/**
 * OAuth2 Authorization Service
 * Handles authorization code flow, client credentials flow, and token generation
 */
export class OAuth2AuthService {
  private redis: Redis;

  // Redis key prefixes
  private readonly AUTH_CODE_PREFIX = 'oauth2:auth_code:';
  private readonly ACCESS_TOKEN_PREFIX = 'oauth2:access_token:';
  private readonly REFRESH_TOKEN_PREFIX = 'oauth2:refresh_token:';
  private readonly USER_TOKENS_PREFIX = 'oauth2:user_tokens:'; // Track user's active tokens

  // TTLs
  private readonly AUTH_CODE_TTL = 600; // 10 minutes
  private readonly DEFAULT_ACCESS_TOKEN_TTL = 3600; // 1 hour
  private readonly DEFAULT_REFRESH_TOKEN_TTL = 2592000; // 30 days

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Generate authorization code
   * Used in authorization code flow after user consent
   */
  async generateAuthorizationCode(
    clientId: string,
    userId: string,
    tenantId: string,
    redirectUri: string,
    scope: string[],
    codeChallenge?: string,
    codeChallengeMethod?: string
  ): Promise<string> {
    const code = `auth_${randomBytes(32).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.AUTH_CODE_TTL * 1000);

    const authCode: OAuth2AuthorizationCode = {
      code,
      clientId,
      userId,
      tenantId,
      redirectUri,
      scope,
      codeChallenge,
      codeChallengeMethod,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Store in Redis with TTL
    const key = this.AUTH_CODE_PREFIX + code;
    await this.redis.setex(key, this.AUTH_CODE_TTL, JSON.stringify(authCode));

    return code;
  }

  /**
   * Validate and consume authorization code
   * Returns authorization code data and deletes it (one-time use)
   */
  async validateAuthorizationCode(
    code: string,
    clientId: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<OAuth2AuthorizationCode | null> {
    const key = this.AUTH_CODE_PREFIX + code;
    const data = await this.redis.get(key);

    if (!data) {
      return null; // Code not found or expired
    }

    const authCode: OAuth2AuthorizationCode = JSON.parse(data);

    // Validate client ID
    if (authCode.clientId !== clientId) {
      return null;
    }

    // Validate redirect URI (must match the one used in authorization request)
    if (authCode.redirectUri !== redirectUri) {
      return null;
    }

    // Validate PKCE if code challenge was provided
    if (authCode.codeChallenge) {
      if (!codeVerifier) {
        return null; // Code verifier required but not provided
      }

      const isValid = this.validatePKCE(
        codeVerifier,
        authCode.codeChallenge,
        authCode.codeChallengeMethod || 'plain'
      );

      if (!isValid) {
        return null;
      }
    }

    // Delete the code (one-time use)
    await this.redis.del(key);

    return authCode;
  }

  /**
   * Generate access token and optional refresh token
   * Used for all grant types
   */
  async generateTokens(
    client: OAuth2Client,
    scope: string[],
    userId?: string // Optional for client_credentials flow
  ): Promise<OAuth2TokenResponse> {
    const accessToken = this.generateToken('access');
    const accessTokenTTL = client.accessTokenTTL || this.DEFAULT_ACCESS_TOKEN_TTL;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + accessTokenTTL * 1000);

    // Store access token in Redis
    const accessTokenData: OAuth2AccessToken = {
      accessToken,
      tokenType: OAuth2TokenType.BEARER,
      clientId: client.id,
      userId,
      tenantId: client.tenantId,
      scope,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const accessTokenKey = this.ACCESS_TOKEN_PREFIX + accessToken;
    await this.redis.setex(accessTokenKey, accessTokenTTL, JSON.stringify(accessTokenData));

    // Generate refresh token only if:
    // 1. User is present (not client_credentials flow)
    // 2. Client allows refresh_token grant type
    let refreshToken: string | undefined;
    if (userId && client.allowedGrantTypes.includes(OAuth2GrantType.REFRESH_TOKEN)) {
      refreshToken = this.generateToken('refresh');
      const refreshTokenTTL = client.refreshTokenTTL || this.DEFAULT_REFRESH_TOKEN_TTL;
      const refreshExpiresAt = new Date(now.getTime() + refreshTokenTTL * 1000);

      const refreshTokenData: OAuth2RefreshToken = {
        refreshToken,
        clientId: client.id,
        userId,
        tenantId: client.tenantId,
        scope,
        createdAt: now.toISOString(),
        expiresAt: refreshExpiresAt.toISOString(),
      };

      const refreshTokenKey = this.REFRESH_TOKEN_PREFIX + refreshToken;
      await this.redis.setex(refreshTokenKey, refreshTokenTTL, JSON.stringify(refreshTokenData));

      // Track user's tokens for revocation
      await this.addUserToken(userId, client.tenantId, accessToken, refreshToken);
    }

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: accessTokenTTL,
      refresh_token: refreshToken,
      scope: scope.join(' '),
    };
  }

  /**
   * Validate access token
   * Returns token data if valid, null if invalid/expired
   */
  async validateAccessToken(accessToken: string): Promise<OAuth2AccessToken | null> {
    const key = this.ACCESS_TOKEN_PREFIX + accessToken;
    const data = await this.redis.get(key);

    if (!data) {
      return null; // Token not found or expired
    }

    const tokenData: OAuth2AccessToken = JSON.parse(data);

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(tokenData.expiresAt);
    if (now >= expiresAt) {
      await this.redis.del(key);
      return null;
    }

    return tokenData;
  }

  /**
   * Refresh access token using refresh token
   * Implements token rotation (old refresh token is revoked, new one issued)
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    requestedScope?: string[]
  ): Promise<OAuth2TokenResponse | null> {
    const key = this.REFRESH_TOKEN_PREFIX + refreshToken;
    const data = await this.redis.get(key);

    if (!data) {
      return null; // Refresh token not found or expired
    }

    const refreshTokenData: OAuth2RefreshToken = JSON.parse(data);

    // Validate client ID
    if (refreshTokenData.clientId !== clientId) {
      return null;
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(refreshTokenData.expiresAt);
    if (now >= expiresAt) {
      await this.redis.del(key);
      return null;
    }

    // Validate requested scope (must be subset of original scope)
    let scope = refreshTokenData.scope;
    if (requestedScope && requestedScope.length > 0) {
      const isValidScope = requestedScope.every(s => refreshTokenData.scope.includes(s));
      if (!isValidScope) {
        return null; // Requested scope not allowed
      }
      scope = requestedScope;
    }

    // Revoke old refresh token (token rotation)
    await this.redis.del(key);

    // Generate new tokens
    // Note: We need the full client object, but we can reconstruct minimal version
    const client: OAuth2Client = {
      id: refreshTokenData.clientId,
      tenantId: refreshTokenData.tenantId,
      allowedGrantTypes: [OAuth2GrantType.REFRESH_TOKEN],
      name: '', // Not used in token generation
      type: OAuth2ClientType.CONFIDENTIAL, // Not used in token generation
      status: OAuth2ClientStatus.ACTIVE,
      createdBy: '',
      redirectUris: [],
      allowedScopes: refreshTokenData.scope,
      metadata: { createdAt: '' },
    };

    return this.generateTokens(client, scope, refreshTokenData.userId);
  }

  /**
   * Revoke access token
   */
  async revokeAccessToken(accessToken: string): Promise<boolean> {
    const key = this.ACCESS_TOKEN_PREFIX + accessToken;
    const deleted = await this.redis.del(key);
    return deleted > 0;
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    const key = this.REFRESH_TOKEN_PREFIX + refreshToken;
    const deleted = await this.redis.del(key);
    return deleted > 0;
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeUserTokens(userId: string, tenantId: string): Promise<number> {
    const userTokensKey = this.USER_TOKENS_PREFIX + `${tenantId}:${userId}`;
    const tokensData = await this.redis.get(userTokensKey);

    if (!tokensData) {
      return 0;
    }

    const tokens = JSON.parse(tokensData) as Array<{
      accessToken: string;
      refreshToken?: string;
    }>;

    let revokedCount = 0;

    for (const token of tokens) {
      // Revoke access token
      const accessDeleted = await this.revokeAccessToken(token.accessToken);
      if (accessDeleted) {revokedCount++;}

      // Revoke refresh token if present
      if (token.refreshToken) {
        const refreshDeleted = await this.revokeRefreshToken(token.refreshToken);
        if (refreshDeleted) {revokedCount++;}
      }
    }

    // Clear user tokens list
    await this.redis.del(userTokensKey);

    return revokedCount;
  }

  /**
   * Revoke all tokens for a client
   */
  async revokeClientTokens(clientId: string, tenantId: string): Promise<number> {
    // Get all access tokens for this client
    const pattern = this.ACCESS_TOKEN_PREFIX + '*';
    const keys = await this.redis.keys(pattern);

    let revokedCount = 0;

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (!data) {continue;}

      const tokenData: OAuth2AccessToken = JSON.parse(data);
      if (tokenData.clientId === clientId && tokenData.tenantId === tenantId) {
        await this.redis.del(key);
        revokedCount++;
      }
    }

    // Get all refresh tokens for this client
    const refreshPattern = this.REFRESH_TOKEN_PREFIX + '*';
    const refreshKeys = await this.redis.keys(refreshPattern);

    for (const key of refreshKeys) {
      const data = await this.redis.get(key);
      if (!data) {continue;}

      const tokenData: OAuth2RefreshToken = JSON.parse(data);
      if (tokenData.clientId === clientId && tokenData.tenantId === tenantId) {
        await this.redis.del(key);
        revokedCount++;
      }
    }

    return revokedCount;
  }

  /**
   * Generate random token
   */
  private generateToken(type: 'access' | 'refresh'): string {
    const prefix = type === 'access' ? 'oat_' : 'ort_'; // OAuth Access Token / OAuth Refresh Token
    return prefix + randomBytes(32).toString('hex');
  }

  /**
   * Validate PKCE (Proof Key for Code Exchange)
   */
  private validatePKCE(
    codeVerifier: string,
    codeChallenge: string,
    codeChallengeMethod: string
  ): boolean {
    if (codeChallengeMethod === 'S256') {
      // SHA-256 hash of code_verifier, base64url encoded
      const hash = createHash('sha256').update(codeVerifier).digest('base64url');
      return hash === codeChallenge;
    } else if (codeChallengeMethod === 'plain') {
      // Plain code_verifier (not recommended)
      return codeVerifier === codeChallenge;
    }
    return false;
  }

  /**
   * Track user's active tokens
   */
  private async addUserToken(
    userId: string,
    tenantId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<void> {
    const key = this.USER_TOKENS_PREFIX + `${tenantId}:${userId}`;
    const tokensData = await this.redis.get(key);

    let tokens: Array<{ accessToken: string; refreshToken?: string }> = [];

    if (tokensData) {
      tokens = JSON.parse(tokensData);
    }

    tokens.push({ accessToken, refreshToken });

    // Store for 30 days (max refresh token TTL)
    await this.redis.setex(key, this.DEFAULT_REFRESH_TOKEN_TTL, JSON.stringify(tokens));
  }

  /**
   * Get active tokens count for a user
   */
  async getUserActiveTokensCount(userId: string, tenantId: string): Promise<number> {
    const key = this.USER_TOKENS_PREFIX + `${tenantId}:${userId}`;
    const tokensData = await this.redis.get(key);

    if (!tokensData) {
      return 0;
    }

    const tokens = JSON.parse(tokensData) as Array<{
      accessToken: string;
      refreshToken?: string;
    }>;

    return tokens.length;
  }
}

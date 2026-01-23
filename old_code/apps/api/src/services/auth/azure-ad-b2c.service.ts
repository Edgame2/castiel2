/**
 * Azure AD B2C Service
 * 
 * Handles Azure Active Directory B2C authentication flows
 * using OpenID Connect protocol
 */

import type { Redis } from 'ioredis';
import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';

export interface AzureADB2CConfig {
  tenantName: string;        // e.g., 'yourcompany' (from yourcompany.onmicrosoft.com)
  tenantId: string;          // Azure AD B2C tenant ID
  clientId: string;          // Application (client) ID
  clientSecret: string;      // Client secret
  policyName: string;        // User flow/policy name (e.g., 'B2C_1_signupsignin')
  redirectUri: string;       // Callback URL
  scopes: string[];          // Requested scopes
}

export interface AzureADB2CTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface AzureADB2CUserInfo {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  oid?: string;
  tid?: string;
  preferred_username?: string;
  emails?: string[];
  groups?: string[]; // Azure AD B2C groups claim
}

/**
 * Azure AD B2C Service
 */
export class AzureADB2CService {
  private readonly statePrefix = 'azure_b2c_state:';
  private readonly noncePrefix = 'azure_b2c_nonce:';
  private readonly stateTTL = 600; // 10 minutes

  constructor(
    private readonly redis: Redis,
    private readonly config: AzureADB2CConfig
  ) {}

  /**
   * Get the OpenID Connect discovery endpoint
   */
  private getDiscoveryEndpoint(): string {
    return `https://${this.config.tenantName}.b2clogin.com/${this.config.tenantName}.onmicrosoft.com/${this.config.policyName}/v2.0/.well-known/openid-configuration`;
  }

  /**
   * Get the authorization endpoint URL
   */
  private getAuthorizationUrl(): string {
    return `https://${this.config.tenantName}.b2clogin.com/${this.config.tenantName}.onmicrosoft.com/${this.config.policyName}/oauth2/v2.0/authorize`;
  }

  /**
   * Get the token endpoint URL
   */
  private getTokenUrl(): string {
    return `https://${this.config.tenantName}.b2clogin.com/${this.config.tenantName}.onmicrosoft.com/${this.config.policyName}/oauth2/v2.0/token`;
  }

  /**
   * Get the logout endpoint URL
   */
  getLogoutUrl(postLogoutRedirectUri?: string): string {
    const baseUrl = `https://${this.config.tenantName}.b2clogin.com/${this.config.tenantName}.onmicrosoft.com/${this.config.policyName}/oauth2/v2.0/logout`;
    if (postLogoutRedirectUri) {
      return `${baseUrl}?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
    }
    return baseUrl;
  }

  /**
   * Generate state and nonce for OAuth flow
   */
  async createAuthState(
    tenantId: string,
    returnUrl?: string
  ): Promise<{ state: string; nonce: string; authUrl: string }> {
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    // Store state
    await this.redis.setex(
      `${this.statePrefix}${state}`,
      this.stateTTL,
      JSON.stringify({ tenantId, returnUrl, nonce, createdAt: Date.now() })
    );

    // Store nonce
    await this.redis.setex(`${this.noncePrefix}${nonce}`, this.stateTTL, state);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code id_token',
      redirect_uri: this.config.redirectUri,
      response_mode: 'form_post',
      scope: this.config.scopes.join(' '),
      state,
      nonce,
    });

    const authUrl = `${this.getAuthorizationUrl()}?${params.toString()}`;

    return { state, nonce, authUrl };
  }

  /**
   * Validate state and get stored data
   */
  async validateState(state: string): Promise<{
    tenantId: string;
    returnUrl?: string;
    nonce: string;
    createdAt: number;
  } | null> {
    const data = await this.redis.get(`${this.statePrefix}${state}`);
    if (!data) {return null;}

    // Delete used state
    await this.redis.del(`${this.statePrefix}${state}`);

    return JSON.parse(data);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<AzureADB2CTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
    });

    const response = await axios.post(this.getTokenUrl(), params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  }

  /**
   * Validate and decode ID token
   * Note: In production, you should verify the token signature using JWKS
   */
  async validateIdToken(idToken: string, expectedNonce: string): Promise<AzureADB2CUserInfo> {
    // Decode token (in production, verify signature with JWKS)
    const decoded = jwt.decode(idToken) as AzureADB2CUserInfo & {
      nonce?: string;
      aud?: string;
      iss?: string;
      exp?: number;
    };

    if (!decoded) {
      throw new Error('Invalid ID token');
    }

    // Validate nonce
    if (decoded.nonce !== expectedNonce) {
      throw new Error('Invalid nonce in ID token');
    }

    // Validate audience
    if (decoded.aud !== this.config.clientId) {
      throw new Error('Invalid audience in ID token');
    }

    // Validate expiration
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      throw new Error('ID token has expired');
    }

    return decoded;
  }

  /**
   * Get user info from ID token claims
   */
  extractUserInfo(claims: AzureADB2CUserInfo): {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string[];
  } {
    // Azure AD B2C can return email in different claims
    const email = claims.email || claims.preferred_username || (claims.emails && claims.emails[0]);

    if (!email) {
      throw new Error('Email not found in ID token claims');
    }

    return {
      id: claims.oid || claims.sub,
      email,
      firstName: claims.given_name,
      lastName: claims.family_name,
      displayName: claims.name,
      groups: claims.groups, // Extract groups from claims
    };
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(
      this.config.tenantName &&
      this.config.clientId &&
      this.config.clientSecret &&
      this.config.policyName &&
      this.config.redirectUri
    );
  }
}


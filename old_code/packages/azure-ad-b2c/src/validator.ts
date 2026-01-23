import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { AzureAdB2CConfig, B2CTokenClaims, TokenValidationResult } from './types.js';

/**
 * Token validator for Azure AD B2C JWT tokens
 */
export class B2CTokenValidator {
  private jwksClient: jwksClient.JwksClient;
  private config: AzureAdB2CConfig;

  constructor(config: AzureAdB2CConfig) {
    this.config = config;

    // Create JWKS client to fetch signing keys
    const jwksUri = `https://${config.domain}/${config.tenantName}.onmicrosoft.com/${config.policies.signUpSignIn}/discovery/v2.0/keys`;
    
    this.jwksClient = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  /**
   * Get signing key for token validation
   */
  private async getSigningKey(kid: string): Promise<string> {
    const key = await this.jwksClient.getSigningKey(kid);
    return key.getPublicKey();
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      // Decode token header to get key ID (kid)
      const decodedHeader = jwt.decode(token, { complete: true });
      
      if (!decodedHeader || typeof decodedHeader === 'string') {
        return {
          valid: false,
          error: 'invalid_token',
          errorDescription: 'Invalid token format',
        };
      }

      const kid = decodedHeader.header.kid;
      if (!kid) {
        return {
          valid: false,
          error: 'invalid_token',
          errorDescription: 'Token missing key ID',
        };
      }

      // Get signing key
      const signingKey = await this.getSigningKey(kid);

      // Verify and decode token
      const decoded = jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
        audience: this.config.clientId,
        issuer: this.getIssuer(),
        clockTolerance: this.config.validation?.clockSkew || 300, // 5 minutes
      }) as B2CTokenClaims;

      return {
        valid: true,
        claims: decoded,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'token_expired',
          errorDescription: 'Token has expired',
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'invalid_token',
          errorDescription: error.message,
        };
      }

      return {
        valid: false,
        error: 'validation_error',
        errorDescription: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Decode token without validation (use for inspecting claims)
   */
  decodeToken(token: string): B2CTokenClaims | null {
    try {
      const decoded = jwt.decode(token) as B2CTokenClaims;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired (without full validation)
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const clockSkew = this.config.validation?.clockSkew || 300;
    
    return decoded.exp + clockSkew < now;
  }

  /**
   * Get expected token issuer
   */
  private getIssuer(): string {
    const domain = this.config.customDomain || this.config.domain;
    return `https://${domain}/${this.config.tenantId}/v2.0/`;
  }

  /**
   * Extract user ID from token
   */
  getUserIdFromToken(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.sub || decoded?.oid || null;
  }

  /**
   * Extract email from token
   */
  getEmailFromToken(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.emails?.[0] || decoded?.preferred_username || null;
  }

  /**
   * Extract identity provider from token
   */
  getIdentityProviderFromToken(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.idp || null;
  }
}

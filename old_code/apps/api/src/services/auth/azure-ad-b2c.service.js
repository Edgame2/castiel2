/**
 * Azure AD B2C Service
 *
 * Handles Azure Active Directory B2C authentication flows
 * using OpenID Connect protocol
 */
import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
/**
 * Azure AD B2C Service
 */
export class AzureADB2CService {
    redis;
    config;
    statePrefix = 'azure_b2c_state:';
    noncePrefix = 'azure_b2c_nonce:';
    stateTTL = 600; // 10 minutes
    constructor(redis, config) {
        this.redis = redis;
        this.config = config;
    }
    /**
     * Get the OpenID Connect discovery endpoint
     */
    getDiscoveryEndpoint() {
        return `https://${this.config.tenantName}.b2clogin.com/${this.config.tenantName}.onmicrosoft.com/${this.config.policyName}/v2.0/.well-known/openid-configuration`;
    }
    /**
     * Get the authorization endpoint URL
     */
    getAuthorizationUrl() {
        return `https://${this.config.tenantName}.b2clogin.com/${this.config.tenantName}.onmicrosoft.com/${this.config.policyName}/oauth2/v2.0/authorize`;
    }
    /**
     * Get the token endpoint URL
     */
    getTokenUrl() {
        return `https://${this.config.tenantName}.b2clogin.com/${this.config.tenantName}.onmicrosoft.com/${this.config.policyName}/oauth2/v2.0/token`;
    }
    /**
     * Get the logout endpoint URL
     */
    getLogoutUrl(postLogoutRedirectUri) {
        const baseUrl = `https://${this.config.tenantName}.b2clogin.com/${this.config.tenantName}.onmicrosoft.com/${this.config.policyName}/oauth2/v2.0/logout`;
        if (postLogoutRedirectUri) {
            return `${baseUrl}?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
        }
        return baseUrl;
    }
    /**
     * Generate state and nonce for OAuth flow
     */
    async createAuthState(tenantId, returnUrl) {
        const state = crypto.randomBytes(32).toString('hex');
        const nonce = crypto.randomBytes(32).toString('hex');
        // Store state
        await this.redis.setex(`${this.statePrefix}${state}`, this.stateTTL, JSON.stringify({ tenantId, returnUrl, nonce, createdAt: Date.now() }));
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
    async validateState(state) {
        const data = await this.redis.get(`${this.statePrefix}${state}`);
        if (!data) {
            return null;
        }
        // Delete used state
        await this.redis.del(`${this.statePrefix}${state}`);
        return JSON.parse(data);
    }
    /**
     * Exchange authorization code for tokens
     */
    async exchangeCode(code) {
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
    async validateIdToken(idToken, expectedNonce) {
        // Decode token (in production, verify signature with JWKS)
        const decoded = jwt.decode(idToken);
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
    extractUserInfo(claims) {
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
    isConfigured() {
        return !!(this.config.tenantName &&
            this.config.clientId &&
            this.config.clientSecret &&
            this.config.policyName &&
            this.config.redirectUri);
    }
}
//# sourceMappingURL=azure-ad-b2c.service.js.map
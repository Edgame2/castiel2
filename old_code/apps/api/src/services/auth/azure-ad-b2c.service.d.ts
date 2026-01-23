/**
 * Azure AD B2C Service
 *
 * Handles Azure Active Directory B2C authentication flows
 * using OpenID Connect protocol
 */
import type { Redis } from 'ioredis';
export interface AzureADB2CConfig {
    tenantName: string;
    tenantId: string;
    clientId: string;
    clientSecret: string;
    policyName: string;
    redirectUri: string;
    scopes: string[];
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
    groups?: string[];
}
/**
 * Azure AD B2C Service
 */
export declare class AzureADB2CService {
    private readonly redis;
    private readonly config;
    private readonly statePrefix;
    private readonly noncePrefix;
    private readonly stateTTL;
    constructor(redis: Redis, config: AzureADB2CConfig);
    /**
     * Get the OpenID Connect discovery endpoint
     */
    private getDiscoveryEndpoint;
    /**
     * Get the authorization endpoint URL
     */
    private getAuthorizationUrl;
    /**
     * Get the token endpoint URL
     */
    private getTokenUrl;
    /**
     * Get the logout endpoint URL
     */
    getLogoutUrl(postLogoutRedirectUri?: string): string;
    /**
     * Generate state and nonce for OAuth flow
     */
    createAuthState(tenantId: string, returnUrl?: string): Promise<{
        state: string;
        nonce: string;
        authUrl: string;
    }>;
    /**
     * Validate state and get stored data
     */
    validateState(state: string): Promise<{
        tenantId: string;
        returnUrl?: string;
        nonce: string;
        createdAt: number;
    } | null>;
    /**
     * Exchange authorization code for tokens
     */
    exchangeCode(code: string): Promise<AzureADB2CTokenResponse>;
    /**
     * Validate and decode ID token
     * Note: In production, you should verify the token signature using JWKS
     */
    validateIdToken(idToken: string, expectedNonce: string): Promise<AzureADB2CUserInfo>;
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
    };
    /**
     * Check if service is configured
     */
    isConfigured(): boolean;
}
//# sourceMappingURL=azure-ad-b2c.service.d.ts.map
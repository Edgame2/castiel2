import type { Redis } from 'ioredis';
export interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    scope: string;
}
export type OAuthProvider = 'google' | 'github' | 'microsoft';
export interface OAuthState {
    provider: OAuthProvider;
    tenantId?: string;
    redirectUrl?: string;
    createdAt: number;
}
export interface OAuthUserInfo {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    provider: OAuthProvider;
}
export interface OAuthTokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    id_token?: string;
}
/**
 * OAuth service for handling Google, GitHub, and Microsoft OAuth flows
 * - State management in Redis for CSRF protection
 * - Token exchange with OAuth providers
 * - User info retrieval
 */
export declare class OAuthService {
    private readonly redis;
    private readonly googleConfig;
    private readonly githubConfig;
    private readonly microsoftConfig?;
    private readonly STATE_TTL;
    private readonly STATE_PREFIX;
    constructor(redis: Redis, googleConfig: OAuthConfig, githubConfig: OAuthConfig, microsoftConfig?: OAuthConfig | undefined);
    /**
     * Generate OAuth state and store in Redis
     */
    createState(provider: OAuthProvider, tenantId?: string, redirectUrl?: string): Promise<string>;
    /**
     * Validate and retrieve OAuth state from Redis
     */
    validateState(state: string): Promise<OAuthState | null>;
    /**
     * Get config for provider
     */
    private getConfig;
    /**
     * Build authorization URL for OAuth provider
     */
    buildAuthorizationUrl(provider: OAuthProvider, state: string, scope?: string): string;
    /**
     * Exchange authorization code for access token
     */
    exchangeCode(provider: OAuthProvider, code: string): Promise<OAuthTokenResponse>;
    /**
     * Get user information from OAuth provider
     */
    getUserInfo(provider: OAuthProvider, accessToken: string): Promise<OAuthUserInfo>;
    /**
     * Parse Google user info response
     */
    private parseGoogleUserInfo;
    /**
     * Parse GitHub user info response
     * GitHub requires separate API call for email
     */
    private parseGithubUserInfo;
    /**
     * Parse Microsoft user info response (Microsoft Graph API)
     */
    private parseMicrosoftUserInfo;
    /**
     * Check if OAuth service is ready for a specific provider
     */
    isReady(provider: OAuthProvider): boolean;
}
//# sourceMappingURL=oauth.service.d.ts.map
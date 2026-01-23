/**
 * OAuth2 types for authorization server implementation
 */
/**
 * OAuth2 grant types
 */
export declare enum OAuth2GrantType {
    AUTHORIZATION_CODE = "authorization_code",
    CLIENT_CREDENTIALS = "client_credentials",
    REFRESH_TOKEN = "refresh_token"
}
/**
 * OAuth2 response types
 */
export declare enum OAuth2ResponseType {
    CODE = "code",
    TOKEN = "token"
}
/**
 * OAuth2 client types
 */
export declare enum OAuth2ClientType {
    CONFIDENTIAL = "confidential",// Can securely store client_secret (backend apps)
    PUBLIC = "public"
}
/**
 * OAuth2 token types
 */
export declare enum OAuth2TokenType {
    BEARER = "Bearer"
}
/**
 * OAuth2 client status
 */
export declare enum OAuth2ClientStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended"
}
/**
 * OAuth2 scope definitions
 */
export interface OAuth2Scope {
    name: string;
    description: string;
}
/**
 * OAuth2 client configuration
 */
export interface OAuth2Client {
    id: string;
    clientSecret?: string;
    name: string;
    type: OAuth2ClientType;
    status: OAuth2ClientStatus;
    tenantId: string;
    createdBy: string;
    redirectUris: string[];
    allowedGrantTypes: OAuth2GrantType[];
    allowedScopes: string[];
    accessTokenTTL?: number;
    refreshTokenTTL?: number;
    description?: string;
    logoUri?: string;
    termsOfServiceUri?: string;
    policyUri?: string;
    metadata: {
        createdAt: string;
        updatedAt?: string;
        lastUsedAt?: string;
    };
}
/**
 * OAuth2 authorization code (stored in Redis)
 */
export interface OAuth2AuthorizationCode {
    code: string;
    clientId: string;
    userId: string;
    tenantId: string;
    redirectUri: string;
    scope: string[];
    codeChallenge?: string;
    codeChallengeMethod?: string;
    createdAt: string;
    expiresAt: string;
}
/**
 * OAuth2 access token (stored in Redis)
 */
export interface OAuth2AccessToken {
    accessToken: string;
    tokenType: OAuth2TokenType;
    clientId: string;
    userId?: string;
    tenantId: string;
    scope: string[];
    createdAt: string;
    expiresAt: string;
}
/**
 * OAuth2 refresh token (stored in Redis)
 */
export interface OAuth2RefreshToken {
    refreshToken: string;
    clientId: string;
    userId: string;
    tenantId: string;
    scope: string[];
    createdAt: string;
    expiresAt: string;
}
/**
 * OAuth2 authorization request
 */
export interface OAuth2AuthorizationRequest {
    response_type: OAuth2ResponseType;
    client_id: string;
    redirect_uri: string;
    scope?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
}
/**
 * OAuth2 authorization response (success)
 */
export interface OAuth2AuthorizationResponse {
    code: string;
    state?: string;
}
/**
 * OAuth2 authorization error response
 */
export interface OAuth2ErrorResponse {
    error: string;
    error_description?: string;
    error_uri?: string;
    state?: string;
}
/**
 * OAuth2 token request (authorization code flow)
 */
export interface OAuth2AuthorizationCodeTokenRequest {
    grant_type: 'authorization_code';
    code: string;
    redirect_uri: string;
    client_id: string;
    client_secret?: string;
    code_verifier?: string;
}
/**
 * OAuth2 token request (client credentials flow)
 */
export interface OAuth2ClientCredentialsTokenRequest {
    grant_type: 'client_credentials';
    scope?: string;
    client_id: string;
    client_secret: string;
}
/**
 * OAuth2 token request (refresh token flow)
 */
export interface OAuth2RefreshTokenRequest {
    grant_type: 'refresh_token';
    refresh_token: string;
    scope?: string;
    client_id: string;
    client_secret?: string;
}
/**
 * OAuth2 token response
 */
export interface OAuth2TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
}
/**
 * OAuth2 token revocation request
 */
export interface OAuth2RevokeTokenRequest {
    token: string;
    token_type_hint?: string;
    client_id: string;
    client_secret?: string;
}
/**
 * Create OAuth2 client request
 */
export interface CreateOAuth2ClientRequest {
    name: string;
    type: OAuth2ClientType;
    redirectUris: string[];
    allowedGrantTypes: OAuth2GrantType[];
    allowedScopes: string[];
    description?: string;
    logoUri?: string;
    accessTokenTTL?: number;
    refreshTokenTTL?: number;
}
/**
 * Update OAuth2 client request
 */
export interface UpdateOAuth2ClientRequest {
    name?: string;
    status?: OAuth2ClientStatus;
    redirectUris?: string[];
    allowedGrantTypes?: OAuth2GrantType[];
    allowedScopes?: string[];
    description?: string;
    logoUri?: string;
    accessTokenTTL?: number;
    refreshTokenTTL?: number;
}
/**
 * OAuth2 client response (public view - excludes client_secret)
 */
export interface OAuth2ClientResponse {
    id: string;
    name: string;
    type: OAuth2ClientType;
    status: OAuth2ClientStatus;
    tenantId: string;
    redirectUris: string[];
    allowedGrantTypes: OAuth2GrantType[];
    allowedScopes: string[];
    accessTokenTTL?: number;
    refreshTokenTTL?: number;
    description?: string;
    logoUri?: string;
    metadata: {
        createdAt: string;
        updatedAt?: string;
        lastUsedAt?: string;
    };
}
/**
 * OAuth2 client with secret (only returned on creation or regeneration)
 */
export interface OAuth2ClientWithSecret extends OAuth2ClientResponse {
    clientSecret: string;
}
//# sourceMappingURL=oauth2.types.d.ts.map
/**
 * OAuth2 types for authorization server implementation
 */

/**
 * OAuth2 grant types
 */
export enum OAuth2GrantType {
  AUTHORIZATION_CODE = 'authorization_code',
  CLIENT_CREDENTIALS = 'client_credentials',
  REFRESH_TOKEN = 'refresh_token',
}

/**
 * OAuth2 response types
 */
export enum OAuth2ResponseType {
  CODE = 'code',
  TOKEN = 'token',
}

/**
 * OAuth2 client types
 */
export enum OAuth2ClientType {
  CONFIDENTIAL = 'confidential', // Can securely store client_secret (backend apps)
  PUBLIC = 'public',             // Cannot store client_secret (mobile/SPA apps)
}

/**
 * OAuth2 token types
 */
export enum OAuth2TokenType {
  BEARER = 'Bearer',
}

/**
 * OAuth2 client status
 */
export enum OAuth2ClientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
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
  id: string;                        // Client ID (unique identifier)
  clientSecret?: string;             // Client secret (hashed, only for confidential clients)
  name: string;                      // Client application name
  type: OAuth2ClientType;            // confidential or public
  status: OAuth2ClientStatus;        // active, inactive, or suspended
  
  // Organization/Tenant
  tenantId: string;                  // Tenant/organization that owns this client (partition key)
  createdBy: string;                 // User ID who created the client
  
  // OAuth2 configuration
  redirectUris: string[];            // Allowed redirect URIs
  allowedGrantTypes: OAuth2GrantType[]; // Allowed grant types
  allowedScopes: string[];           // Allowed scopes
  
  // Token configuration
  accessTokenTTL?: number;           // Access token TTL in seconds (default: 3600)
  refreshTokenTTL?: number;          // Refresh token TTL in seconds (default: 2592000 - 30 days)
  
  // Metadata
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
  code: string;                      // Authorization code
  clientId: string;                  // Client ID
  userId: string;                    // User ID who authorized
  tenantId: string;                  // Tenant ID
  redirectUri: string;               // Redirect URI used in authorization request
  scope: string[];                   // Granted scopes
  codeChallenge?: string;            // PKCE code challenge
  codeChallengeMethod?: string;      // PKCE code challenge method (S256 or plain)
  createdAt: string;                 // Creation timestamp
  expiresAt: string;                 // Expiration timestamp
}

/**
 * OAuth2 access token (stored in Redis)
 */
export interface OAuth2AccessToken {
  accessToken: string;               // Access token (JWT or opaque)
  tokenType: OAuth2TokenType;        // Token type (Bearer)
  clientId: string;                  // Client ID
  userId?: string;                   // User ID (null for client_credentials)
  tenantId: string;                  // Tenant ID
  scope: string[];                   // Granted scopes
  createdAt: string;                 // Creation timestamp
  expiresAt: string;                 // Expiration timestamp
}

/**
 * OAuth2 refresh token (stored in Redis)
 */
export interface OAuth2RefreshToken {
  refreshToken: string;              // Refresh token
  clientId: string;                  // Client ID
  userId: string;                    // User ID
  tenantId: string;                  // Tenant ID
  scope: string[];                   // Granted scopes
  createdAt: string;                 // Creation timestamp
  expiresAt: string;                 // Expiration timestamp
}

/**
 * OAuth2 authorization request
 */
export interface OAuth2AuthorizationRequest {
  response_type: OAuth2ResponseType; // 'code' for authorization code flow
  client_id: string;                 // Client ID
  redirect_uri: string;              // Redirect URI
  scope?: string;                    // Requested scopes (space-separated)
  state?: string;                    // Client state
  code_challenge?: string;           // PKCE code challenge
  code_challenge_method?: string;    // PKCE code challenge method
}

/**
 * OAuth2 authorization response (success)
 */
export interface OAuth2AuthorizationResponse {
  code: string;                      // Authorization code
  state?: string;                    // Client state (if provided in request)
}

/**
 * OAuth2 authorization error response
 */
export interface OAuth2ErrorResponse {
  error: string;                     // Error code
  error_description?: string;        // Human-readable error description
  error_uri?: string;                // URI with more information
  state?: string;                    // Client state (if provided in request)
}

/**
 * OAuth2 token request (authorization code flow)
 */
export interface OAuth2AuthorizationCodeTokenRequest {
  grant_type: 'authorization_code';
  code: string;                      // Authorization code
  redirect_uri: string;              // Redirect URI
  client_id: string;                 // Client ID
  client_secret?: string;            // Client secret (for confidential clients)
  code_verifier?: string;            // PKCE code verifier
}

/**
 * OAuth2 token request (client credentials flow)
 */
export interface OAuth2ClientCredentialsTokenRequest {
  grant_type: 'client_credentials';
  scope?: string;                    // Requested scopes (space-separated)
  client_id: string;                 // Client ID
  client_secret: string;             // Client secret
}

/**
 * OAuth2 token request (refresh token flow)
 */
export interface OAuth2RefreshTokenRequest {
  grant_type: 'refresh_token';
  refresh_token: string;             // Refresh token
  scope?: string;                    // Requested scopes (optional, must be subset of original)
  client_id: string;                 // Client ID
  client_secret?: string;            // Client secret (for confidential clients)
}

/**
 * OAuth2 token response
 */
export interface OAuth2TokenResponse {
  access_token: string;              // Access token
  token_type: string;                // Token type (Bearer)
  expires_in: number;                // Access token expiration in seconds
  refresh_token?: string;            // Refresh token (optional)
  scope?: string;                    // Granted scopes (space-separated)
}

/**
 * OAuth2 token revocation request
 */
export interface OAuth2RevokeTokenRequest {
  token: string;                     // Token to revoke (access or refresh)
  token_type_hint?: string;          // Token type hint (access_token or refresh_token)
  client_id: string;                 // Client ID
  client_secret?: string;            // Client secret (for confidential clients)
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
  clientSecret: string;              // Plain text client secret (only shown once)
}

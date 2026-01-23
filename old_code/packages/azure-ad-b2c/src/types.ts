/**
 * Azure AD B2C Configuration
 */
export interface AzureAdB2CConfig {
  /** Tenant name (e.g., 'castiel-auth') */
  tenantName: string;
  
  /** Tenant ID (GUID) */
  tenantId: string;
  
  /** Application (client) ID */
  clientId: string;
  
  /** Client secret */
  clientSecret: string;
  
  /** B2C domain (e.g., 'castiel-auth.b2clogin.com') */
  domain: string;
  
  /** Custom domain (optional, e.g., 'auth.castiel.com') */
  customDomain?: string;
  
  /** User flow/policy names */
  policies: {
    signUpSignIn: string;
    passwordReset: string;
    profileEdit: string;
  };
  
  /** Redirect URIs */
  redirectUri: string;
  postLogoutRedirectUri?: string;
  
  /** Scopes to request */
  scopes?: string[];
  
  /** Token validation options */
  validation?: {
    /** Clock skew in seconds (default: 300) */
    clockSkew?: number;
    
    /** Validate issuer (default: true) */
    validateIssuer?: boolean;
    
    /** Validate audience (default: true) */
    validateAudience?: boolean;
  };
}

/**
 * User flow types supported by Azure AD B2C
 */
export enum UserFlowType {
  SignUpSignIn = 'signUpSignIn',
  PasswordReset = 'passwordReset',
  ProfileEdit = 'profileEdit',
}

/**
 * OAuth provider types
 */
export enum OAuthProvider {
  Google = 'google',
  GitHub = 'github',
  Microsoft = 'microsoft',
}

/**
 * SAML identity provider configuration
 */
export interface SamlIdentityProvider {
  /** Provider name (e.g., 'Okta', 'Azure AD', 'Google Workspace') */
  name: string;
  
  /** Organization ID this provider is associated with */
  organizationId: string;
  
  /** SAML metadata URL or XML content */
  metadata: string;
  
  /** Whether metadata is URL (true) or XML content (false) */
  isMetadataUrl: boolean;
  
  /** Entity ID */
  entityId: string;
  
  /** Single sign-on endpoint */
  ssoEndpoint: string;
  
  /** Single logout endpoint (optional) */
  sloEndpoint?: string;
  
  /** Signing certificate */
  signingCertificate?: string;
  
  /** Whether to sign authentication requests */
  signAuthRequests?: boolean;
  
  /** Attribute mappings */
  attributeMappings?: {
    email?: string;
    givenName?: string;
    surname?: string;
    displayName?: string;
    groups?: string;
  };
}

/**
 * Token claims from Azure AD B2C
 */
export interface B2CTokenClaims {
  /** Token issuer */
  iss: string;
  
  /** Expiration time (Unix timestamp) */
  exp: number;
  
  /** Not before time (Unix timestamp) */
  nbf: number;
  
  /** Issued at time (Unix timestamp) */
  iat: number;
  
  /** Audience (client ID) */
  aud: string;
  
  /** Subject (user ID) */
  sub: string;
  
  /** User's object ID in B2C */
  oid: string;
  
  /** Email addresses */
  emails?: string[];
  
  /** Preferred username (email) */
  preferred_username?: string;
  
  /** Given name */
  given_name?: string;
  
  /** Family name */
  family_name?: string;
  
  /** Display name */
  name?: string;
  
  /** Identity provider */
  idp?: string;
  
  /** Job title */
  jobTitle?: string;
  
  /** Country/Region */
  country?: string;
  
  /** Trust framework policy (user flow) */
  tfp?: string;
  
  /** Authentication context class reference */
  acr?: string;
  
  /** Nonce for OIDC */
  nonce?: string;
  
  /** Authentication time */
  auth_time?: number;
  
  /** Token version */
  ver?: string;
  
  /** Custom claims */
  [key: string]: any;
}

/**
 * Authentication result from Azure AD B2C
 */
export interface B2CAuthenticationResult {
  /** Access token */
  accessToken: string;
  
  /** ID token */
  idToken: string;
  
  /** Refresh token (if offline_access scope requested) */
  refreshToken?: string;
  
  /** Token type (usually 'Bearer') */
  tokenType: string;
  
  /** Expiration time in seconds */
  expiresIn: number;
  
  /** Expires at timestamp */
  expiresOn: Date;
  
  /** Scopes granted */
  scopes: string[];
  
  /** User account information */
  account: {
    homeAccountId: string;
    environment: string;
    tenantId: string;
    username: string;
    localAccountId: string;
    name?: string;
    idTokenClaims?: B2CTokenClaims;
  };
}

/**
 * Authorization request parameters
 */
export interface AuthorizationRequest {
  /** Scopes to request */
  scopes: string[];
  
  /** Redirect URI */
  redirectUri: string;
  
  /** User flow/policy name */
  authority: string;
  
  /** State parameter for CSRF protection */
  state?: string;
  
  /** Nonce for OIDC */
  nonce?: string;
  
  /** Login hint (email) */
  loginHint?: string;
  
  /** Domain hint (for direct IDP routing) */
  domainHint?: string;
  
  /** Prompt type */
  prompt?: 'login' | 'consent' | 'select_account' | 'none';
  
  /** Extra query parameters */
  extraQueryParameters?: Record<string, string>;
}

/**
 * Token request parameters
 */
export interface TokenRequest {
  /** Authorization code */
  code: string;
  
  /** Redirect URI (must match authorization request) */
  redirectUri: string;
  
  /** Scopes */
  scopes: string[];
  
  /** User flow/policy name */
  authority: string;
}

/**
 * Refresh token request parameters
 */
export interface RefreshTokenRequest {
  /** Refresh token */
  refreshToken: string;
  
  /** Scopes */
  scopes: string[];
  
  /** User flow/policy name */
  authority: string;
}

/**
 * Silent token request parameters (using cached tokens)
 */
export interface SilentRequest {
  /** Account to acquire token for */
  account: {
    homeAccountId: string;
    environment: string;
    tenantId: string;
    username: string;
    localAccountId: string;
  };
  
  /** Scopes */
  scopes: string[];
  
  /** Force refresh */
  forceRefresh?: boolean;
  
  /** User flow/policy name */
  authority: string;
}

/**
 * User information from Azure AD B2C
 */
export interface B2CUserInfo {
  /** User's object ID */
  id: string;
  
  /** Email address */
  email: string;
  
  /** Email verified status */
  emailVerified?: boolean;
  
  /** Given name */
  givenName?: string;
  
  /** Family name */
  familyName?: string;
  
  /** Display name */
  displayName?: string;
  
  /** Identity provider used */
  identityProvider?: string;
  
  /** Job title */
  jobTitle?: string;
  
  /** Country/Region */
  country?: string;
  
  /** User principal name */
  userPrincipalName?: string;
  
  /** Creation timestamp */
  createdAt?: Date;
  
  /** Last sign-in timestamp */
  lastSignInAt?: Date;
}

/**
 * Organization SSO configuration
 */
export interface OrganizationSsoConfig {
  /** Organization ID */
  organizationId: string;
  
  /** Organization name */
  organizationName: string;
  
  /** Tenant ID this org belongs to */
  tenantId: string;
  
  /** SSO provider type */
  provider: 'okta' | 'azure-ad' | 'google-workspace' | 'custom-saml';
  
  /** Whether SSO is enabled */
  enabled: boolean;
  
  /** SAML configuration */
  samlConfig?: SamlIdentityProvider;
  
  /** Domain verification (for email-based routing) */
  verifiedDomains?: string[];
  
  /** Just-in-time provisioning settings */
  jitProvisioning?: {
    enabled: boolean;
    defaultRole?: string;
    attributeMappings?: Record<string, string>;
  };
  
  /** Created at timestamp */
  createdAt: Date;
  
  /** Updated at timestamp */
  updatedAt: Date;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  /** Whether token is valid */
  valid: boolean;
  
  /** Decoded token claims (if valid) */
  claims?: B2CTokenClaims;
  
  /** Validation error (if invalid) */
  error?: string;
  
  /** Error description */
  errorDescription?: string;
}

/**
 * Error codes from Azure AD B2C
 */
export enum B2CErrorCode {
  /** User cancelled the flow */
  USER_CANCELLED = 'AADB2C90091',
  
  /** User forgot password */
  PASSWORD_RESET_REQUIRED = 'AADB2C90118',
  
  /** Invalid authorization code */
  INVALID_GRANT = 'invalid_grant',
  
  /** Invalid client credentials */
  UNAUTHORIZED_CLIENT = 'unauthorized_client',
  
  /** Invalid redirect URI */
  INVALID_REDIRECT_URI = 'invalid_redirect_uri',
  
  /** Invalid scope */
  INVALID_SCOPE = 'invalid_scope',
  
  /** Server error */
  SERVER_ERROR = 'server_error',
  
  /** Temporarily unavailable */
  TEMPORARILY_UNAVAILABLE = 'temporarily_unavailable',
  
  /** Interaction required */
  INTERACTION_REQUIRED = 'interaction_required',
  
  /** Login required */
  LOGIN_REQUIRED = 'login_required',
}

/**
 * B2C error response
 */
export interface B2CErrorResponse {
  /** Error code */
  error: string;
  
  /** Error description */
  errorDescription: string;
  
  /** Error codes array */
  errorCodes?: number[];
  
  /** Timestamp */
  timestamp?: string;
  
  /** Trace ID for debugging */
  traceId?: string;
  
  /** Correlation ID */
  correlationId?: string;
}

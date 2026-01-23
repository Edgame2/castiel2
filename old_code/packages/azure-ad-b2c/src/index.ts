// Core client
export { AzureAdB2CClient } from './client.js';

// Token validator
export { B2CTokenValidator } from './validator.js';

// Types and interfaces
export type {
  AzureAdB2CConfig,
  B2CTokenClaims,
  B2CAuthenticationResult,
  B2CUserInfo,
  AuthorizationRequest,
  TokenRequest,
  RefreshTokenRequest,
  SilentRequest,
  TokenValidationResult,
  SamlIdentityProvider,
  OrganizationSsoConfig,
  B2CErrorResponse,
} from './types.js';

// Enums
export { UserFlowType, OAuthProvider, B2CErrorCode } from './types.js';

/**
 * Integration Connection Types
 * Types for managing integration connections and OAuth flows
 */

export interface OAuthState {
  integrationId: string;
  tenantId: string;
  userId: string;
  returnUrl: string;
  nonce: string;
  codeVerifier?: string;
  expiresAt: Date;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string[];
}

export interface ConnectionCredentials {
  type: 'oauth2' | 'api_key' | 'basic' | 'custom' | 'service_account';
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string[];
  apiKey?: string;
  username?: string;
  password?: string;
  /** For service_account: JSON key object (client_email, private_key, etc.) */
  data?: Record<string, any>;
}

export interface IntegrationConnection {
  id: string;
  integrationId: string; // Reference to integration instance
  tenantId?: string;
  userId?: string;
  scope: 'system' | 'tenant' | 'user';
  authType: 'oauth' | 'apikey' | 'serviceaccount' | 'basic';
  credentialSecretName: string; // Reference to Secret Management
  oauth?: {
    accessTokenSecretName: string;
    refreshTokenSecretName?: string;
    tokenType: string;
    expiresAt?: Date;
    scope?: string[];
  };
  status: 'active' | 'expired' | 'revoked' | 'error';
  lastValidatedAt?: Date;
  displayName?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConnectionInput {
  integrationId: string;
  tenantId: string;
  userId: string;
  credentials: ConnectionCredentials;
  displayName?: string;
  /** When set (e.g. to integration.id), connection document uses this id so adapter can resolve by integrationId */
  connectionId?: string;
}

export interface UpdateConnectionInput {
  credentials?: ConnectionCredentials;
  displayName?: string;
  status?: 'active' | 'expired' | 'revoked' | 'error';
}

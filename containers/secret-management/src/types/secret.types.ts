/**
 * Secret Management Type Definitions
 * 
 * All type definitions for secret values, metadata, and operations
 */

// ============================================================================
// SECRET VALUE TYPES
// ============================================================================

/**
 * Base secret value interface
 */
export interface SecretValue {
  type: SecretType;
}

/**
 * API Key (simple string)
 */
export interface ApiKeySecret extends SecretValue {
  type: 'API_KEY';
  key: string;
}

/**
 * OAuth2 Token
 */
export interface OAuth2TokenSecret extends SecretValue {
  type: 'OAUTH2_TOKEN';
  accessToken: string;
  refreshToken?: string;
  tokenType: string;           // e.g., "Bearer"
  expiresAt?: Date;
  scope?: string;
}

/**
 * Username/Password
 */
export interface UsernamePasswordSecret extends SecretValue {
  type: 'USERNAME_PASSWORD';
  username: string;
  password: string;
}

/**
 * Certificate
 */
export interface CertificateSecret extends SecretValue {
  type: 'CERTIFICATE';
  certificate: string;         // PEM-encoded certificate
  privateKey?: string;         // PEM-encoded private key
  chain?: string[];            // Certificate chain
  passphrase?: string;
  expiresAt?: Date;
}

/**
 * SSH Key
 */
export interface SshKeySecret extends SecretValue {
  type: 'SSH_KEY';
  privateKey: string;
  publicKey?: string;
  passphrase?: string;
  keyType: 'rsa' | 'ed25519' | 'ecdsa';
}

/**
 * Connection String
 */
export interface ConnectionStringSecret extends SecretValue {
  type: 'CONNECTION_STRING';
  connectionString: string;
  // Optionally parsed components
  parsed?: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    // password NOT stored separately - use connection string
  };
}

/**
 * JSON Credential (e.g., GCP service account)
 */
export interface JsonCredentialSecret extends SecretValue {
  type: 'JSON_CREDENTIAL';
  credential: Record<string, unknown>;
}

/**
 * Environment Variable Set
 */
export interface EnvVariableSetSecret extends SecretValue {
  type: 'ENV_VARIABLE_SET';
  variables: Record<string, string>;
}

/**
 * Generic Secret
 */
export interface GenericSecret extends SecretValue {
  type: 'GENERIC';
  value: string;
}

/**
 * Union type for all secret values
 */
export type AnySecretValue =
  | ApiKeySecret
  | OAuth2TokenSecret
  | UsernamePasswordSecret
  | CertificateSecret
  | SshKeySecret
  | ConnectionStringSecret
  | JsonCredentialSecret
  | EnvVariableSetSecret
  | GenericSecret;

// ============================================================================
// SECRET TYPE ENUMS
// ============================================================================

export type SecretType =
  | 'API_KEY'
  | 'OAUTH2_TOKEN'
  | 'USERNAME_PASSWORD'
  | 'CERTIFICATE'
  | 'SSH_KEY'
  | 'CONNECTION_STRING'
  | 'JSON_CREDENTIAL'
  | 'ENV_VARIABLE_SET'
  | 'GENERIC';

export type StorageBackend =
  | 'LOCAL_ENCRYPTED'
  | 'AZURE_KEY_VAULT'
  | 'AWS_SECRETS_MANAGER'
  | 'HASHICORP_VAULT'
  | 'GCP_SECRET_MANAGER';

export type SecretScope =
  | 'GLOBAL'
  | 'ORGANIZATION'
  | 'TEAM'
  | 'PROJECT'
  | 'USER';

// ============================================================================
// SECRET METADATA
// ============================================================================

export interface SecretMetadata {
  id: string;
  name: string;
  description?: string;
  type: SecretType;
  scope: SecretScope;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  userId?: string;
  storageBackend: StorageBackend;
  tags: string[];
  metadata?: Record<string, unknown>;
  
  // Lifecycle
  expiresAt?: Date;
  rotationEnabled: boolean;
  rotationIntervalDays?: number;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
  
  // Versioning
  currentVersion: number;
  
  // Soft delete
  deletedAt?: Date;
  deletedById?: string;
  recoveryDeadline?: Date;
  
  // Audit
  createdAt: Date;
  createdById: string;
  updatedAt: Date;
  updatedById?: string;
}

// ============================================================================
// SECRET CONTEXT
// ============================================================================

export interface SecretContext {
  userId: string;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  
  // Consumer identification (for tracking)
  consumerModule: string;       // e.g., "mcp-server", "llm-model"
  consumerResourceId?: string;  // e.g., specific MCP server ID
}

export interface ScopeContext {
  userId: string;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
}

// ============================================================================
// SECRET OPERATION PARAMETERS
// ============================================================================

export interface CreateSecretParams {
  name: string;
  description?: string;
  type: SecretType;
  value: AnySecretValue;
  scope: SecretScope;
  
  // Scope target (based on scope)
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  
  // Lifecycle
  expiresAt?: Date;
  rotationEnabled?: boolean;
  rotationIntervalDays?: number;
  
  // Metadata
  tags?: string[];
  metadata?: Record<string, unknown>;
  
  // Storage preference
  storageBackend?: StorageBackend;
}

export interface UpdateSecretParams {
  description?: string;
  value?: AnySecretValue;
  expiresAt?: Date;
  rotationEnabled?: boolean;
  rotationIntervalDays?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export interface ListSecretsParams {
  scope?: SecretScope;
  type?: SecretType;
  tags?: string[];
  search?: string;
  includeDeleted?: boolean;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface SecretSearchCriteria {
  scope?: SecretScope;
  type?: SecretType;
  tags?: string[];
  search?: string;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  userId?: string;
  expiresBefore?: Date;
  expiresAfter?: Date;
  rotationEnabled?: boolean;
  storageBackend?: StorageBackend;
}

// ============================================================================
// ACCESS MANAGEMENT
// ============================================================================

export type GranteeType = 'USER' | 'TEAM' | 'ROLE';

export interface GrantAccessParams {
  secretId: string;
  granteeType: GranteeType;
  granteeId: string;
  permissions: {
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canGrant: boolean;
  };
  expiresAt?: Date;
}

export interface SecretAccessGrant {
  id: string;
  secretId: string;
  granteeType: GranteeType;
  userId?: string;
  teamId?: string;
  roleId?: string;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canGrant: boolean;
  expiresAt?: Date;
  grantedAt: Date;
  grantedById: string;
}

// ============================================================================
// VERSIONING
// ============================================================================

export interface SecretVersionInfo {
  version: number;
  isActive: boolean;
  changeReason?: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name?: string;
  };
}

// ============================================================================
// SECRET ACTION TYPES
// ============================================================================

export type SecretAction = 'READ' | 'UPDATE' | 'DELETE' | 'GRANT' | 'VIEW_METADATA';

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}

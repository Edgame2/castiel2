/**
 * Backend Storage Type Definitions
 * 
 * Interfaces for storage backend abstraction
 */

import { AnySecretValue, StorageBackend } from './secret.types';

// ============================================================================
// BACKEND INTERFACE
// ============================================================================

export interface SecretStorageBackend {
  // Backend identification
  readonly type: StorageBackend;
  readonly name: string;
  
  // Lifecycle
  initialize(config: BackendConfig): Promise<void>;
  healthCheck(): Promise<HealthCheckResult>;
  
  // CRUD Operations
  storeSecret(params: StoreSecretParams): Promise<StoreSecretResult>;
  retrieveSecret(params: RetrieveSecretParams): Promise<RetrieveSecretResult>;
  updateSecret(params: UpdateSecretParams): Promise<UpdateSecretResult>;
  deleteSecret(params: DeleteSecretParams): Promise<void>;
  
  // Versioning
  listVersions(secretRef: string): Promise<SecretVersionInfo[]>;
  retrieveVersion(secretRef: string, version: number): Promise<RetrieveSecretResult>;
  
  // Listing (metadata only)
  listSecrets(params: ListSecretsParams): Promise<BackendSecretMetadata[]>;
}

// ============================================================================
// BACKEND CONFIGURATION
// ============================================================================

export type BackendConfig =
  | LocalBackendConfig
  | AzureKeyVaultConfig
  | AWSSecretsConfig
  | HashiCorpVaultConfig
  | GCPSecretConfig;

export interface LocalBackendConfig {
  type: 'LOCAL_ENCRYPTED';
  // No additional config needed - uses database
}

export interface AzureKeyVaultConfig {
  type: 'AZURE_KEY_VAULT';
  vaultUrl: string;            // e.g., "https://my-vault.vault.azure.net"
  
  // Authentication (one of these)
  authentication:
    | { type: 'managed_identity' }
    | { type: 'service_principal'; tenantId: string; clientId: string; clientSecret: string }
    | { type: 'certificate'; tenantId: string; clientId: string; certificatePath: string };
}

export interface AWSSecretsConfig {
  type: 'AWS_SECRETS_MANAGER';
  region: string;
  
  // Authentication
  authentication:
    | { type: 'iam_role' }
    | { type: 'access_key'; accessKeyId: string; secretAccessKey: string };
  
  // Optional KMS key for encryption
  kmsKeyId?: string;
}

export interface HashiCorpVaultConfig {
  type: 'HASHICORP_VAULT';
  address: string;             // e.g., "https://vault.example.com:8200"
  namespace?: string;
  
  // Authentication
  authentication:
    | { type: 'token'; token: string }
    | { type: 'approle'; roleId: string; secretId: string }
    | { type: 'kubernetes'; role: string; jwt?: string };
  
  // Secret engine
  secretEngine: string;        // e.g., "secret" (KV v2)
  secretEnginePath: string;    // e.g., "data"
}

export interface GCPSecretConfig {
  type: 'GCP_SECRET_MANAGER';
  projectId: string;
  
  // Authentication
  authentication:
    | { type: 'default_credentials' }
    | { type: 'service_account'; keyFilePath: string }
    | { type: 'service_account_json'; credentials: object };
}

// ============================================================================
// BACKEND OPERATION PARAMETERS
// ============================================================================

export interface StoreSecretParams {
  name: string;
  value: AnySecretValue;
  metadata?: Record<string, string>;
  expiresAt?: Date;
}

export interface StoreSecretResult {
  secretRef: string;           // Backend-specific reference
  version: number;
}

export interface RetrieveSecretParams {
  secretRef: string;           // Backend-specific reference
}

export interface RetrieveSecretResult {
  value: AnySecretValue;
  version: number;
  metadata?: Record<string, string>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface UpdateSecretParams {
  secretRef: string;
  value: AnySecretValue;
  metadata?: Record<string, string>;
  expiresAt?: Date;
}

export interface UpdateSecretResult {
  version: number;
}

export interface DeleteSecretParams {
  secretRef: string;
}

export interface ListSecretsParams {
  prefix?: string;
  limit?: number;
  offset?: number;
}

export interface BackendSecretMetadata {
  name: string;
  secretRef: string;
  version: number;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, string>;
}

export interface SecretVersionInfo {
  version: number;
  createdAt: Date;
  isActive: boolean;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'unknown';
  message?: string;
  lastCheck: Date;
  latencyMs?: number;
}

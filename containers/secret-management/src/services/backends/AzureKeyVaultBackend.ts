/**
 * Azure Key Vault Backend
 * 
 * Implements SecretStorageBackend for Azure Key Vault integration.
 */

import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential, ClientSecretCredential, ClientCertificateCredential } from '@azure/identity';
import { readFileSync } from 'fs';
import {
  SecretStorageBackend,
  StoreSecretParams,
  StoreSecretResult,
  RetrieveSecretParams,
  RetrieveSecretResult,
  UpdateSecretParams,
  UpdateSecretResult,
  DeleteSecretParams,
  ListSecretsParams,
  BackendSecretMetadata,
  SecretVersionInfo,
  HealthCheckResult,
  BackendConfig,
  AzureKeyVaultConfig,
} from '../../types/backend.types';
import { VaultConnectionError, EncryptionError, DecryptionError, SecretNotFoundError } from '../../errors/SecretErrors';
import { AnySecretValue } from '../../types';

// AzureKeyVaultConfig is defined in backend.types.ts

export class AzureKeyVaultBackend implements SecretStorageBackend {
  readonly type = 'AZURE_KEY_VAULT';
  readonly name = 'Azure Key Vault';
  
  private client: SecretClient | null = null;
  private config: AzureKeyVaultConfig | null = null;
  
  /**
   * Initialize Azure Key Vault backend
   */
  async initialize(config: BackendConfig): Promise<void> {
    const azureConfig = config as AzureKeyVaultConfig;
    
    if (!azureConfig.vaultUrl) {
      throw new VaultConnectionError('azure-key-vault', 'Azure Key Vault URL is required');
    }
    
    try {
      // Create credential based on authentication type
      let credential;
      
      if (azureConfig.authentication.type === 'managed_identity') {
        credential = new DefaultAzureCredential();
      } else if (azureConfig.authentication.type === 'service_principal') {
        credential = new ClientSecretCredential(
          azureConfig.authentication.tenantId,
          azureConfig.authentication.clientId,
          azureConfig.authentication.clientSecret
        );
      } else if (azureConfig.authentication.type === 'certificate') {
        // Certificate-based authentication
        try {
          const certificate = readFileSync(azureConfig.authentication.certificatePath, 'utf8');
          credential = new ClientCertificateCredential(
            azureConfig.authentication.tenantId,
            azureConfig.authentication.clientId,
            certificate
          );
        } catch (error: any) {
          throw new VaultConnectionError(
            azureConfig.vaultUrl,
            `Failed to load certificate from ${azureConfig.authentication.certificatePath}: ${error.message}`
          );
        }
      } else {
        throw new VaultConnectionError(azureConfig.vaultUrl, `Unknown authentication type: ${(azureConfig.authentication as any).type}`);
      }
      
      // Create Secret Client
      this.client = new SecretClient(azureConfig.vaultUrl, credential);
      
      // Test connection by attempting to list secrets (with limit)
      try {
        await this.client.listPropertiesOfSecrets().next();
      } catch (error: any) {
        throw new VaultConnectionError(azureConfig.vaultUrl, `Failed to connect to Azure Key Vault: ${error.message}`);
      }
      
      this.config = azureConfig;
    } catch (error: any) {
      if (error instanceof VaultConnectionError) {
        throw error;
      }
      throw new VaultConnectionError(azureConfig.vaultUrl || 'unknown', `Failed to initialize Azure Key Vault: ${error.message}`);
    }
  }
  
  /**
   * Store secret in Azure Key Vault
   */
  async storeSecret(params: StoreSecretParams): Promise<StoreSecretResult> {
    if (!this.client || !this.config) {
      throw new VaultConnectionError(this.config?.vaultUrl || 'unknown', 'Azure Key Vault backend not initialized');
    }
    
    try {
      const secretName = this.normalizeSecretName(params.name);
      const secretValue = typeof params.value === 'string' ? params.value : JSON.stringify(params.value);
      
      const result = await this.client.setSecret(secretName, secretValue, {
        enabled: true,
        contentType: params.metadata?.type === 'JSON_CREDENTIAL' || params.metadata?.type === 'ENV_VARIABLE_SET' ? 'application/json' : 'text/plain',
        tags: params.metadata || {},
        expiresOn: params.expiresAt,
      });
      
      return {
        secretRef: result.name || secretName,
        version: 1, // Azure Key Vault versions are strings, we'll track as incrementing numbers
      };
    } catch (error: any) {
      throw new EncryptionError(`Failed to store secret in Azure Key Vault: ${error.message}`);
    }
  }
  
  /**
   * Retrieve secret from Azure Key Vault
   */
  async retrieveSecret(params: RetrieveSecretParams): Promise<RetrieveSecretResult> {
    if (!this.client || !this.config) {
      throw new VaultConnectionError(this.config?.vaultUrl || 'unknown', 'Azure Key Vault backend not initialized');
    }
    
    try {
      const secretName = params.secretRef;
      const secret = await this.client.getSecret(secretName);
      
      if (!secret.value) {
        throw new SecretNotFoundError(secretName);
      }
      
      // Parse value based on content type or try JSON first, fallback to string
      const value = this.parseSecretValue(secret.value, secret.properties.contentType);
      
      return {
        value,
        version: 1, // Azure versions are strings, we track as numbers
        metadata: secret.properties.tags || {},
        createdAt: secret.properties.createdOn || new Date(),
        expiresAt: secret.properties.expiresOn || undefined,
      };
    } catch (error: any) {
      if (error instanceof SecretNotFoundError) {
        throw error;
      }
      throw new DecryptionError(`Failed to retrieve secret from Azure Key Vault: ${error.message}`);
    }
  }
  
  /**
   * Update secret in Azure Key Vault
   */
  async updateSecret(params: UpdateSecretParams): Promise<UpdateSecretResult> {
    if (!this.client || !this.config) {
      throw new VaultConnectionError(this.config?.vaultUrl || 'unknown', 'Azure Key Vault backend not initialized');
    }
    
    // Azure Key Vault creates a new version on update
    const result = await this.storeSecret({
      name: params.secretRef,
      value: params.value,
      metadata: params.metadata,
      expiresAt: params.expiresAt,
    });
    
    return {
      version: result.version,
    };
  }
  
  /**
   * Delete secret from Azure Key Vault
   */
  async deleteSecret(params: DeleteSecretParams): Promise<void> {
    if (!this.client || !this.config) {
      throw new VaultConnectionError(this.config?.vaultUrl || 'unknown', 'Azure Key Vault backend not initialized');
    }
    
    try {
      const secretName = params.secretRef;
      await this.client.beginDeleteSecret(secretName);
    } catch (error: any) {
      // Ignore if secret doesn't exist
      if (error.statusCode === 404) {
        return;
      }
      throw new Error(`Failed to delete secret from Azure Key Vault: ${error.message}`);
    }
  }
  
  /**
   * List secrets from Azure Key Vault
   */
  async listSecrets(params: ListSecretsParams = {}): Promise<BackendSecretMetadata[]> {
    if (!this.client || !this.config) {
      throw new VaultConnectionError(this.config?.vaultUrl || 'unknown', 'Azure Key Vault backend not initialized');
    }
    
    try {
      const secrets: BackendSecretMetadata[] = [];
      let count = 0;
      const limit = params.limit || 100;
      const offset = params.offset || 0;
      
      for await (const secretProperties of this.client.listPropertiesOfSecrets()) {
        if (count < offset) {
          count++;
          continue;
        }
        
        if (secrets.length >= limit) {
          break;
        }
        
        if (secretProperties.name) {
          // Check prefix filter if provided
          if (params.prefix && !secretProperties.name.startsWith(params.prefix)) {
            continue;
          }
          
          secrets.push({
            name: secretProperties.name,
            secretRef: secretProperties.name,
            version: 1, // Azure versions are strings, we track as numbers
            createdAt: secretProperties.createdOn || new Date(),
            expiresAt: secretProperties.expiresOn || undefined,
            metadata: secretProperties.tags || {},
          });
        }
        
        count++;
      }
      
      return secrets;
    } catch (error: any) {
      throw new Error(`Failed to list secrets from Azure Key Vault: ${error.message}`);
    }
  }
  
  /**
   * Get secret versions
   */
  async listVersions(secretRef: string): Promise<SecretVersionInfo[]> {
    if (!this.client || !this.config) {
      throw new VaultConnectionError(this.config?.vaultUrl || 'unknown', 'Azure Key Vault backend not initialized');
    }
    
    try {
      const secretName = secretRef;
      const versions: SecretVersionInfo[] = [];
      let versionNum = 1;
      
      for await (const versionProperties of this.client.listPropertiesOfSecretVersions(secretName)) {
        versions.push({
          version: versionNum++,
          createdAt: versionProperties.createdOn || new Date(),
          isActive: versionProperties.enabled !== false,
        });
      }
      
      return versions;
    } catch (error: any) {
      throw new Error(`Failed to list secret versions from Azure Key Vault: ${error.message}`);
    }
  }
  
  /**
   * Get specific version
   */
  async retrieveVersion(secretRef: string, version: number): Promise<RetrieveSecretResult> {
    if (!this.client || !this.config) {
      throw new VaultConnectionError(this.config?.vaultUrl || 'unknown', 'Azure Key Vault backend not initialized');
    }
    
    try {
      const secretName = secretRef;
      const versions: string[] = [];
      
      for await (const versionProperties of this.client.listPropertiesOfSecretVersions(secretName)) {
        if (versionProperties.version) {
          versions.push(versionProperties.version);
        }
      }
      
      if (version < 1 || version > versions.length) {
        throw new SecretNotFoundError(`${secretRef} version ${version}`);
      }
      
      const versionId = versions[version - 1];
      const secret = await this.client.getSecret(secretName, { version: versionId });
      
      if (!secret.value) {
        throw new SecretNotFoundError(`${secretRef} version ${version}`);
      }
      
      // Parse value based on content type or try JSON first, fallback to string
      const value = this.parseSecretValue(secret.value, secret.properties.contentType);
      
      return {
        value,
        version,
        metadata: secret.properties.tags || {},
        createdAt: secret.properties.createdOn || new Date(),
        expiresAt: secret.properties.expiresOn || undefined,
      };
    } catch (error: any) {
      if (error instanceof SecretNotFoundError) {
        throw error;
      }
      throw new DecryptionError(`Failed to retrieve secret version from Azure Key Vault: ${error.message}`);
    }
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.client) {
      return {
        status: 'unhealthy',
        message: 'Backend not initialized',
        lastCheck: new Date(),
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Try to list secrets to verify connection
      await this.client.listPropertiesOfSecrets().next();
      const latencyMs = Date.now() - startTime;
      
      return {
        status: 'healthy',
        lastCheck: new Date(),
        latencyMs,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        message: error.message,
        lastCheck: new Date(),
        latencyMs,
      };
    }
  }
  
  /**
   * Parse secret value from Azure Key Vault
   * Handles JSON and plain text values based on content type
   */
  private parseSecretValue(value: string, contentType?: string): AnySecretValue {
    if (contentType === 'application/json') {
      try {
        return JSON.parse(value) as AnySecretValue;
      } catch (e) {
        // Fallback to generic if JSON parsing fails
      }
    }
    
    // Try JSON parsing for non-JSON content type (backward compatibility)
    try {
      return JSON.parse(value) as AnySecretValue;
    } catch {
      // Fallback to generic string value
      return { type: 'GENERIC', value: value } as AnySecretValue;
    }
  }
  
  /**
   * Normalize secret name for Azure Key Vault
   * Azure Key Vault names must be 1-127 characters, alphanumeric and hyphens only
   */
  private normalizeSecretName(secretId: string): string {
    // Replace invalid characters with hyphens
    let normalized = secretId.replace(/[^a-zA-Z0-9-]/g, '-');
    
    // Remove consecutive hyphens
    normalized = normalized.replace(/-+/g, '-');
    
    // Remove leading/trailing hyphens
    normalized = normalized.replace(/^-+|-+$/g, '');
    
    // Ensure length is within Azure limits
    if (normalized.length > 127) {
      normalized = normalized.substring(0, 127);
    }
    
    // Ensure it's not empty
    if (!normalized) {
      normalized = `secret-${secretId.substring(0, 20)}`;
    }
    
    return normalized;
  }
  
  /**
   * Denormalize secret name (reverse of normalize)
   * Note: This is a best-effort approach as Azure Key Vault normalization is lossy
   */
  private denormalizeSecretName(azureName: string): string {
    // Since normalization is lossy, we can't fully reverse it
    // Return as-is for now - in production, you'd want to store a mapping
    return azureName;
  }
}

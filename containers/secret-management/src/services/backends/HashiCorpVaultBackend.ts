/**
 * HashiCorp Vault Backend
 * 
 * Implements SecretStorageBackend for HashiCorp Vault integration.
 */

import vault from 'node-vault';
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
  HashiCorpVaultConfig,
} from '../../types/backend.types';
import { VaultConnectionError, EncryptionError, DecryptionError, SecretNotFoundError } from '../../errors/SecretErrors';
import { AnySecretValue } from '../../types';

export class HashiCorpVaultBackend implements SecretStorageBackend {
  readonly type = 'HASHICORP_VAULT';
  readonly name = 'HashiCorp Vault';
  
  private vaultClient: vault.client | null = null;
  private config: HashiCorpVaultConfig | null = null;
  private secretEngine: string;
  private secretEnginePath: string;
  
  /**
   * Initialize HashiCorp Vault backend
   */
  async initialize(config: BackendConfig): Promise<void> {
    const vaultConfig = config as HashiCorpVaultConfig;
    
    if (!vaultConfig.address) {
      throw new VaultConnectionError('hashicorp-vault', 'Vault address is required');
    }
    
    if (!vaultConfig.secretEngine) {
      throw new VaultConnectionError('hashicorp-vault', 'Secret engine is required');
    }
    
    this.secretEngine = vaultConfig.secretEngine;
    this.secretEnginePath = vaultConfig.secretEnginePath || 'data';
    
    try {
      // Create Vault client
      const clientOptions: any = {
        apiVersion: 'v1',
        endpoint: vaultConfig.address,
        namespace: vaultConfig.namespace,
      };
      
      this.vaultClient = vault(clientOptions);
      
      // Authenticate based on authentication type
      if (vaultConfig.authentication.type === 'token') {
        this.vaultClient.token = vaultConfig.authentication.token;
      } else if (vaultConfig.authentication.type === 'approle') {
        // Authenticate using AppRole
        const roleId = vaultConfig.authentication.roleId;
        const secretId = vaultConfig.authentication.secretId;
        
        const authResponse = await this.vaultClient.approleLogin({
          role_id: roleId,
          secret_id: secretId,
        });
        
        if (authResponse.auth?.client_token) {
          this.vaultClient.token = authResponse.auth.client_token;
        } else {
          throw new VaultConnectionError(vaultConfig.address, 'Failed to authenticate with AppRole');
        }
      } else if (vaultConfig.authentication.type === 'kubernetes') {
        // Authenticate using Kubernetes
        const role = vaultConfig.authentication.role;
        const jwt = vaultConfig.authentication.jwt || process.env.KUBERNETES_SERVICE_ACCOUNT_TOKEN;
        
        if (!jwt) {
          throw new VaultConnectionError(vaultConfig.address, 'Kubernetes JWT token is required');
        }
        
        const authResponse = await this.vaultClient.kubernetesLogin({
          role: role,
          jwt: jwt,
        });
        
        if (authResponse.auth?.client_token) {
          this.vaultClient.token = authResponse.auth.client_token;
        } else {
          throw new VaultConnectionError(vaultConfig.address, 'Failed to authenticate with Kubernetes');
        }
      }
      
      // Test connection by checking if we can read from the secret engine
      try {
        await this.vaultClient.read(`${this.secretEngine}/metadata`);
      } catch (error: any) {
        // If metadata endpoint doesn't exist, try to write a test secret
        // This is expected for KV v1 engines
        try {
          await this.vaultClient.write(`${this.secretEngine}/test-connection`, { test: 'connection' });
          await this.vaultClient.delete(`${this.secretEngine}/test-connection`);
        } catch (testError: any) {
          throw new VaultConnectionError(vaultConfig.address, `Failed to connect to Vault: ${testError.message}`);
        }
      }
      
      this.config = vaultConfig;
    } catch (error: any) {
      if (error instanceof VaultConnectionError) {
        throw error;
      }
      throw new VaultConnectionError(vaultConfig.address || 'unknown', `Failed to initialize HashiCorp Vault: ${error.message}`);
    }
  }
  
  /**
   * Store a secret
   */
  async storeSecret(params: StoreSecretParams): Promise<StoreSecretResult> {
    if (!this.vaultClient || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      // Convert secret value to flat key-value pairs for Vault
      // Vault KV engine stores data as key-value pairs
      const vaultData: Record<string, string> = {};
      
      if (typeof params.value === 'string') {
        vaultData.value = params.value;
      } else if (typeof params.value === 'object') {
        // Flatten object to key-value pairs
        for (const [key, value] of Object.entries(params.value)) {
          vaultData[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
      } else {
        vaultData.value = String(params.value);
      }
      
      // Add metadata if provided
      if (params.metadata) {
        for (const [key, value] of Object.entries(params.metadata)) {
          vaultData[`_metadata_${key}`] = String(value);
        }
      }
      
      // Determine path based on secret engine type
      const path = this.secretEnginePath === 'data' 
        ? `${this.secretEngine}/data/${params.name}`  // KV v2
        : `${this.secretEngine}/${params.name}`;      // KV v1
      
      // Write secret
      if (this.secretEnginePath === 'data') {
        // KV v2 format
        await this.vaultClient.write(path, {
          data: vaultData,
        });
      } else {
        // KV v1 format
        await this.vaultClient.write(path, vaultData);
      }
      
      return {
        secretRef: params.name,
        version: 1,
      };
    } catch (error: any) {
      throw new EncryptionError(`Failed to store secret in HashiCorp Vault: ${error.message}`);
    }
  }
  
  /**
   * Retrieve a secret
   */
  async retrieveSecret(params: RetrieveSecretParams): Promise<RetrieveSecretResult> {
    if (!this.vaultClient || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      const path = this.secretEnginePath === 'data'
        ? `${this.secretEngine}/data/${params.secretRef}`  // KV v2
        : `${this.secretEngine}/${params.secretRef}`;      // KV v1
      
      const response = await this.vaultClient.read(path);
      
      if (!response.data) {
        throw new SecretNotFoundError(params.secretRef);
      }
      
      // Extract data based on engine type
      const vaultData = this.secretEnginePath === 'data' 
        ? (response.data as any).data || response.data
        : response.data;
      
      // Reconstruct secret value
      let value: AnySecretValue;
      
      // Check if it's a simple value or object
      if (vaultData.value && Object.keys(vaultData).length === 1) {
        // Simple string value
        value = vaultData.value;
      } else {
        // Object value - reconstruct
        const reconstructed: Record<string, any> = {};
        const metadata: Record<string, string> = {};
        
        for (const [key, val] of Object.entries(vaultData)) {
          if (key.startsWith('_metadata_')) {
            metadata[key.replace('_metadata_', '')] = String(val);
          } else {
            // Try to parse JSON, otherwise use as string
            try {
              reconstructed[key] = JSON.parse(String(val));
            } catch {
              reconstructed[key] = val;
            }
          }
        }
        
        value = Object.keys(metadata).length > 0 
          ? { ...reconstructed, _metadata: metadata }
          : reconstructed;
      }
      
      // Extract metadata
      const metadata: Record<string, string> = {};
      if (this.secretEnginePath === 'data' && (response.data as any).metadata) {
        const meta = (response.data as any).metadata;
        if (meta.created_time) {
          metadata.created_time = meta.created_time;
        }
        if (meta.version) {
          metadata.version = String(meta.version);
        }
      }
      
      return {
        value,
        version: this.secretEnginePath === 'data' 
          ? (response.data as any).metadata?.version || 1
          : 1,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        createdAt: this.secretEnginePath === 'data' && (response.data as any).metadata?.created_time
          ? new Date((response.data as any).metadata.created_time)
          : new Date(),
        expiresAt: undefined,
      };
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        throw new SecretNotFoundError(params.secretRef);
      }
      throw new DecryptionError(`Failed to retrieve secret from HashiCorp Vault: ${error.message}`);
    }
  }
  
  /**
   * Update a secret
   */
  async updateSecret(params: UpdateSecretParams): Promise<UpdateSecretResult> {
    if (!this.vaultClient || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      // Same as store for Vault (write is idempotent)
      await this.storeSecret({
        name: params.secretRef,
        value: params.value,
        metadata: params.metadata,
        expiresAt: params.expiresAt,
      });
      
      return {
        version: 1, // Vault handles versioning internally for KV v2
      };
    } catch (error: any) {
      if (error instanceof SecretNotFoundError) {
        throw error;
      }
      throw new EncryptionError(`Failed to update secret in HashiCorp Vault: ${error.message}`);
    }
  }
  
  /**
   * Delete a secret
   */
  async deleteSecret(params: DeleteSecretParams): Promise<void> {
    if (!this.vaultClient || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      const path = this.secretEnginePath === 'data'
        ? `${this.secretEngine}/data/${params.secretRef}`  // KV v2
        : `${this.secretEngine}/${params.secretRef}`;      // KV v1
      
      if (this.secretEnginePath === 'data') {
        // KV v2: Delete metadata (soft delete) or data (hard delete)
        await this.vaultClient.delete(path);
      } else {
        // KV v1: Direct delete
        await this.vaultClient.delete(path);
      }
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        // Secret already deleted, consider it success
        return;
      }
      throw new Error(`Failed to delete secret from HashiCorp Vault: ${error.message}`);
    }
  }
  
  /**
   * List secrets (metadata only)
   */
  async listSecrets(params: ListSecretsParams): Promise<BackendSecretMetadata[]> {
    if (!this.vaultClient || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      const path = this.secretEnginePath === 'data'
        ? `${this.secretEngine}/metadata`  // KV v2
        : `${this.secretEngine}`;          // KV v1
      
      const response = await this.vaultClient.list(path);
      
      if (!response.data || !response.data.keys) {
        return [];
      }
      
      const secrets: BackendSecretMetadata[] = [];
      const keys = response.data.keys as string[];
      
      for (const key of keys) {
        // Filter by prefix if provided
        if (params.prefix && !key.startsWith(params.prefix)) {
          continue;
        }
        
        // Limit results
        if (params.limit && secrets.length >= params.limit) {
          break;
        }
        
        secrets.push({
          name: key,
          secretRef: key,
          version: 1,
          createdAt: new Date(),
          expiresAt: undefined,
        });
      }
      
      return secrets;
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        return [];
      }
      throw new Error(`Failed to list secrets from HashiCorp Vault: ${error.message}`);
    }
  }
  
  /**
   * List secret versions
   */
  async listVersions(secretRef: string): Promise<SecretVersionInfo[]> {
    if (!this.vaultClient || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      if (this.secretEnginePath !== 'data') {
        // KV v1 doesn't support versioning
        return [
          {
            version: 1,
            createdAt: new Date(),
            isActive: true,
          },
        ];
      }
      
      // KV v2: Get version metadata
      const path = `${this.secretEngine}/metadata/${secretRef}`;
      const response = await this.vaultClient.read(path);
      
      if (!response.data) {
        throw new SecretNotFoundError(secretRef);
      }
      
      const versions: SecretVersionInfo[] = [];
      const versionsData = (response.data as any).versions;
      
      if (versionsData) {
        for (const [version, versionData] of Object.entries(versionsData)) {
          versions.push({
            version: parseInt(version, 10),
            createdAt: (versionData as any).created_time 
              ? new Date((versionData as any).created_time)
              : new Date(),
            isActive: !(versionData as any).destroyed,
          });
        }
      }
      
      return versions.length > 0 ? versions : [
        {
          version: 1,
          createdAt: new Date(),
          isActive: true,
        },
      ];
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        throw new SecretNotFoundError(secretRef);
      }
      throw new Error(`Failed to list versions from HashiCorp Vault: ${error.message}`);
    }
  }
  
  /**
   * Retrieve specific version
   */
  async retrieveVersion(secretRef: string, version: number): Promise<RetrieveSecretResult> {
    if (!this.vaultClient || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      if (this.secretEnginePath !== 'data') {
        // KV v1 doesn't support versioning
        return this.retrieveSecret({ secretRef });
      }
      
      // KV v2: Retrieve specific version
      const path = `${this.secretEngine}/data/${secretRef}`;
      const response = await this.vaultClient.read(path, { version });
      
      if (!response.data) {
        throw new SecretNotFoundError(secretRef);
      }
      
      const vaultData = (response.data as any).data || response.data;
      
      // Reconstruct value (same logic as retrieveSecret)
      let value: AnySecretValue;
      if (vaultData.value && Object.keys(vaultData).length === 1) {
        value = vaultData.value;
      } else {
        const reconstructed: Record<string, any> = {};
        for (const [key, val] of Object.entries(vaultData)) {
          if (!key.startsWith('_metadata_')) {
            try {
              reconstructed[key] = JSON.parse(String(val));
            } catch {
              reconstructed[key] = val;
            }
          }
        }
        value = reconstructed;
      }
      
      return {
        value,
        version,
        createdAt: (response.data as any).metadata?.created_time
          ? new Date((response.data as any).metadata.created_time)
          : new Date(),
        expiresAt: undefined,
      };
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        throw new SecretNotFoundError(secretRef);
      }
      throw new DecryptionError(`Failed to retrieve version from HashiCorp Vault: ${error.message}`);
    }
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.vaultClient || !this.config) {
      return {
        status: 'unhealthy',
        message: 'Backend not initialized',
        lastCheck: new Date(),
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Check Vault health
      const healthResponse = await this.vaultClient.health();
      
      const latencyMs = Date.now() - startTime;
      
      if (healthResponse.sealed) {
        return {
          status: 'unhealthy',
          message: 'Vault is sealed',
          lastCheck: new Date(),
          latencyMs,
        };
      }
      
      return {
        status: 'healthy',
        message: `HashiCorp Vault (${this.config.address}) is accessible`,
        lastCheck: new Date(),
        latencyMs,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `HashiCorp Vault health check failed: ${error.message}`,
        lastCheck: new Date(),
        latencyMs: Date.now() - startTime,
      };
    }
  }
}




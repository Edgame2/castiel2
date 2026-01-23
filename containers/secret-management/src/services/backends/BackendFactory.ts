/**
 * Backend Factory
 * 
 * Creates and manages storage backend instances.
 */

import {
  SecretStorageBackend,
  BackendConfig,
} from '../../types/backend.types';
import { LocalBackend } from './LocalBackend';
import { AzureKeyVaultBackend } from './AzureKeyVaultBackend';
import { AWSSecretsBackend } from './AWSSecretsBackend';
import { HashiCorpVaultBackend } from './HashiCorpVaultBackend';
import { GCPSecretBackend } from './GCPSecretBackend';

export class BackendFactory {
  private static backends: Map<string, SecretStorageBackend> = new Map();
  
  /**
   * Create or get a backend instance
   */
  static async createBackend(config: BackendConfig): Promise<SecretStorageBackend> {
    const key = this.getBackendKey(config);
    
    // Return existing instance if available
    if (this.backends.has(key)) {
      return this.backends.get(key)!;
    }
    
    // Create new backend
    let backend: SecretStorageBackend;
    
    switch (config.type) {
      case 'LOCAL_ENCRYPTED':
        backend = new LocalBackend();
        break;
      
      case 'AZURE_KEY_VAULT':
        backend = new AzureKeyVaultBackend();
        break;
      
      case 'AWS_SECRETS_MANAGER':
        backend = new AWSSecretsBackend();
        break;
      
      case 'HASHICORP_VAULT':
        backend = new HashiCorpVaultBackend();
        break;
      
      case 'GCP_SECRET_MANAGER':
        backend = new GCPSecretBackend();
        break;
      
      default:
        throw new Error(`Unknown backend type: ${(config as any).type}`);
    }
    
    // Initialize backend
    await backend.initialize(config);
    
    // Cache instance
    this.backends.set(key, backend);
    
    return backend;
  }
  
  /**
   * Get backend key for caching
   */
  private static getBackendKey(config: BackendConfig): string {
    switch (config.type) {
      case 'LOCAL_ENCRYPTED':
        return 'local:default';
      
      case 'AZURE_KEY_VAULT':
        return `azure:${config.vaultUrl}`;
      
      case 'AWS_SECRETS_MANAGER':
        return `aws:${config.region}`;
      
      case 'HASHICORP_VAULT':
        return `vault:${config.address}:${config.namespace || 'default'}`;
      
      case 'GCP_SECRET_MANAGER':
        return `gcp:${config.projectId}`;
      
      default:
        return `unknown:${(config as any).type}`;
    }
  }
  
  /**
   * Clear backend cache
   */
  static clearCache(): void {
    this.backends.clear();
  }
  
  /**
   * Remove specific backend from cache
   */
  static removeBackend(config: BackendConfig): void {
    const key = this.getBackendKey(config);
    this.backends.delete(key);
  }
}

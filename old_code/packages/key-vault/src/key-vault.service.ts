import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';
import {
  KeyVaultConfig,
  SecretName,
  CachedSecret,
  SecretResult,
  GetSecretOptions,
} from './types';

/**
 * Service for retrieving secrets from Azure Key Vault with in-memory caching
 * and graceful fallback to environment variables for local development.
 */
export class KeyVaultService {
  private client: SecretClient;
  private cache: Map<string, CachedSecret> = new Map();
  private config: Required<KeyVaultConfig>;

  /**
   * Creates a new KeyVaultService instance
   * @param config Configuration for the Key Vault service
   */
  constructor(config: KeyVaultConfig) {
    this.config = {
      vaultUrl: config.vaultUrl,
      useManagedIdentity: config.useManagedIdentity ?? process.env.NODE_ENV === 'production',
      servicePrincipal: config.servicePrincipal ?? {
        tenantId: process.env.AZURE_TENANT_ID || '',
        clientId: process.env.AZURE_CLIENT_ID || '',
        clientSecret: process.env.AZURE_CLIENT_SECRET || '',
      },
      cacheTTL: config.cacheTTL ?? 300000, // 5 minutes default
      enableFallback: config.enableFallback ?? process.env.NODE_ENV !== 'production',
    };

    // Only initialize Azure client if we have valid configuration
    const hasValidConfig = this.config.vaultUrl && 
      this.config.vaultUrl !== 'https://placeholder.vault.azure.net/' &&
      (this.config.useManagedIdentity || 
        (this.config.servicePrincipal.tenantId && 
         this.config.servicePrincipal.clientId && 
         this.config.servicePrincipal.clientSecret));

    if (!hasValidConfig) {
      console.warn('Key Vault credentials not configured. Using environment variables only.');
      // Create a dummy client that will never be used (fallback will always be used)
      this.client = null as any;
      return;
    }

    // Initialize the credential based on configuration
    const credential = this.config.useManagedIdentity
      ? new DefaultAzureCredential()
      : new ClientSecretCredential(
          this.config.servicePrincipal.tenantId,
          this.config.servicePrincipal.clientId,
          this.config.servicePrincipal.clientSecret
        );

    this.client = new SecretClient(this.config.vaultUrl, credential);
  }

  /**
   * Retrieves a secret from Key Vault with caching and fallback support
   * @param secretName The name of the secret to retrieve
   * @param options Options for secret retrieval
   * @returns The secret value and metadata
   */
  async getSecret(
    secretName: SecretName | string,
    options: GetSecretOptions = {}
  ): Promise<SecretResult> {
    const {
      bypassCache = false,
      fallbackEnvVar,
      required = true,
    } = options;

    // If no client is configured, use fallback immediately
    if (!this.client) {
      const fallbackValue = this.getFallbackValue(secretName, fallbackEnvVar);
      
      if (fallbackValue) {
        return {
          value: fallbackValue,
          fromCache: false,
          fromFallback: true,
        };
      }
      
      if (required) {
        throw new Error(
          `Required secret "${secretName}" not found in environment variables and Key Vault is not configured`
        );
      }
      
      return {
        value: '',
        fromCache: false,
        fromFallback: true,
      };
    }

    // Check cache first (unless bypassed)
    if (!bypassCache) {
      const cached = this.getCachedSecret(secretName);
      if (cached) {
        return {
          value: cached.value,
          fromCache: true,
          fromFallback: false,
        };
      }
    }

    try {
      // Attempt to retrieve from Key Vault
      const secret = await this.client.getSecret(secretName);
      
      if (!secret.value) {
        throw new Error(`Secret ${secretName} has no value`);
      }

      // Cache the secret
      this.cacheSecret(secretName, secret.value);

      return {
        value: secret.value,
        fromCache: false,
        fromFallback: false,
      };
    } catch (error) {
      // Handle Key Vault retrieval failure
      if (this.config.enableFallback) {
        const fallbackValue = this.getFallbackValue(secretName, fallbackEnvVar);
        
        if (fallbackValue) {
          console.warn(
            `Failed to retrieve secret "${secretName}" from Key Vault, using fallback. Error: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
          
          return {
            value: fallbackValue,
            fromCache: false,
            fromFallback: true,
          };
        }
      }

      // If required and no fallback available, throw error
      if (required) {
        throw new Error(
          `Failed to retrieve required secret "${secretName}" from Key Vault and no fallback available. Error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }

      // Return empty string for optional secrets
      return {
        value: '',
        fromCache: false,
        fromFallback: false,
      };
    }
  }

  /**
   * Retrieves multiple secrets in parallel
   * @param secretNames Array of secret names to retrieve
   * @returns Map of secret names to their values and metadata
   */
  async getSecrets(
    secretNames: (SecretName | string)[],
    options: GetSecretOptions = {}
  ): Promise<Map<string, SecretResult>> {
    const results = await Promise.all(
      secretNames.map(async (name) => {
        const result = await this.getSecret(name, options);
        return [name, result] as [string, SecretResult];
      })
    );

    return new Map(results);
  }

  /**
   * Sets a secret in Azure Key Vault
   * @param secretName The name of the secret to set
   * @param secretValue The value of the secret
   * @param options Optional metadata for the secret
   * @returns The created secret metadata
   */
  async setSecret(
    secretName: SecretName | string,
    secretValue: string,
    options?: {
      contentType?: string;
      tags?: Record<string, string>;
      enabled?: boolean;
      expiresOn?: Date;
      notBefore?: Date;
    }
  ): Promise<{ name: string; version: string }> {
    // If no client is configured, throw error (cannot set secrets without Key Vault)
    if (!this.client) {
      throw new Error(
        `Cannot set secret "${secretName}": Key Vault is not configured. Please configure Azure Key Vault credentials.`
      );
    }

    try {
      const secret = await this.client.setSecret(secretName, secretValue, {
        contentType: options?.contentType,
        tags: options?.tags,
        enabled: options?.enabled ?? true,
        expiresOn: options?.expiresOn,
        notBefore: options?.notBefore,
      });

      console.log(`✓ Successfully stored secret in Key Vault: ${secretName}`);

      return {
        name: secret.name,
        version: secret.properties.version || 'latest',
      };
    } catch (error) {
      console.error(`Failed to set secret "${secretName}" in Key Vault:`, error);
      throw new Error(
        `Failed to set secret "${secretName}" in Key Vault: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Deletes a secret from Azure Key Vault
   * @param secretName The name of the secret to delete
   */
  async deleteSecret(secretName: SecretName | string): Promise<void> {
    if (!this.client) {
      throw new Error(
        `Cannot delete secret "${secretName}": Key Vault is not configured.`
      );
    }

    try {
      await this.client.beginDeleteSecret(secretName);
      console.log(`✓ Successfully deleted secret from Key Vault: ${secretName}`);
      
      // Remove from cache
      this.invalidateSecret(secretName);
    } catch (error) {
      console.error(`Failed to delete secret "${secretName}" from Key Vault:`, error);
      throw new Error(
        `Failed to delete secret "${secretName}" from Key Vault: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Invalidates a cached secret, forcing fresh retrieval on next access
   * @param secretName The name of the secret to invalidate
   */
  invalidateSecret(secretName: SecretName | string): void {
    this.cache.delete(secretName);
  }

  /**
   * Clears the entire secret cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics for monitoring
   * @returns Cache size and hit rate information
   */
  getCacheStats(): {
    size: number;
    entries: string[];
  } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Retrieves a cached secret if it exists and is not expired
   * @param secretName The name of the secret
   * @returns The cached secret or null if not found/expired
   */
  private getCachedSecret(secretName: string): CachedSecret | null {
    const cached = this.cache.get(secretName);
    
    if (!cached) {
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(secretName);
      return null;
    }

    return cached;
  }

  /**
   * Caches a secret value with TTL
   * @param secretName The name of the secret
   * @param value The secret value
   */
  private cacheSecret(secretName: string, value: string): void {
    const now = Date.now();
    this.cache.set(secretName, {
      value,
      cachedAt: now,
      expiresAt: now + this.config.cacheTTL,
    });
  }

  /**
   * Gets fallback value from environment variables
   * @param secretName The secret name
   * @param fallbackEnvVar Optional custom environment variable name
   * @returns The fallback value or null
   */
  private getFallbackValue(secretName: string, fallbackEnvVar?: string): string | null {
    // Try custom fallback env var first
    if (fallbackEnvVar) {
      return process.env[fallbackEnvVar] || null;
    }

    // Convert secret name to standard env var format
    // e.g., "redis-primary-connection-string" -> "REDIS_PRIMARY_CONNECTION_STRING"
    const envVarName = secretName.toUpperCase().replace(/-/g, '_');
    return process.env[envVarName] || null;
  }

  /**
   * Health check to verify Key Vault connectivity
   * @returns True if Key Vault is accessible, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to list secrets (with max 1 result) to verify connectivity
      const iterator = this.client.listPropertiesOfSecrets().byPage({ maxPageSize: 1 });
      await iterator.next();
      return true;
    } catch (error) {
      console.error('Key Vault health check failed:', error);
      return false;
    }
  }
}

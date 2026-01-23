/**
 * Secret Resolver Service
 * 
 * Resolves secret references in configurations and provides batch resolution.
 * Used by consumer modules to resolve multiple secrets at once.
 */

import { SecretService } from './SecretService';
import { SecretContext, AnySecretValue } from '../types';
import { SecretNotFoundError } from '../errors/SecretErrors';

export interface SecretReference {
  type: 'SECRET_REF';
  secretId: string;
}

export interface ResolvedSecret {
  secretId: string;
  value: AnySecretValue;
  metadata?: {
    name: string;
    type: string;
    scope: string;
  };
}

export interface ResolveSecretsParams {
  references: (string | SecretReference)[];
  context: SecretContext;
}

export class SecretResolver {
  private secretService: SecretService;
  
  constructor() {
    this.secretService = new SecretService();
  }
  
  /**
   * Resolve a single secret reference
   */
  async resolveSecret(
    reference: string | SecretReference,
    context: SecretContext
  ): Promise<AnySecretValue> {
    const secretId = typeof reference === 'string' ? reference : reference.secretId;
    
    try {
      return await this.secretService.getSecretValue(secretId, context);
    } catch (error) {
      if (error instanceof SecretNotFoundError) {
        throw new SecretNotFoundError(secretId);
      }
      throw error;
    }
  }
  
  /**
   * Resolve multiple secret references in batch
   */
  async resolveSecrets(
    params: ResolveSecretsParams,
    options?: { allowPartial?: boolean }
  ): Promise<{ secrets: ResolvedSecret[]; errors?: Array<{ secretId: string; error: string }> }> {
    const results: ResolvedSecret[] = [];
    const errors: Array<{ secretId: string; error: string }> = [];
    
    // Resolve all secrets in parallel
    const promises = params.references.map(async (ref) => {
      const secretId = typeof ref === 'string' ? ref : ref.secretId;
      
      try {
        const value = await this.secretService.getSecretValue(secretId, params.context);
        const metadata = await this.secretService.getSecretMetadata(secretId, params.context);
        
        results.push({
          secretId,
          value,
          metadata: {
            name: metadata.name,
            type: metadata.type,
            scope: metadata.scope,
          },
        });
      } catch (error: any) {
        errors.push({
          secretId,
          error: error.message || String(error),
        });
      }
    });
    
    await Promise.all(promises);
    
    // If any secrets failed to resolve and partial results not allowed, throw error
    if (errors.length > 0 && !options?.allowPartial) {
      throw new Error(
        `Failed to resolve ${errors.length} secret(s): ${errors.map(e => `${e.secretId} (${e.error})`).join(', ')}`
      );
    }
    
    return {
      secrets: results,
      ...(errors.length > 0 && { errors }),
    };
  }
  
  /**
   * Resolve secrets from a configuration object
   * Replaces secret references with resolved values
   */
  async resolveConfig(
    config: Record<string, any>,
    context: SecretContext
  ): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        // Check if it's a secret reference (format: secret://secretId)
        if (value.startsWith('secret://')) {
          const secretId = value.replace('secret://', '');
          try {
            const secretValue = await this.resolveSecret(secretId, context);
            resolved[key] = this.extractStringValue(secretValue);
          } catch (error) {
            // Keep original value if resolution fails
            resolved[key] = value;
          }
        } else {
          resolved[key] = value;
        }
      } else if (value && typeof value === 'object' && 'type' in value && value.type === 'SECRET_REF') {
        // Handle SecretReference object
        try {
          const secretValue = await this.resolveSecret(value as SecretReference, context);
          resolved[key] = this.extractStringValue(secretValue);
        } catch (error) {
          // Keep original value if resolution fails
          resolved[key] = value;
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively resolve nested objects
        resolved[key] = await this.resolveConfig(value, context);
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }
  
  /**
   * Extract string value from secret value
   */
  private extractStringValue(value: AnySecretValue): string {
    switch (value.type) {
      case 'API_KEY':
        return (value as any).key || '';
      case 'USERNAME_PASSWORD':
        return JSON.stringify({
          username: (value as any).username,
          password: (value as any).password,
        });
      case 'OAUTH2_TOKEN':
        return (value as any).accessToken || '';
      case 'CERTIFICATE':
        return (value as any).certificate || '';
      case 'SSH_KEY':
        return (value as any).privateKey || '';
      case 'CONNECTION_STRING':
        return (value as any).connectionString || '';
      case 'JSON_CREDENTIAL':
        return JSON.stringify((value as any).credential);
      case 'ENV_VARIABLE_SET':
        return JSON.stringify((value as any).variables);
      case 'GENERIC':
        return (value as any).value || '';
      default:
        return JSON.stringify(value);
    }
  }
}

/**
 * AWS Secrets Manager Backend
 * 
 * Implements SecretStorageBackend for AWS Secrets Manager integration.
 */

import {
  SecretsManagerClient,
  CreateSecretCommand,
  GetSecretValueCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  ListSecretsCommand,
  DescribeSecretCommand,
  PutSecretValueCommand,
  GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager';
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
  AWSSecretsConfig,
} from '../../types/backend.types';
import { VaultConnectionError, EncryptionError, DecryptionError, SecretNotFoundError } from '../../errors/SecretErrors';
import { AnySecretValue } from '../../types';

export class AWSSecretsBackend implements SecretStorageBackend {
  readonly type = 'AWS_SECRETS_MANAGER';
  readonly name = 'AWS Secrets Manager';
  
  private client: SecretsManagerClient | null = null;
  private config: AWSSecretsConfig | null = null;
  private region: string;
  
  /**
   * Initialize AWS Secrets Manager backend
   */
  async initialize(config: BackendConfig): Promise<void> {
    const awsConfig = config as AWSSecretsConfig;
    
    if (!awsConfig.region) {
      throw new VaultConnectionError('aws-secrets-manager', 'AWS region is required');
    }
    
    this.region = awsConfig.region;
    
    try {
      // Create AWS client with credentials
      const clientConfig: any = {
        region: awsConfig.region,
      };
      
      if (awsConfig.authentication.type === 'access_key') {
        clientConfig.credentials = {
          accessKeyId: awsConfig.authentication.accessKeyId,
          secretAccessKey: awsConfig.authentication.secretAccessKey,
        };
      }
      // If 'iam_role', use default credential chain (IAM role, environment variables, etc.)
      
      this.client = new SecretsManagerClient(clientConfig);
      
      // Test connection by attempting to list secrets (with limit)
      try {
        await this.client.send(new ListSecretsCommand({ MaxResults: 1 }));
      } catch (error: any) {
        throw new VaultConnectionError('aws-secrets-manager', `Failed to connect to AWS Secrets Manager: ${error.message}`);
      }
      
      this.config = awsConfig;
    } catch (error: any) {
      if (error instanceof VaultConnectionError) {
        throw error;
      }
      throw new VaultConnectionError('aws-secrets-manager', `Failed to initialize AWS Secrets Manager: ${error.message}`);
    }
  }
  
  /**
   * Store a secret
   */
  async storeSecret(params: StoreSecretParams): Promise<StoreSecretResult> {
    if (!this.client || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      // Serialize secret value to JSON string
      const secretString = JSON.stringify(params.value);
      
      // Create secret
      const command = new CreateSecretCommand({
        Name: params.name,
        SecretString: secretString,
        Description: params.metadata?.description,
        KmsKeyId: this.config.kmsKeyId,
        Tags: params.metadata ? Object.entries(params.metadata).map(([key, value]) => ({
          Key: key,
          Value: String(value),
        })) : undefined,
      });
      
      const response = await this.client.send(command);
      
      // AWS Secrets Manager doesn't have explicit version numbers in the same way
      // We'll use ARN as the secretRef and track versions via DescribeSecret
      const secretRef = response.ARN || params.name;
      
      // Get version info
      const describeCommand = new DescribeSecretCommand({ SecretId: secretRef });
      const describeResponse = await this.client.send(describeCommand);
      const version = describeResponse.VersionId || 'AWSCURRENT';
      
      return {
        secretRef,
        version: 1, // AWS uses version IDs, but we'll map to sequential numbers
      };
    } catch (error: any) {
      if (error.name === 'ResourceExistsException') {
        throw new Error(`Secret ${params.name} already exists`);
      }
      throw new EncryptionError(`Failed to store secret in AWS Secrets Manager: ${error.message}`);
    }
  }
  
  /**
   * Retrieve a secret
   */
  async retrieveSecret(params: RetrieveSecretParams): Promise<RetrieveSecretResult> {
    if (!this.client) {
      throw new Error('Backend not initialized');
    }
    
    try {
      const command = new GetSecretValueCommand({
        SecretId: params.secretRef,
      });
      
      const response: GetSecretValueCommandOutput = await this.client.send(command);
      
      if (!response.SecretString) {
        throw new SecretNotFoundError(params.secretRef);
      }
      
      // Parse JSON string back to AnySecretValue
      let value: AnySecretValue;
      try {
        value = JSON.parse(response.SecretString);
      } catch (parseError) {
        // If not JSON, treat as plain string
        value = response.SecretString;
      }
      
      // Get metadata
      const describeCommand = new DescribeSecretCommand({ SecretId: params.secretRef });
      const describeResponse = await this.client.send(describeCommand);
      
      return {
        value,
        version: 1, // Map AWS version ID to sequential number
        metadata: {
          arn: response.ARN,
          createdDate: describeResponse.CreatedDate?.toISOString(),
          lastChangedDate: describeResponse.LastChangedDate?.toISOString(),
          lastRotatedDate: describeResponse.LastRotatedDate?.toISOString(),
          ...(describeResponse.Description && { description: describeResponse.Description }),
        },
        createdAt: describeResponse.CreatedDate || new Date(),
        expiresAt: undefined, // AWS Secrets Manager doesn't have built-in expiration
      };
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        throw new SecretNotFoundError(params.secretRef);
      }
      throw new DecryptionError(`Failed to retrieve secret from AWS Secrets Manager: ${error.message}`);
    }
  }
  
  /**
   * Update a secret
   */
  async updateSecret(params: UpdateSecretParams): Promise<UpdateSecretResult> {
    if (!this.client) {
      throw new Error('Backend not initialized');
    }
    
    try {
      // Serialize secret value to JSON string
      const secretString = JSON.stringify(params.value);
      
      const command = new PutSecretValueCommand({
        SecretId: params.secretRef,
        SecretString: secretString,
      });
      
      await this.client.send(command);
      
      // Get new version
      const describeCommand = new DescribeSecretCommand({ SecretId: params.secretRef });
      const describeResponse = await this.client.send(describeCommand);
      
      return {
        version: 1, // Increment version (AWS handles this internally)
      };
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        throw new SecretNotFoundError(params.secretRef);
      }
      throw new EncryptionError(`Failed to update secret in AWS Secrets Manager: ${error.message}`);
    }
  }
  
  /**
   * Delete a secret
   */
  async deleteSecret(params: DeleteSecretParams): Promise<void> {
    if (!this.client) {
      throw new Error('Backend not initialized');
    }
    
    try {
      const command = new DeleteSecretCommand({
        SecretId: params.secretRef,
        ForceDeleteWithoutRecovery: true, // Immediate deletion
      });
      
      await this.client.send(command);
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        // Secret already deleted, consider it success
        return;
      }
      throw new Error(`Failed to delete secret from AWS Secrets Manager: ${error.message}`);
    }
  }
  
  /**
   * List secrets (metadata only)
   */
  async listSecrets(params: ListSecretsParams): Promise<BackendSecretMetadata[]> {
    if (!this.client) {
      throw new Error('Backend not initialized');
    }
    
    try {
      const secrets: BackendSecretMetadata[] = [];
      let nextToken: string | undefined;
      
      do {
        const command = new ListSecretsCommand({
          MaxResults: params.limit || 100,
          NextToken: nextToken,
          Filters: params.prefix ? [
            {
              Key: 'name',
              Values: [params.prefix],
            },
          ] : undefined,
        });
        
        const response = await this.client.send(command);
        
        if (response.SecretList) {
          for (const secret of response.SecretList) {
            secrets.push({
              name: secret.Name || '',
              secretRef: secret.ARN || secret.Name || '',
              version: 1,
              createdAt: secret.CreatedDate || new Date(),
              expiresAt: undefined,
              metadata: {
                arn: secret.ARN,
                description: secret.Description,
                lastChangedDate: secret.LastChangedDate?.toISOString(),
                lastRotatedDate: secret.LastRotatedDate?.toISOString(),
              },
            });
          }
        }
        
        nextToken = response.NextToken;
      } while (nextToken && (!params.limit || secrets.length < params.limit));
      
      return secrets;
    } catch (error: any) {
      throw new Error(`Failed to list secrets from AWS Secrets Manager: ${error.message}`);
    }
  }
  
  /**
   * List secret versions
   */
  async listVersions(secretRef: string): Promise<SecretVersionInfo[]> {
    if (!this.client) {
      throw new Error('Backend not initialized');
    }
    
    try {
      const describeCommand = new DescribeSecretCommand({ SecretId: secretRef });
      const describeResponse = await this.client.send(describeCommand);
      
      // AWS Secrets Manager tracks versions differently
      // We'll return current version info
      return [
        {
          version: 1,
          createdAt: describeResponse.CreatedDate || new Date(),
          isActive: true,
        },
      ];
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        throw new SecretNotFoundError(secretRef);
      }
      throw new Error(`Failed to list versions from AWS Secrets Manager: ${error.message}`);
    }
  }
  
  /**
   * Retrieve specific version
   */
  async retrieveVersion(secretRef: string, version: number): Promise<RetrieveSecretResult> {
    // AWS Secrets Manager versioning is different - we'll retrieve current version
    // For full version support, would need to use VersionId in GetSecretValueCommand
    return this.retrieveSecret({ secretRef });
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
      // Test connection by listing secrets with limit 1
      await this.client.send(new ListSecretsCommand({ MaxResults: 1 }));
      
      const latencyMs = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: `AWS Secrets Manager (${this.region}) is accessible`,
        lastCheck: new Date(),
        latencyMs,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `AWS Secrets Manager health check failed: ${error.message}`,
        lastCheck: new Date(),
        latencyMs: Date.now() - startTime,
      };
    }
  }
}

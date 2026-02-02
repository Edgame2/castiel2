/**
 * GCP Secret Manager Backend
 * 
 * Implements SecretStorageBackend for GCP Secret Manager integration.
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
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
  GCPSecretConfig,
} from '../../types/backend.types';
import { VaultConnectionError, EncryptionError, DecryptionError, SecretNotFoundError } from '../../errors/SecretErrors';
import { AnySecretValue } from '../../types';

export class GCPSecretBackend implements SecretStorageBackend {
  readonly type = 'GCP_SECRET_MANAGER';
  readonly name = 'GCP Secret Manager';
  
  private client: SecretManagerServiceClient | null = null;
  private config: GCPSecretConfig | null = null;
  private projectId!: string;
  
  /**
   * Initialize GCP Secret Manager backend
   */
  async initialize(config: BackendConfig): Promise<void> {
    const gcpConfig = config as GCPSecretConfig;
    
    if (!gcpConfig.projectId) {
      throw new VaultConnectionError('gcp-secret-manager', 'GCP project ID is required');
    }
    
    this.projectId = gcpConfig.projectId;
    
    try {
      // Create GCP client with credentials
      let clientOptions: any = {
        projectId: gcpConfig.projectId,
      };
      
      if (gcpConfig.authentication.type === 'service_account') {
        clientOptions.keyFilename = gcpConfig.authentication.keyFilePath;
      } else if (gcpConfig.authentication.type === 'service_account_json') {
        clientOptions.credentials = gcpConfig.authentication.credentials;
      }
      // If 'default_credentials', use default credential chain (Application Default Credentials)
      
      this.client = new SecretManagerServiceClient(clientOptions);
      
      // Test connection by attempting to list secrets (with limit)
      try {
        await this.client.listSecrets({
          parent: `projects/${gcpConfig.projectId}`,
          pageSize: 1,
        });
        // Just verify we can access the API
      } catch (error: any) {
        // If no secrets exist, that's okay - just verify we can access the API
        if (error.code !== 7) { // 7 = NOT_FOUND, which is acceptable
          throw new VaultConnectionError('gcp-secret-manager', `Failed to connect to GCP Secret Manager: ${error.message}`);
        }
      }
      
      this.config = gcpConfig;
    } catch (error: any) {
      if (error instanceof VaultConnectionError) {
        throw error;
      }
      throw new VaultConnectionError('gcp-secret-manager', `Failed to initialize GCP Secret Manager: ${error.message}`);
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
      
      const parent = `projects/${this.projectId}`;
      const secretId = params.name;
      
      // Create secret
      const [secret] = await this.client.createSecret({
        parent,
        secretId,
        secret: {
          replication: {
            automatic: {},
          },
        },
      });
      
      // Add secret version with data
      const [version] = await this.client.addSecretVersion({
        parent: secret.name,
        payload: {
          data: Buffer.from(secretString, 'utf8'),
        },
      });
      
      // Extract version number from version name (format: projects/.../secrets/.../versions/1)
      const versionMatch = version.name?.match(/\/versions\/(\d+)$/);
      const versionNumber = versionMatch ? parseInt(versionMatch[1], 10) : 1;
      
      return {
        secretRef: secret.name || secretId,
        version: versionNumber,
      };
    } catch (error: any) {
      if (error.code === 6) { // ALREADY_EXISTS
        throw new Error(`Secret ${params.name} already exists`);
      }
      throw new EncryptionError(`Failed to store secret in GCP Secret Manager: ${error.message}`);
    }
  }
  
  /**
   * Retrieve a secret
   */
  async retrieveSecret(params: RetrieveSecretParams): Promise<RetrieveSecretResult> {
    if (!this.client || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      // GCP secret ref format: projects/{project}/secrets/{secret}/versions/{version}
      // Or just secret name - we'll use latest version
      let secretName = params.secretRef;
      
      // If not full path, construct it
      if (!secretName.includes('/')) {
        secretName = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
      } else if (!secretName.includes('/versions/')) {
        secretName = `${secretName}/versions/latest`;
      }
      
      const [version] = await this.client.accessSecretVersion({
        name: secretName,
      });
      
      if (!version.payload?.data) {
        throw new SecretNotFoundError(params.secretRef);
      }
      
      // Decode secret data
      const secretString = (version.payload.data as any).toString('utf8');
      
      // Parse JSON string back to AnySecretValue
      let value: AnySecretValue;
      try {
        value = JSON.parse(secretString) as AnySecretValue;
      } catch (parseError) {
        value = secretString as unknown as AnySecretValue;
      }
      
      // Extract version number
      const versionMatch = version.name?.match(/\/versions\/(\d+)$/);
      const versionNumber = versionMatch ? parseInt(versionMatch[1], 10) : 1;
      
      // Get secret metadata
      const secretMatch = version.name?.match(/^(projects\/[^\/]+\/secrets\/[^\/]+)/);
      const secretPath = secretMatch ? secretMatch[1] : params.secretRef;
      
      const [secret] = await (this.client as any).getSecret({
        name: secretPath,
      });
      
      return {
        value,
        version: versionNumber,
        metadata: {
          name: secret.name ?? '',
          createTime: secret.createTime?.toString() ?? '',
          labels: (secret.labels ? JSON.stringify(secret.labels) : undefined) ?? '',
        },
        createdAt: secret.createTime 
          ? new Date(Number(secret.createTime?.seconds ?? 0) * 1000)
          : new Date(),
        expiresAt: undefined, // GCP Secret Manager doesn't have built-in expiration
      };
    } catch (error: any) {
      if (error.code === 5) { // NOT_FOUND
        throw new SecretNotFoundError(params.secretRef);
      }
      throw new DecryptionError(`Failed to retrieve secret from GCP Secret Manager: ${error.message}`);
    }
  }
  
  /**
   * Update a secret
   */
  async updateSecret(params: UpdateSecretParams): Promise<UpdateSecretResult> {
    if (!this.client || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      // Serialize secret value to JSON string
      const secretString = JSON.stringify(params.value);
      
      // GCP doesn't update secrets - it creates new versions
      // Extract secret name from secretRef
      let secretName = params.secretRef;
      if (secretName.includes('/')) {
        // Extract from full path: projects/.../secrets/{name}
        const match = secretName.match(/\/secrets\/([^\/]+)/);
        if (match) {
          secretName = match[1];
        }
      }
      
      const parent = `projects/${this.projectId}/secrets/${secretName}`;
      
      // Add new version
      const [version] = await this.client.addSecretVersion({
        parent,
        payload: {
          data: Buffer.from(secretString, 'utf8'),
        },
      });
      
      // Extract version number
      const versionMatch = version.name?.match(/\/versions\/(\d+)$/);
      const versionNumber = versionMatch ? parseInt(versionMatch[1], 10) : 1;
      
      return {
        version: versionNumber,
      };
    } catch (error: any) {
      if (error.code === 5) { // NOT_FOUND
        throw new SecretNotFoundError(params.secretRef);
      }
      throw new EncryptionError(`Failed to update secret in GCP Secret Manager: ${error.message}`);
    }
  }
  
  /**
   * Delete a secret
   */
  async deleteSecret(params: DeleteSecretParams): Promise<void> {
    if (!this.client || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      // Extract secret name from secretRef
      let secretName = params.secretRef;
      if (secretName.includes('/')) {
        // Extract from full path: projects/.../secrets/{name}
        const match = secretName.match(/\/secrets\/([^\/]+)/);
        if (match) {
          secretName = match[1];
        }
      }
      
      const name = `projects/${this.projectId}/secrets/${secretName}`;
      
      await this.client.deleteSecret({
        name,
      });
    } catch (error: any) {
      if (error.code === 5) { // NOT_FOUND
        // Secret already deleted, consider it success
        return;
      }
      throw new Error(`Failed to delete secret from GCP Secret Manager: ${error.message}`);
    }
  }
  
  /**
   * List secrets (metadata only)
   */
  async listSecrets(params: ListSecretsParams): Promise<BackendSecretMetadata[]> {
    if (!this.client || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      const secrets: BackendSecretMetadata[] = [];
      const parent = `projects/${this.projectId}`;
      
      const [secretList] = await this.client.listSecrets({
        parent,
        pageSize: params.limit || 100,
        filter: params.prefix ? `name:${params.prefix}*` : undefined,
      });
      
      for (const secret of secretList) {
        // Get latest version to get version number
        try {
          const [latestVersion] = await this.client.accessSecretVersion({
            name: `${secret.name}/versions/latest`,
          });
          
          const versionMatch = latestVersion.name?.match(/\/versions\/(\d+)$/);
          const versionNumber = versionMatch ? parseInt(versionMatch[1], 10) : 1;
          
          // Extract secret name from full path
          const nameMatch = secret.name?.match(/\/secrets\/([^\/]+)$/);
          const secretName = nameMatch ? nameMatch[1] : secret.name || '';
          
          secrets.push({
            name: secretName,
            secretRef: secret.name ?? secretName,
            version: versionNumber,
            createdAt: secret.createTime 
              ? new Date(Number(secret.createTime?.seconds ?? 0) * 1000)
              : new Date(),
            expiresAt: undefined,
            metadata: {
              name: secret.name ?? '',
              labels: (secret.labels ? JSON.stringify(secret.labels) : undefined) ?? '',
            },
          });
        } catch (versionError) {
          // If we can't get version, still include the secret with version 1
          const nameMatch = secret.name?.match(/\/secrets\/([^\/]+)$/);
          const secretName = nameMatch ? nameMatch[1] : secret.name || '';
          
          secrets.push({
            name: secretName,
            secretRef: secret.name ?? secretName,
            version: 1,
            createdAt: secret.createTime 
              ? new Date(Number(secret.createTime?.seconds ?? 0) * 1000)
              : new Date(),
            expiresAt: undefined,
          });
        }
      }
      
      return secrets;
    } catch (error: any) {
      throw new Error(`Failed to list secrets from GCP Secret Manager: ${error.message}`);
    }
  }
  
  /**
   * List secret versions
   */
  async listVersions(secretRef: string): Promise<SecretVersionInfo[]> {
    if (!this.client || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      // Extract secret name from secretRef
      let secretName = secretRef;
      if (secretName.includes('/')) {
        // Extract from full path: projects/.../secrets/{name}
        const match = secretName.match(/\/secrets\/([^\/]+)/);
        if (match) {
          secretName = match[1];
        }
      }
      
      const parent = `projects/${this.projectId}/secrets/${secretName}`;
      
      const [versions] = await (this.client as any).listSecretVersions({ parent });
      
      const versionInfos: SecretVersionInfo[] = [];
      
      for (const version of versions) {
        const versionMatch = version.name?.match(/\/versions\/(\d+)$/);
        const versionNumber = versionMatch ? parseInt(versionMatch[1], 10) : 1;
        
        versionInfos.push({
          version: versionNumber,
          createdAt: version.createTime 
            ? new Date(Number(version.createTime?.seconds ?? 0) * 1000)
            : new Date(),
          isActive: version.state === 'ENABLED',
        });
      }
      
      return versionInfos.length > 0 ? versionInfos : [
        {
          version: 1,
          createdAt: new Date(),
          isActive: true,
        },
      ];
    } catch (error: any) {
      if (error.code === 5) { // NOT_FOUND
        throw new SecretNotFoundError(secretRef);
      }
      throw new Error(`Failed to list versions from GCP Secret Manager: ${error.message}`);
    }
  }
  
  /**
   * Retrieve specific version
   */
  async retrieveVersion(secretRef: string, version: number): Promise<RetrieveSecretResult> {
    if (!this.client || !this.config) {
      throw new Error('Backend not initialized');
    }
    
    try {
      // Extract secret name from secretRef
      let secretName = secretRef;
      if (secretName.includes('/')) {
        // Extract from full path: projects/.../secrets/{name}
        const match = secretName.match(/\/secrets\/([^\/]+)/);
        if (match) {
          secretName = match[1];
        }
      }
      
      const versionName = `projects/${this.projectId}/secrets/${secretName}/versions/${version}`;
      
      const [versionResponse] = await (this.client as any).accessSecretVersion({
        name: versionName,
      });
      
      if (!versionResponse.payload?.data) {
        throw new SecretNotFoundError(secretRef);
      }
      
      // Decode secret data
      const secretString = versionResponse.payload.data.toString('utf8');
      
      // Parse JSON string back to AnySecretValue
      let value: AnySecretValue;
      try {
        value = JSON.parse(secretString) as AnySecretValue;
      } catch (parseError) {
        value = secretString as unknown as AnySecretValue;
      }
      
      const createTime = (versionResponse as any).createTime;
      return {
        value,
        version,
        createdAt: createTime 
          ? new Date((createTime.seconds ?? 0) * 1000)
          : new Date(),
        expiresAt: undefined,
      };
    } catch (error: any) {
      if (error.code === 5) { // NOT_FOUND
        throw new SecretNotFoundError(secretRef);
      }
      throw new DecryptionError(`Failed to retrieve version from GCP Secret Manager: ${error.message}`);
    }
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.client || !this.config) {
      return {
        status: 'unhealthy',
        message: 'Backend not initialized',
        lastCheck: new Date(),
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Test connection by listing secrets with limit 1
      await this.client.listSecrets({
        parent: `projects/${this.projectId}`,
        pageSize: 1,
      });
      
      const latencyMs = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: `GCP Secret Manager (${this.projectId}) is accessible`,
        lastCheck: new Date(),
        latencyMs,
      };
    } catch (error: any) {
      // NOT_FOUND (7) is acceptable - means project exists but no secrets
      if (error.code === 7) {
        return {
          status: 'healthy',
          message: `GCP Secret Manager (${this.projectId}) is accessible`,
          lastCheck: new Date(),
          latencyMs: Date.now() - startTime,
        };
      }
      
      return {
        status: 'unhealthy',
        message: `GCP Secret Manager health check failed: ${error.message}`,
        lastCheck: new Date(),
        latencyMs: Date.now() - startTime,
      };
    }
  }
}




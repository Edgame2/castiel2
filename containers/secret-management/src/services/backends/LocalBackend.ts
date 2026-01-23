/**
 * Local Encrypted Backend
 * 
 * Stores secrets encrypted in the database using AES-256-GCM.
 */

import { getDatabaseClient } from '@coder/shared';
import {
  SecretStorageBackend,
  BackendConfig,
  LocalBackendConfig,
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
} from '../../types/backend.types';
import { EncryptionService } from '../encryption/EncryptionService';
import { KeyManager } from '../encryption/KeyManager';
import { AnySecretValue } from '../../types';
import { SecretNotFoundError } from '../../errors/SecretErrors';

export class LocalBackend implements SecretStorageBackend {
  readonly type = 'LOCAL_ENCRYPTED' as const;
  readonly name = 'Local Encrypted Storage';
  
  private encryptionService: EncryptionService;
  private keyManager: KeyManager;
  private initialized = false;
  
  constructor() {
    this.keyManager = new KeyManager();
    this.encryptionService = new EncryptionService(this.keyManager);
  }
  
  async initialize(config: BackendConfig): Promise<void> {
    if (config.type !== 'LOCAL_ENCRYPTED') {
      throw new Error('Invalid config type for LocalBackend');
    }
    
    // Ensure active key exists
    await this.keyManager.getActiveKey();
    
    this.initialized = true;
  }
  
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Check database connection
      const db = getDatabaseClient();
      await db.$queryRaw`SELECT 1`;
      
      // Check encryption key availability
      await this.keyManager.getActiveKey();
      
      const latencyMs = Date.now() - startTime;
      
      return {
        status: 'healthy',
        lastCheck: new Date(),
        latencyMs,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
        lastCheck: new Date(),
      };
    }
  }
  
  async storeSecret(params: StoreSecretParams): Promise<StoreSecretResult> {
    if (!this.initialized) {
      throw new Error('Backend not initialized');
    }
    
    const db = getDatabaseClient();
    
    // Encrypt secret value
    const encryptedValue = await this.encryptionService.encryptSecretValue(params.value);
    const activeKey = await this.keyManager.getActiveKey();
    
    // Store in database (this is just the encrypted value - actual secret record is created by SecretService)
    // For local backend, we return a reference that points to the database record
    const secretRef = `local:${params.name}`;
    
    return {
      secretRef,
      version: 1,
    };
  }
  
  async retrieveSecret(params: RetrieveSecretParams): Promise<RetrieveSecretResult> {
    if (!this.initialized) {
      throw new Error('Backend not initialized');
    }
    
    // Parse secret reference
    const match = params.secretRef.match(/^local:(.+)$/);
    if (!match) {
      throw new SecretNotFoundError(params.secretRef);
    }
    
    const secretName = match[1];
    const db = getDatabaseClient();
    
    // Find secret in database
    const secret = await db.secret_secrets.findFirst({
      where: {
        name: secretName,
        storageBackend: 'LOCAL_ENCRYPTED',
      },
    });
    
    if (!secret || !secret.encryptedValue || !secret.encryptionKeyId) {
      throw new SecretNotFoundError(params.secretRef);
    }
    
    // Decrypt value
    const decryptedValue = await this.encryptionService.decryptSecretValue(
      secret.encryptedValue,
      secret.encryptionKeyId,
      secret.currentVersion // Using currentVersion as key version indicator
    );
    
    return {
      value: decryptedValue,
      version: secret.currentVersion,
      createdAt: secret.createdAt,
      expiresAt: secret.expiresAt || undefined,
    };
  }
  
  async updateSecret(params: UpdateSecretParams): Promise<UpdateSecretResult> {
    if (!this.initialized) {
      throw new Error('Backend not initialized');
    }
    
    // Parse secret reference
    const match = params.secretRef.match(/^local:(.+)$/);
    if (!match) {
      throw new SecretNotFoundError(params.secretRef);
    }
    
    const secretName = match[1];
    const db = getDatabaseClient();
    
    // Find secret
    const secret = await db.secret_secrets.findFirst({
      where: {
        name: secretName,
        storageBackend: 'LOCAL_ENCRYPTED',
      },
    });
    
    if (!secret) {
      throw new SecretNotFoundError(params.secretRef);
    }
    
    // Encrypt new value
    const encryptedValue = await this.encryptionService.encryptSecretValue(params.value);
    const activeKey = await this.keyManager.getActiveKey();
    
    // Update in database (versioning handled by SecretService)
    // This backend just provides the encrypted value
    
    return {
      version: secret.currentVersion + 1,
    };
  }
  
  async deleteSecret(params: DeleteSecretParams): Promise<void> {
    if (!this.initialized) {
      throw new Error('Backend not initialized');
    }
    
    // For local backend, deletion is handled by SecretService (soft delete)
    // This method is called for external backends
    // No-op for local backend
  }
  
  async listVersions(secretRef: string): Promise<SecretVersionInfo[]> {
    if (!this.initialized) {
      throw new Error('Backend not initialized');
    }
    
    const match = secretRef.match(/^local:(.+)$/);
    if (!match) {
      throw new SecretNotFoundError(secretRef);
    }
    
    const secretName = match[1];
    const db = getDatabaseClient();
    
    const secret = await db.secret_secrets.findFirst({
      where: {
        name: secretName,
        storageBackend: 'LOCAL_ENCRYPTED',
      },
      include: {
        versions: {
          orderBy: {
            version: 'desc',
          },
        },
      },
    });
    
    if (!secret) {
      throw new SecretNotFoundError(secretRef);
    }
    
    return secret.versions.map(v => ({
      version: v.version,
      createdAt: v.createdAt,
      isActive: v.isActive,
    }));
  }
  
  async retrieveVersion(secretRef: string, version: number): Promise<RetrieveSecretResult> {
    if (!this.initialized) {
      throw new Error('Backend not initialized');
    }
    
    const match = secretRef.match(/^local:(.+)$/);
    if (!match) {
      throw new SecretNotFoundError(secretRef);
    }
    
    const secretName = match[1];
    const db = getDatabaseClient();
    
    const secret = await db.secret_secrets.findFirst({
      where: {
        name: secretName,
        storageBackend: 'LOCAL_ENCRYPTED',
      },
      include: {
        versions: {
          where: {
            version,
          },
        },
      },
    });
    
    if (!secret) {
      throw new SecretNotFoundError(secretRef);
    }
    
    const versionRecord = secret.versions[0];
    if (!versionRecord || !versionRecord.encryptedValue || !versionRecord.encryptionKeyId) {
      throw new SecretNotFoundError(`${secretRef}:${version}`);
    }
    
    // Decrypt version value
    const decryptedValue = await this.encryptionService.decryptSecretValue(
      versionRecord.encryptedValue,
      versionRecord.encryptionKeyId,
      versionRecord.version
    );
    
    return {
      value: decryptedValue,
      version: versionRecord.version,
      createdAt: versionRecord.createdAt,
    };
  }
  
  async listSecrets(params: ListSecretsParams): Promise<BackendSecretMetadata[]> {
    if (!this.initialized) {
      throw new Error('Backend not initialized');
    }
    
    const db = getDatabaseClient();
    
    const where: any = {
      storageBackend: 'LOCAL_ENCRYPTED',
    };
    
    if (params.prefix) {
      where.name = {
        startsWith: params.prefix,
      };
    }
    
    const secrets = await db.secret_secrets.findMany({
      where,
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true,
        currentVersion: true,
        metadata: true,
      },
      take: params.limit || 100,
      skip: params.offset || 0,
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return secrets.map((s: any) => ({
      name: s.name,
      secretRef: `local:${s.name}`,
      version: s.currentVersion,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt || undefined,
      metadata: (s.metadata as Record<string, string>) || undefined,
    }));
  }
}

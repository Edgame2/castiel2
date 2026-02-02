/**
 * Vault Service
 * 
 * Manages vault configurations for external secret storage backends.
 */

import { getDatabaseClient } from '@coder/shared';
import { BackendFactory } from './backends/BackendFactory';
import { EncryptionService } from './encryption/EncryptionService';
import { KeyManager } from './encryption/KeyManager';
import { BackendConfig, HealthCheckResult } from '../types/backend.types';
import { VaultNotConfiguredError, VaultConnectionError } from '../errors/SecretErrors';
import { publishSecretEvent, SecretEvents } from './events/SecretEventPublisher';
import { getLoggingClient } from './logging/LoggingClient';
import { AuditService } from './AuditService';

export interface VaultConfiguration {
  id: string;
  name: string;
  description?: string;
  backend: string;
  scope: 'GLOBAL' | 'ORGANIZATION';
  organizationId?: string;
  isActive: boolean;
  isDefault: boolean;
  lastHealthCheck?: Date;
  healthStatus: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
  createdAt: Date;
  createdById: string;
  updatedAt: Date;
}

export interface CreateVaultParams {
  name: string;
  description?: string;
  backend: string;
  scope: 'GLOBAL' | 'ORGANIZATION';
  organizationId?: string;
  config: BackendConfig;
  isDefault?: boolean;
}

export class VaultService {
  private db = getDatabaseClient() as any;
  private encryptionService: EncryptionService;
  private keyManager: KeyManager;
  private auditService: AuditService;
  
  constructor() {
    this.keyManager = new KeyManager();
    this.encryptionService = new EncryptionService(this.keyManager);
    this.auditService = new AuditService();
  }
  
  /**
   * Create vault configuration
   */
  async createVault(
    params: CreateVaultParams,
    createdById: string
  ): Promise<VaultConfiguration> {
    // Encrypt configuration
    const configJson = JSON.stringify(params.config);
    const encryptedConfig = await this.encryptionService.encrypt(configJson);
    
    // If this is set as default, unset other defaults for the same scope
    if (params.isDefault) {
      await this.db.secret_vault_configurations.updateMany({
        where: {
          scope: params.scope,
          organizationId: params.organizationId || null,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }
    
    // Create vault configuration
    const vault = await this.db.secret_vault_configurations.create({
      data: {
        name: params.name,
        description: params.description || null,
        backend: params.backend as any,
        scope: params.scope,
        organizationId: params.organizationId || null,
        encryptedConfig: encryptedConfig.encryptedValue,
        isActive: true,
        isDefault: params.isDefault || false,
        healthStatus: 'UNKNOWN',
        createdById,
      },
    });
    
    // Test connection
    try {
      await this.healthCheck(vault.id);
    } catch (error: any) {
      // Log but don't fail creation
      await getLoggingClient().sendLog({
        level: 'warn',
        message: 'Health check failed for vault during creation',
        service: 'secret-management',
        metadata: {
          vaultId: vault.id,
          vaultName: vault.name,
          error: error.message || String(error),
        },
      });
    }
    
    const vaultConfig = this.mapToVaultConfiguration(vault);
    
    // Publish event
    await publishSecretEvent(
      SecretEvents.vaultConfigured({
        vaultId: vault.id,
        vaultName: vault.name,
        backendType: vault.backend,
        organizationId: vault.organizationId || undefined,
        actorId: createdById,
      })
    );
    
    // Log operation
    await getLoggingClient().sendLog({
      level: 'info',
      message: 'Vault configured',
      service: 'secret-management',
      metadata: {
        vaultId: vault.id,
        vaultName: vault.name,
        backendType: vault.backend,
        organizationId: vault.organizationId || undefined,
        userId: createdById,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'VAULT_CONFIGURED',
      actorId: createdById,
      organizationId: vault.organizationId || undefined,
      action: 'Configure vault',
      details: {
        vaultId: vault.id,
        vaultName: vault.name,
        backendType: vault.backend,
        scope: vault.scope,
      },
    });
    
    return vaultConfig;
  }
  
  /**
   * Get vault configuration
   */
  async getVault(vaultId: string): Promise<VaultConfiguration> {
    const vault = await this.db.secret_vault_configurations.findUnique({
      where: { id: vaultId },
    });
    
    if (!vault) {
      throw new VaultNotConfiguredError(vaultId);
    }
    
    return this.mapToVaultConfiguration(vault);
  }
  
  /**
   * List vault configurations
   */
  async listVaults(params: {
    scope?: 'GLOBAL' | 'ORGANIZATION';
    organizationId?: string;
  }): Promise<VaultConfiguration[]> {
    const where: any = {};
    
    if (params.scope) {
      where.scope = params.scope;
    }
    
    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }
    
    const vaults = await this.db.secret_vault_configurations.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return vaults.map((v: any) => this.mapToVaultConfiguration(v));
  }
  
  /**
   * Update vault configuration
   */
  async updateVault(
    vaultId: string,
    updates: {
      name?: string;
      description?: string;
      config?: BackendConfig;
      isActive?: boolean;
      isDefault?: boolean;
    }
  ): Promise<VaultConfiguration> {
    const vault = await this.db.secret_vault_configurations.findUnique({
      where: { id: vaultId },
    });
    
    if (!vault) {
      throw new VaultNotConfiguredError(vaultId);
    }
    
    const updateData: any = {};
    
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }
    
    if (updates.config) {
      const configJson = JSON.stringify(updates.config);
      const encryptedConfig = await this.encryptionService.encrypt(configJson);
      updateData.encryptedConfig = encryptedConfig.encryptedValue;
    }
    
    if (updates.isActive !== undefined) {
      updateData.isActive = updates.isActive;
    }
    
    if (updates.isDefault) {
      // Unset other defaults
      await this.db.secret_vault_configurations.updateMany({
        where: {
          scope: vault.scope,
          organizationId: vault.organizationId,
          isDefault: true,
          id: { not: vaultId },
        },
        data: {
          isDefault: false,
        },
      });
      
      updateData.isDefault = true;
    }
    
    const updated = await this.db.secret_vault_configurations.update({
      where: { id: vaultId },
      data: updateData,
    });
    
    // Test connection if config was updated
    if (updates.config) {
      try {
        await this.healthCheck(vaultId);
      } catch (error: any) {
        await getLoggingClient().sendLog({
          level: 'warn',
          message: 'Health check failed for vault after update',
          service: 'secret-management',
          metadata: {
            vaultId,
            vaultName: vault.name,
            error: error.message || String(error),
          },
        });
      }
    }
    
    return this.mapToVaultConfiguration(updated);
  }
  
  /**
   * Delete vault configuration
   */
  async deleteVault(vaultId: string): Promise<void> {
    const vault = await this.db.secret_vault_configurations.findUnique({
      where: { id: vaultId },
    });
    
    if (!vault) {
      throw new VaultNotConfiguredError(vaultId);
    }
    
    // Check if vault is in use
    const where: any = {
      storageBackend: vault.backend,
    };
    
    // Add scope matching
    if (vault.scope === 'ORGANIZATION' && vault.organizationId) {
      where.organizationId = vault.organizationId;
    } else if (vault.scope === 'GLOBAL') {
      where.scope = 'GLOBAL';
    }
    
    const secretsUsingVault = await this.db.secret_secrets.count({
      where,
    });
    
    if (secretsUsingVault > 0) {
      throw new Error(
        `Cannot delete vault: ${secretsUsingVault} secrets are using this vault`
      );
    }
    
    await this.db.secret_vault_configurations.delete({
      where: { id: vaultId },
    });
  }
  
  /**
   * Check vault health
   */
  async healthCheck(vaultId: string): Promise<HealthCheckResult> {
    const vault = await this.db.secret_vault_configurations.findUnique({
      where: { id: vaultId },
    });
    
    if (!vault) {
      throw new VaultNotConfiguredError(vaultId);
    }
    
    // Decrypt configuration
    const config = await this.getDecryptedConfig(vault);
    
    // Create backend instance
    const backend = await BackendFactory.createBackend(config);
    
    // Perform health check
    const result = await backend.healthCheck();
    
    // Update health status
    await this.db.secret_vault_configurations.update({
      where: { id: vaultId },
      data: {
        lastHealthCheck: new Date(),
        healthStatus: result.status === 'healthy' ? 'HEALTHY' : 'UNHEALTHY',
      },
    });
    
    if (result.status === 'unhealthy') {
      // Publish health check failed event
      await publishSecretEvent(
        SecretEvents.vaultHealthCheckFailed({
          vaultId,
          vaultName: vault.name,
          organizationId: vault.organizationId || undefined,
          error: result.message || 'Health check failed',
        })
      );
      
      // Log error
      await getLoggingClient().sendLog({
        level: 'warn',
        message: 'Vault health check failed',
        service: 'secret-management',
        metadata: {
          vaultId,
          vaultName: vault.name,
          error: result.message,
          organizationId: vault.organizationId || undefined,
        },
      });
      
      throw new VaultConnectionError(
        vaultId,
        result.message || 'Health check failed'
      );
    }
    
    // Log successful health check
    await getLoggingClient().sendLog({
      level: 'debug',
      message: 'Vault health check passed',
      service: 'secret-management',
      metadata: {
        vaultId,
        vaultName: vault.name,
        latencyMs: result.latencyMs,
        organizationId: vault.organizationId || undefined,
      },
    });
    
    return result;
  }
  
  /**
   * Get default vault for scope
   */
  async getDefaultVault(
    scope: 'GLOBAL' | 'ORGANIZATION',
    organizationId?: string
  ): Promise<VaultConfiguration | null> {
    const vault = await this.db.secret_vault_configurations.findFirst({
      where: {
        scope,
        organizationId: organizationId || null,
        isDefault: true,
        isActive: true,
      },
    });
    
    if (!vault) {
      return null;
    }
    
    return this.mapToVaultConfiguration(vault);
  }
  
  /**
   * Get default vault for backend type and scope
   */
  async getDefaultVaultByBackend(
    backend: string,
    scope: 'GLOBAL' | 'ORGANIZATION',
    organizationId?: string
  ): Promise<VaultConfiguration | null> {
    const vault = await this.db.secret_vault_configurations.findFirst({
      where: {
        backend: backend as any,
        scope,
        organizationId: organizationId || null,
        isDefault: true,
        isActive: true,
      },
    });
    
    if (!vault) {
      return null;
    }
    
    return this.mapToVaultConfiguration(vault);
  }
  
  /**
   * Get vault configuration (decrypted)
   */
  async getVaultConfig(vaultId: string): Promise<BackendConfig> {
    const vault = await this.db.secret_vault_configurations.findUnique({
      where: { id: vaultId },
    });
    
    if (!vault) {
      throw new VaultNotConfiguredError(vaultId);
    }
    
    return await this.getDecryptedConfig(vault);
  }
  
  /**
   * Get decrypted configuration
   */
  private async getDecryptedConfig(vault: any): Promise<BackendConfig> {
    // Use active key to decrypt (vault configs encrypted with current active key)
    // In future, we could store keyId/version with vault config for key rotation support
    const activeKey = await this.keyManager.getActiveKey();
    const decrypted = await this.encryptionService.decrypt({
      encryptedValue: vault.encryptedConfig,
      encryptionKeyId: activeKey.keyId,
      encryptionKeyVersion: activeKey.version,
    });
    
    return JSON.parse(decrypted) as BackendConfig;
  }
  
  /**
   * Map database model to VaultConfiguration
   */
  private mapToVaultConfiguration(vault: any): VaultConfiguration {
    return {
      id: vault.id,
      name: vault.name,
      description: vault.description || undefined,
      backend: vault.backend,
      scope: vault.scope,
      organizationId: vault.organizationId || undefined,
      isActive: vault.isActive,
      isDefault: vault.isDefault,
      lastHealthCheck: vault.lastHealthCheck || undefined,
      healthStatus: vault.healthStatus,
      createdAt: vault.createdAt,
      createdById: vault.createdById,
      updatedAt: vault.updatedAt,
    };
  }
}

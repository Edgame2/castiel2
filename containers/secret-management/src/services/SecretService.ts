/**
 * Secret Service
 * 
 * Core service for managing secrets with full CRUD operations,
 * encryption, versioning, and lifecycle management.
 */

import { getDatabaseClient } from '@coder/shared';
import {
  CreateSecretParams,
  UpdateSecretParams,
  ListSecretsParams,
  SecretMetadata,
  AnySecretValue,
  SecretContext,
} from '../types';
import {
  SecretNotFoundError,
  SecretAlreadyExistsError,
  InvalidSecretValueError,
  SecretExpiredError,
} from '../errors/SecretErrors';
import { EncryptionService } from './encryption/EncryptionService';
import { KeyManager } from './encryption/KeyManager';
import { BackendFactory } from './backends/BackendFactory';
import { VaultService } from './VaultService';
import { AccessController } from './access/AccessController';
import { ScopeValidator } from './access/ScopeValidator';
import { SecretStorageBackend, BackendConfig } from '../types/backend.types';
import { publishSecretEvent, SecretEvents } from './events/SecretEventPublisher';
import { getLoggingClient } from './logging/LoggingClient';
import { AuditService } from './AuditService';
import { validateSecretValue, validateSecretName } from '../utils/validation';

export class SecretService {
  private db = getDatabaseClient();
  private encryptionService: EncryptionService;
  private keyManager: KeyManager;
  private vaultService: VaultService;
  private accessController: AccessController;
  private auditService: AuditService;
  
  constructor() {
    this.keyManager = new KeyManager();
    this.encryptionService = new EncryptionService(this.keyManager);
    this.vaultService = new VaultService();
    this.accessController = new AccessController();
    this.auditService = new AuditService();
  }
  
  /**
   * Create a new secret
   */
  async createSecret(
    params: CreateSecretParams,
    context: SecretContext
  ): Promise<SecretMetadata> {
    // Validate scope
    if (!ScopeValidator.validateScope(params.scope, context)) {
      throw new InvalidSecretValueError(
        params.scope,
        'Invalid scope for provided context'
      );
    }
    
    // Check if user can create secret at this scope
    const canCreate = await this.accessController.canCreateSecret(
      params.scope,
      context
    );
    
    if (!canCreate.allowed) {
      throw new Error(canCreate.reason || 'Cannot create secret at this scope');
    }
    
    // Validate secret name
    validateSecretName(params.name);
    
    // Validate secret value
    validateSecretValue(params.type, params.value);
    
    // Check for duplicate name at scope
    const existing = await this.db.secret_secrets.findFirst({
      where: {
        name: params.name,
        scope: params.scope,
        organizationId: params.scope === 'ORGANIZATION' ? params.organizationId : undefined,
        teamId: params.scope === 'TEAM' ? params.teamId : undefined,
        projectId: params.scope === 'PROJECT' ? params.projectId : undefined,
        userId: params.scope === 'USER' ? context.userId : undefined,
        deletedAt: null,
      },
    });
    
    if (existing) {
      throw new SecretAlreadyExistsError(params.name, params.scope);
    }
    
    // Determine storage backend
    const storageBackend = params.storageBackend || 'LOCAL_ENCRYPTED';
    const isExternalVault = storageBackend !== 'LOCAL_ENCRYPTED';
    
    // Get backend and vault config if external vault
    let backend: SecretStorageBackend | null = null;
    let vaultSecretId: string | null = null;
    let encryptedValue: string | null = null;
    let encryptionKeyId: string | null = null;
    
    if (isExternalVault) {
      // Get vault configuration for this backend type and scope
      const vaultScope = params.scope === 'GLOBAL' ? 'GLOBAL' : 'ORGANIZATION';
      const vaultConfig = await this.vaultService.getDefaultVaultByBackend(
        storageBackend,
        vaultScope,
        params.organizationId
      );
      
      if (!vaultConfig) {
        throw new Error(`No vault configuration found for backend ${storageBackend} at scope ${vaultScope}`);
      }
      
      // Get vault config and initialize backend
      const backendConfig = await this.vaultService.getVaultConfig(vaultConfig.id);
      
      backend = await BackendFactory.createBackend(backendConfig);
      
      // Store secret in external vault
      const storeResult = await backend.storeSecret({
        name: params.name,
        value: params.value,
        metadata: {
          type: params.type,
          scope: params.scope,
          ...(params.metadata || {}),
        },
        expiresAt: params.expiresAt,
      });
      
      vaultSecretId = storeResult.secretRef;
    } else {
      // Local storage: encrypt and store in database
      encryptedValue = await this.encryptionService.encryptSecretValue(params.value);
      const activeKey = await this.keyManager.getActiveKey();
      encryptionKeyId = activeKey.keyId;
    }
    
    // Calculate next rotation date
    const nextRotationAt = params.rotationEnabled && params.rotationIntervalDays
      ? new Date(Date.now() + params.rotationIntervalDays * 24 * 60 * 60 * 1000)
      : null;
    
    // Create secret record
    const secret = await this.db.secret_secrets.create({
      data: {
        name: params.name,
        description: params.description || null,
        type: params.type,
        scope: params.scope,
        storageBackend,
        encryptedValue,
        encryptionKeyId,
        vaultSecretId,
        organizationId: params.organizationId || null,
        teamId: params.teamId || null,
        projectId: params.projectId || null,
        userId: params.scope === 'USER' ? context.userId : null,
        expiresAt: params.expiresAt || null,
        rotationEnabled: params.rotationEnabled || false,
        rotationIntervalDays: params.rotationIntervalDays || null,
        nextRotationAt,
        tags: params.tags || [],
        metadata: params.metadata || null,
        createdById: context.userId,
        // Create initial version
        versions: {
          create: {
            version: 1,
            encryptedValue,
            encryptionKeyId: activeKey.keyId,
            changeReason: 'Initial version',
            createdById: context.userId,
            isActive: true,
          },
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    const metadata = this.mapToMetadata(secret);
    
    // Publish event
    await publishSecretEvent(
      SecretEvents.secretCreated({
        secretId: metadata.id,
        secretName: metadata.name,
        secretScope: metadata.scope,
        organizationId: metadata.organizationId,
        userId: metadata.userId,
        actorId: context.userId,
        metadata: params.metadata,
      })
    );
    
    // Log operation
    await getLoggingClient().sendLog({
      level: 'info',
      message: 'Secret created',
      service: 'secret-management',
      metadata: {
        secretId: metadata.id,
        secretName: metadata.name,
        secretScope: metadata.scope,
        organizationId: metadata.organizationId,
        userId: context.userId,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'SECRET_CREATED',
      actorId: context.userId,
      organizationId: metadata.organizationId,
      teamId: metadata.teamId,
      projectId: metadata.projectId,
      secretId: metadata.id,
      secretName: metadata.name,
      secretScope: metadata.scope,
      action: 'Create secret',
    });
    
    return metadata;
  }
  
  /**
   * Get secret metadata (without value)
   */
  async getSecretMetadata(
    secretId: string,
    context: SecretContext
  ): Promise<SecretMetadata> {
    // Check access
    const access = await this.accessController.checkAccess(
      secretId,
      'VIEW_METADATA',
      context
    );
    
    if (!access.allowed) {
      throw new Error(access.reason || 'Access denied');
    }
    
    const secret = await this.db.secret_secrets.findUnique({
      where: { id: secretId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    if (!secret) {
      throw new SecretNotFoundError(secretId);
    }
    
    return this.mapToMetadata(secret);
  }
  
  /**
   * Get secret value
   */
  async getSecretValue(
    secretId: string,
    context: SecretContext
  ): Promise<AnySecretValue> {
    // Check access
    const access = await this.accessController.checkAccess(
      secretId,
      'READ',
      context
    );
    
    if (!access.allowed) {
      throw new Error(access.reason || 'Access denied');
    }
    
    const secret = await this.db.secret_secrets.findUnique({
      where: { id: secretId },
    });
    
    if (!secret) {
      throw new SecretNotFoundError(secretId);
    }
    
    // Check expiration
    if (secret.expiresAt && secret.expiresAt < new Date()) {
      throw new SecretExpiredError(secretId, secret.expiresAt);
    }
    
    // Retrieve value based on storage backend
    let value: AnySecretValue;
    
    if (secret.storageBackend === 'LOCAL_ENCRYPTED') {
      // Local storage: decrypt from database
      if (!secret.encryptedValue || !secret.encryptionKeyId) {
        throw new SecretNotFoundError(secretId);
      }
      
      value = await this.encryptionService.decryptSecretValue(
        secret.encryptedValue,
        secret.encryptionKeyId,
        secret.currentVersion
      );
    } else {
      // External vault: retrieve from vault
      if (!secret.vaultSecretId) {
        throw new SecretNotFoundError(secretId);
      }
      
      // Get vault configuration and backend
      const vaultScope = secret.scope === 'GLOBAL' ? 'GLOBAL' : 'ORGANIZATION';
      const vaultConfig = await this.vaultService.getDefaultVaultByBackend(
        secret.storageBackend,
        vaultScope,
        secret.organizationId || undefined
      );
      
      if (!vaultConfig) {
        throw new Error(`No vault configuration found for backend ${secret.storageBackend} at scope ${vaultScope}`);
      }
      
      const backendConfig = await this.vaultService.getVaultConfig(vaultConfig.id);
      const backend = await BackendFactory.createBackend(backendConfig);
      
      // Retrieve from vault
      const result = await backend.retrieveSecret({
        secretRef: secret.vaultSecretId,
      });
      
      value = result.value;
    }
    
    // Track usage
    await this.trackUsage(secretId, context);
    
    // Log access
    await getLoggingClient().sendLog({
      level: 'debug',
      message: 'Secret value retrieved',
      service: 'secret-management',
      metadata: {
        secretId,
        secretName: secret.name,
        userId: context.userId,
        organizationId: context.organizationId,
        consumerModule: context.consumerModule,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'SECRET_READ',
      actorId: context.userId,
      organizationId: secret.organizationId || undefined,
      teamId: secret.teamId || undefined,
      projectId: secret.projectId || undefined,
      secretId,
      secretName: secret.name,
      secretScope: secret.scope,
      action: 'Read secret value',
    });
    
    return value;
  }
  
  /**
   * Update secret
   */
  async updateSecret(
    secretId: string,
    params: UpdateSecretParams,
    context: SecretContext
  ): Promise<SecretMetadata> {
    // Check access
    const access = await this.accessController.checkAccess(
      secretId,
      'UPDATE',
      context
    );
    
    if (!access.allowed) {
      throw new Error(access.reason || 'Access denied');
    }
    
    const secret = await this.db.secret_secrets.findUnique({
      where: { id: secretId },
    });
    
    if (!secret) {
      throw new SecretNotFoundError(secretId);
    }
    
    // Validate value if provided
    if (params.value) {
      validateSecretValue(secret.type, params.value);
    }
    
    // Prepare update data
    const updateData: any = {
      updatedById: context.userId,
    };
    
    if (params.description !== undefined) {
      updateData.description = params.description;
    }
    
    if (params.expiresAt !== undefined) {
      updateData.expiresAt = params.expiresAt;
    }
    
    if (params.rotationEnabled !== undefined) {
      updateData.rotationEnabled = params.rotationEnabled;
    }
    
    if (params.rotationIntervalDays !== undefined) {
      updateData.rotationIntervalDays = params.rotationIntervalDays;
      
      // Recalculate next rotation
      if (params.rotationEnabled && params.rotationIntervalDays) {
        updateData.nextRotationAt = new Date(
          Date.now() + params.rotationIntervalDays * 24 * 60 * 60 * 1000
        );
      }
    }
    
    if (params.tags !== undefined) {
      updateData.tags = params.tags;
    }
    
    if (params.metadata !== undefined) {
      updateData.metadata = params.metadata;
    }
    
    // If value is updated, create new version
    if (params.value) {
      if (secret.storageBackend === 'LOCAL_ENCRYPTED') {
        // Local storage: encrypt and store in database
        const encryptedValue = await this.encryptionService.encryptSecretValue(params.value);
        const activeKey = await this.keyManager.getActiveKey();
        
        // Deactivate old version
        await this.db.secret_versions.updateMany({
          where: {
            secretId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
        
        // Create new version
        await this.db.secret_versions.create({
          data: {
            secretId,
            version: secret.currentVersion + 1,
            encryptedValue,
            encryptionKeyId: activeKey.keyId,
            changeReason: params.changeReason || 'Secret updated',
            createdById: context.userId,
            isActive: true,
          },
        });
        
        updateData.encryptedValue = encryptedValue;
        updateData.encryptionKeyId = activeKey.keyId;
        updateData.currentVersion = secret.currentVersion + 1;
      } else {
        // External vault: update in vault
        if (!secret.vaultSecretId) {
          throw new SecretNotFoundError(secretId);
        }
        
        // Get vault configuration and backend
        const vaultScope = secret.scope === 'GLOBAL' ? 'GLOBAL' : 'ORGANIZATION';
        const vaultConfig = await this.vaultService.getDefaultVaultByBackend(
          secret.storageBackend,
          vaultScope,
          secret.organizationId || undefined
        );
        
        if (!vaultConfig) {
          throw new Error(`No vault configuration found for backend ${secret.storageBackend} at scope ${vaultScope}`);
        }
        
        const backendConfig = await this.vaultService.getVaultConfig(vaultConfig.id);
        const backend = await BackendFactory.createBackend(backendConfig);
        
        // Update in vault (creates new version)
        const updateResult = await backend.updateSecret({
          secretRef: secret.vaultSecretId,
          value: params.value,
          metadata: {
            type: secret.type,
            scope: secret.scope,
            ...(params.metadata || {}),
          },
          expiresAt: params.expiresAt || secret.expiresAt || undefined,
        });
        
        // Update version in database
        updateData.currentVersion = secret.currentVersion + 1;
        
        // Note: vaultSecretId remains the same, but vault has new version
      }
    }
    
    // Update secret
    const updated = await this.db.secret_secrets.update({
      where: { id: secretId },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    const metadata = this.mapToMetadata(updated);
    
    // Publish event
    await publishSecretEvent(
      SecretEvents.secretUpdated({
        secretId: metadata.id,
        secretName: metadata.name,
        secretScope: metadata.scope,
        organizationId: metadata.organizationId,
        actorId: context.userId,
        changeReason: params.changeReason,
      })
    );
    
    // Log operation
    await getLoggingClient().sendLog({
      level: 'info',
      message: 'Secret updated',
      service: 'secret-management',
      metadata: {
        secretId: metadata.id,
        secretName: metadata.name,
        userId: context.userId,
        organizationId: metadata.organizationId,
        newVersion: metadata.currentVersion,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'SECRET_UPDATED',
      actorId: context.userId,
      organizationId: metadata.organizationId,
      teamId: metadata.teamId,
      projectId: metadata.projectId,
      secretId: metadata.id,
      secretName: metadata.name,
      secretScope: metadata.scope,
      action: 'Update secret',
      details: { changeReason: params.changeReason },
    });
    
    return metadata;
  }
  
  /**
   * List secrets
   */
  async listSecrets(
    params: ListSecretsParams,
    context: SecretContext
  ): Promise<SecretMetadata[]> {
    const where: any = {
      deletedAt: null,
    };
    
    // Apply scope filter
    if (params.scope) {
      where.scope = params.scope;
      
      // Apply scope-based access control
      // Users can only list secrets in scopes they have access to
      if (params.scope === 'GLOBAL') {
        // Only super admin can list global secrets
        // Access control will be enforced by filtering results
      } else if (params.scope === 'ORGANIZATION') {
        // Filter by organization
        where.organizationId = params.organizationId || context.organizationId;
      } else if (params.scope === 'TEAM') {
        // Filter by team
        where.teamId = params.teamId || context.teamId;
      } else if (params.scope === 'PROJECT') {
        // Filter by project
        where.projectId = params.projectId || context.projectId;
      } else if (params.scope === 'USER') {
        // Filter by user
        where.userId = params.userId || context.userId;
      }
    } else {
      // No scope specified - apply context-based filtering
      if (context.organizationId) {
        where.OR = [
          { scope: 'GLOBAL' },
          { scope: 'ORGANIZATION', organizationId: context.organizationId },
          { scope: 'TEAM', teamId: context.teamId },
          { scope: 'PROJECT', projectId: context.projectId },
          { scope: 'USER', userId: context.userId },
        ];
      } else {
        // No organization context - only global and user secrets
        where.OR = [
          { scope: 'GLOBAL' },
          { scope: 'USER', userId: context.userId },
        ];
      }
    }
    
    // Apply type filter
    if (params.type) {
      where.type = params.type;
    }
    
    // Apply explicit scope context (overrides scope-based filtering)
    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }
    if (params.teamId) {
      where.teamId = params.teamId;
    }
    if (params.projectId) {
      where.projectId = params.projectId;
    }
    if (params.userId) {
      where.userId = params.userId;
    }
    
    // Apply tags filter
    if (params.tags && params.tags.length > 0) {
      where.tags = {
        hasEvery: params.tags,
      };
    }
    
    // Apply search
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    
    // Include deleted if requested
    if (params.includeDeleted) {
      delete where.deletedAt;
    }
    
    const secrets = await this.db.secret_secrets.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        scope: true,
        organizationId: true,
        teamId: true,
        projectId: true,
        userId: true,
        storageBackend: true,
        tags: true,
        metadata: true,
        expiresAt: true,
        rotationEnabled: true,
        rotationIntervalDays: true,
        lastRotatedAt: true,
        nextRotationAt: true,
        currentVersion: true,
        deletedAt: true,
        deletedById: true,
        recoveryDeadline: true,
        createdAt: true,
        createdById: true,
        updatedAt: true,
        updatedById: true,
      },
      take: params.limit || 50,
      skip: params.page ? (params.page - 1) * (params.limit || 50) : 0,
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return secrets.map((s: any) => this.mapToMetadata(s));
  }
  
  /**
   * Delete secret (soft delete)
   */
  async deleteSecret(
    secretId: string,
    context: SecretContext
  ): Promise<void> {
    // Check access
    const access = await this.accessController.checkAccess(
      secretId,
      'DELETE',
      context
    );
    
    if (!access.allowed) {
      throw new Error(access.reason || 'Access denied');
    }
    
    // Get secret metadata for event
    const secret = await this.db.secret_secrets.findUnique({
      where: { id: secretId },
    });
    
    if (!secret) {
      throw new SecretNotFoundError(secretId);
    }
    
    // For external vaults, we only soft delete in database
    // The actual secret in the vault remains (can be recovered)
    // For permanent delete, we'll delete from vault
    
    // Soft delete
    const recoveryDeadline = new Date();
    recoveryDeadline.setDate(recoveryDeadline.getDate() + 30); // 30 days recovery
    
    await this.db.secret_secrets.update({
      where: { id: secretId },
      data: {
        deletedAt: new Date(),
        deletedById: context.userId,
        recoveryDeadline,
      },
    });
    
    // Publish event
    await publishSecretEvent(
      SecretEvents.secretDeleted({
        secretId: secret.id,
        secretName: secret.name,
        secretScope: secret.scope,
        organizationId: secret.organizationId,
        actorId: context.userId,
      })
    );
    
    // Log operation
    await getLoggingClient().sendLog({
      level: 'info',
      message: 'Secret deleted',
      service: 'secret-management',
      metadata: {
        secretId: secret.id,
        secretName: secret.name,
        userId: context.userId,
        organizationId: secret.organizationId,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'SECRET_DELETED',
      actorId: context.userId,
      organizationId: secret.organizationId,
      teamId: secret.teamId,
      projectId: secret.projectId,
      secretId: secret.id,
      secretName: secret.name,
      secretScope: secret.scope,
      action: 'Delete secret',
    });
  }
  
  /**
   * Get storage backend
   */
  private async getBackend(backendType: string): Promise<SecretStorageBackend> {
    const config = { type: backendType } as any;
    return await BackendFactory.createBackend(config);
  }
  
  /**
   * Track secret usage
   */
  private async trackUsage(secretId: string, context: SecretContext): Promise<void> {
    await this.db.secret_usage.create({
      data: {
        secretId,
        consumerModule: context.consumerModule,
        consumerResourceId: context.consumerResourceId || null,
        organizationId: context.organizationId || '',
        userId: context.userId,
      },
    });
  }
  
  /**
   * Map database model to SecretMetadata
   */
  private mapToMetadata(secret: any): SecretMetadata {
    return {
      id: secret.id,
      name: secret.name,
      description: secret.description || undefined,
      type: secret.type,
      scope: secret.scope,
      organizationId: secret.organizationId || undefined,
      teamId: secret.teamId || undefined,
      projectId: secret.projectId || undefined,
      userId: secret.userId || undefined,
      storageBackend: secret.storageBackend,
      tags: secret.tags || [],
      metadata: secret.metadata ? (secret.metadata as Record<string, unknown>) : undefined,
      expiresAt: secret.expiresAt ? new Date(secret.expiresAt) : undefined,
      rotationEnabled: secret.rotationEnabled,
      rotationIntervalDays: secret.rotationIntervalDays || undefined,
      lastRotatedAt: secret.lastRotatedAt ? new Date(secret.lastRotatedAt) : undefined,
      nextRotationAt: secret.nextRotationAt ? new Date(secret.nextRotationAt) : undefined,
      currentVersion: secret.currentVersion,
      deletedAt: secret.deletedAt ? new Date(secret.deletedAt) : undefined,
      deletedById: secret.deletedById || undefined,
      recoveryDeadline: secret.recoveryDeadline ? new Date(secret.recoveryDeadline) : undefined,
      createdAt: new Date(secret.createdAt),
      createdById: secret.createdById,
      updatedAt: new Date(secret.updatedAt),
      updatedById: secret.updatedById || undefined,
    };
  }
}

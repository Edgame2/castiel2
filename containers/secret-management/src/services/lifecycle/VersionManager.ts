/**
 * Version Manager
 * 
 * Manages secret versioning and rollback operations.
 */

import { getDatabaseClient } from '@coder/shared';
import { EncryptionService } from '../encryption/EncryptionService';
import { KeyManager } from '../encryption/KeyManager';
import { VersionNotFoundError } from '../../errors/SecretErrors';
import { SecretVersionInfo, AnySecretValue } from '../../types';
import { getLoggingClient } from '../logging/LoggingClient';
import { AuditService } from '../AuditService';

export class VersionManager {
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
   * Get version history for a secret
   */
  async getVersionHistory(secretId: string): Promise<SecretVersionInfo[]> {
    const versions = await this.db.secret_versions.findMany({
      where: {
        secretId,
      },
      orderBy: {
        version: 'desc',
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
    
    return versions.map((v: any) => ({
      version: v.version,
      isActive: v.isActive,
      changeReason: v.changeReason || undefined,
      createdAt: v.createdAt,
      createdBy: {
        id: v.createdById,
        name: v.createdBy?.name || undefined,
      },
    }));
  }
  
  /**
   * Get specific version value
   */
  async getVersionValue(
    secretId: string,
    version: number
  ): Promise<AnySecretValue> {
    const versionRecord = await this.db.secret_versions.findFirst({
      where: {
        secretId,
        version,
      },
    });
    
    if (!versionRecord || !versionRecord.encryptedValue || !versionRecord.encryptionKeyId) {
      throw new VersionNotFoundError(secretId, version);
    }
    
    // Decrypt version value
    const value = await this.encryptionService.decryptSecretValue(
      versionRecord.encryptedValue,
      versionRecord.encryptionKeyId,
      version
    );
    
    return value;
  }
  
  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(
    secretId: string,
    targetVersion: number,
    context: { userId: string }
  ): Promise<{ newVersion: number }> {
    // Get target version
    const targetVersionRecord = await this.db.secret_versions.findFirst({
      where: {
        secretId,
        version: targetVersion,
      },
    });
    
    if (!targetVersionRecord) {
      throw new VersionNotFoundError(secretId, targetVersion);
    }
    
    // Get current secret
    const secret = await this.db.secret_secrets.findUnique({
      where: { id: secretId },
    });
    
    if (!secret) {
      throw new VersionNotFoundError(secretId, targetVersion);
    }
    
    // Deactivate all current versions
    await this.db.secret_versions.updateMany({
      where: {
        secretId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
    
    // Create new version from target version
    const newVersion = secret.currentVersion + 1;
    
    await this.db.secret_versions.create({
      data: {
        secretId,
        version: newVersion,
        encryptedValue: targetVersionRecord.encryptedValue,
        encryptionKeyId: targetVersionRecord.encryptionKeyId,
        changeReason: `Rollback to version ${targetVersion}`,
        createdById: context.userId,
        isActive: true,
      },
    });
    
    // Update secret current version
    await this.db.secret_secrets.update({
      where: { id: secretId },
      data: {
        currentVersion: newVersion,
        encryptedValue: targetVersionRecord.encryptedValue,
        encryptionKeyId: targetVersionRecord.encryptionKeyId,
        updatedById: context.userId,
      },
    });

    // Log rollback (use existing secret for audit metadata)
    await getLoggingClient().sendLog({
      level: 'info',
      message: 'Secret rolled back to previous version',
      service: 'secret-management',
      metadata: {
        secretId,
        secretName: secret?.name,
        fromVersion: secret?.currentVersion,
        toVersion: targetVersion,
        newVersion,
        userId: context.userId,
        organizationId: secret?.organizationId || undefined,
      },
    });
    
    // Audit log
    if (secret) {
      await this.auditService.log({
        eventType: 'SECRET_UPDATED',
        actorId: context.userId,
        organizationId: secret.organizationId || undefined,
        secretId,
        secretName: secret.name,
        secretScope: secret.scope,
        action: 'Rollback to version',
        details: {
          fromVersion: secret.currentVersion,
          toVersion: targetVersion,
          newVersion,
        },
      });
    }
    
    return { newVersion };
  }
}

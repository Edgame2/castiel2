/**
 * Soft Delete Manager
 * 
 * Manages soft deletion and recovery of secrets.
 */

import { getDatabaseClient } from '@coder/shared';
import { SecretNotFoundError, RecoveryPeriodExpiredError } from '../../errors/SecretErrors';
import { publishSecretEvent, SecretEvents } from '../events/SecretEventPublisher';
import { getLoggingClient } from '../logging/LoggingClient';
import { AuditService } from '../AuditService';

export class SoftDeleteManager {
  private get db() {
    return getDatabaseClient() as any;
  }
  private auditService: AuditService;
  private readonly RECOVERY_PERIOD_DAYS = 30;
  
  constructor() {
    this.auditService = new AuditService();
  }
  
  /**
   * Restore a soft-deleted secret
   */
  async restoreSecret(secretId: string, restoredById: string): Promise<void> {
    const secret = await this.db.secret_secrets.findUnique({
      where: { id: secretId },
    });
    
    if (!secret) {
      throw new SecretNotFoundError(secretId);
    }
    
    if (!secret.deletedAt) {
      throw new Error('Secret is not deleted');
    }
    
    // Check if recovery period has expired
    if (secret.recoveryDeadline && secret.recoveryDeadline < new Date()) {
      throw new RecoveryPeriodExpiredError(secretId, secret.recoveryDeadline);
    }
    
    // Restore secret
    const restored = await this.db.secret_secrets.update({
      where: { id: secretId },
      data: {
        deletedAt: null,
        deletedById: null,
        recoveryDeadline: null,
        updatedById: restoredById,
      },
    });
    
    // Publish restore event
    await publishSecretEvent(
      SecretEvents.secretRestored({
        secretId,
        secretName: restored.name,
        organizationId: restored.organizationId || undefined,
        actorId: restoredById,
      })
    );
    
    // Log restore
    await getLoggingClient().sendLog({
      level: 'info',
      message: 'Secret restored',
      service: 'secret-management',
      metadata: {
        secretId,
        secretName: restored.name,
        userId: restoredById,
        organizationId: restored.organizationId || undefined,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'SECRET_RESTORED',
      actorId: restoredById,
      organizationId: restored.organizationId || undefined,
      secretId,
      secretName: restored.name,
      secretScope: restored.scope,
      action: 'Restore secret',
    });
  }
  
  /**
   * Permanently delete secrets past recovery deadline
   */
  async permanentlyDeleteExpired(): Promise<number> {
    const now = new Date();
    
    // Find secrets past recovery deadline
    const expiredSecrets = await this.db.secret_secrets.findMany({
      where: {
        deletedAt: {
          not: null,
        },
        recoveryDeadline: {
          lt: now,
        },
      },
      select: {
        id: true,
        storageBackend: true,
        vaultSecretId: true,
        scope: true,
        organizationId: true,
        name: true,
      },
    });
    
    // Permanently delete
    for (const secret of expiredSecrets) {
      // If external vault, delete from vault first
      if (secret.storageBackend !== 'LOCAL_ENCRYPTED' && secret.vaultSecretId) {
        try {
          const { VaultService } = await import('../VaultService');
          const { BackendFactory } = await import('../backends/BackendFactory');
          const vaultService = new VaultService();
          
          // Get vault configuration and backend
          const vaultScope = secret.scope === 'GLOBAL' ? 'GLOBAL' : 'ORGANIZATION';
          const vaultConfig = await vaultService.getDefaultVaultByBackend(
            secret.storageBackend,
            vaultScope,
            secret.organizationId || undefined
          );
          
          if (vaultConfig) {
            const backendConfig = await vaultService.getVaultConfig(vaultConfig.id);
            const backend = await BackendFactory.createBackend(backendConfig);
            
            // Delete from vault
            await backend.deleteSecret({
              secretRef: secret.vaultSecretId,
            });
          }
        } catch (error: any) {
          // Log error but continue with database deletion
          await getLoggingClient().sendLog({
            level: 'error',
            message: 'Failed to delete secret from vault during permanent deletion',
            service: 'secret-management',
            metadata: {
              secretId: secret.id,
              storageBackend: secret.storageBackend,
              error: error.message,
            },
          });
        }
      }
      
      // Delete versions first
      await this.db.secret_versions.deleteMany({
        where: {
          secretId: secret.id,
        },
      });
      
      // Delete access grants
      await this.db.secret_access_grants.deleteMany({
        where: {
          secretId: secret.id,
        },
      });
      
      // Delete usage records
      await this.db.secret_usage.deleteMany({
        where: {
          secretId: secret.id,
        },
      });
      
      // Delete secret from database
      await this.db.secret_secrets.delete({
        where: { id: secret.id },
      });
      
      // Publish permanent delete event
      await publishSecretEvent(
        SecretEvents.secretPermanentlyDeleted({
          secretId: secret.id,
          secretName: secret.name,
          organizationId: secret.organizationId || undefined,
          actorId: 'system',
        })
      );
      
      // Audit log
      await this.auditService.log({
        eventType: 'SECRET_PERMANENTLY_DELETED',
        actorType: 'SYSTEM',
        actorId: 'system',
        organizationId: secret.organizationId || undefined,
        secretId: secret.id,
        secretName: secret.name,
        action: 'Permanently delete secret',
      });
    }
    
    return expiredSecrets.length;
  }
  
  /**
   * Get recovery deadline for a secret
   */
  getRecoveryDeadline(deletedAt: Date | null): Date | null {
    if (!deletedAt) {
      return null;
    }
    
    const deadline = new Date(deletedAt);
    deadline.setDate(deadline.getDate() + this.RECOVERY_PERIOD_DAYS);
    return deadline;
  }
}

/**
 * Migration Service
 * 
 * Handles migration of secrets between storage backends.
 */

import { getDatabaseClient } from '@coder/shared';
import { SecretService } from '../SecretService';
import { VaultService } from '../VaultService';
import { SecretContext } from '../../types';
import { publishSecretEvent, SecretEvents } from '../events/SecretEventPublisher';
import { getLoggingClient } from '../logging/LoggingClient';
import { AuditService } from '../AuditService';

export interface MigrationResult {
  migrated: number;
  failed: number;
  errors: Array<{ secretId: string; error: string }>;
}

export interface MigrationProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

export class MigrationService {
  private secretService: SecretService;
  private vaultService: VaultService;
  private auditService: AuditService;
  
  constructor() {
    this.secretService = new SecretService();
    this.vaultService = new VaultService();
    this.auditService = new AuditService();
  }
  
  /**
   * Migrate secrets from one vault to another
   */
  async migrateSecrets(
    sourceVaultId: string,
    targetVaultId: string,
    secretIds?: string[],
    context?: SecretContext
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      migrated: 0,
      failed: 0,
      errors: [],
    };
    
    // Get vault configurations
    const sourceVault = await this.vaultService.getVault(sourceVaultId);
    const targetVault = await this.vaultService.getVault(targetVaultId);
    
    // Get secrets to migrate
    let secrets;
    if (secretIds && secretIds.length > 0) {
      // Migrate specific secrets
      secrets = [];
      for (const secretId of secretIds) {
        try {
          const secret = await this.secretService.getSecretMetadata(
            secretId,
            context || { userId: 'system', consumerModule: 'migration' }
          );
          secrets.push(secret);
        } catch (error) {
          result.errors.push({
            secretId,
            error: error instanceof Error ? error.message : String(error),
          });
          result.failed++;
        }
      }
    } else {
      // Migrate all secrets using source vault
      const listParams = {
        // Filter by storage backend - list all and filter
      };
      const allSecrets = await this.secretService.listSecrets(
        listParams,
        context || { userId: 'system', consumerModule: 'migration' }
      );
      
      // Filter to only secrets using source vault
      secrets = allSecrets.filter(s => s.storageBackend === sourceVault.backend);
    }
    
    // Migrate each secret
    for (const secret of secrets) {
      try {
        await this.migrateSecret(secret.id, sourceVault, targetVault, context);
        result.migrated++;
      } catch (error: any) {
        result.errors.push({
          secretId: secret.id,
          error: error.message || String(error),
        });
        result.failed++;
      }
    }
    
    // Publish migration event
    await publishSecretEvent(
      SecretEvents.secretsMigrated({
        organizationId: context?.organizationId ?? '',
        actorId: context?.userId ?? 'system',
        migratedCount: result.migrated,
        failedCount: result.failed,
        sourceVault: sourceVault.name,
        targetVault: targetVault.name,
      })
    );
    
    // Log migration
    await getLoggingClient().sendLog({
      level: result.failed > 0 ? 'warn' : 'info',
      message: 'Secrets migrated between vaults',
      service: 'secret-management',
      metadata: {
        migrated: result.migrated,
        failed: result.failed,
        sourceVault: sourceVault.name,
        targetVault: targetVault.name,
        organizationId: context?.organizationId,
        userId: context?.userId,
      },
    });
    
    // Audit log
    await this.auditService.log({
      eventType: 'SECRETS_MIGRATED',
      actorId: context?.userId ?? 'system',
      organizationId: context?.organizationId ?? 'system',
      action: 'Migrate secrets between vaults',
      details: {
        migrated: result.migrated,
        failed: result.failed,
        sourceVault: sourceVault.name,
        targetVault: targetVault.name,
        sourceVaultId: sourceVault.id,
        targetVaultId: targetVault.id,
      },
    });
    
    return result;
  }
  
  /**
   * Migrate a single secret
   */
  private async migrateSecret(
    secretId: string,
    sourceVault: any,
    targetVault: any,
    context?: SecretContext
  ): Promise<void> {
    // Get secret value from source
    const value = await this.secretService.getSecretValue(
      secretId,
      context || { userId: 'system', consumerModule: 'migration' }
    );
    
    // Get secret metadata
    await this.secretService.getSecretMetadata(
      secretId,
      context || { userId: 'system', consumerModule: 'migration' }
    );
    
    // Update secret to use target vault
    // This will re-encrypt and store in new backend
    await this.secretService.updateSecret(
      secretId,
      {
        value,
        changeReason: `Migrated from ${sourceVault.name} to ${targetVault.name}`,
      },
      context || { userId: 'system', consumerModule: 'migration' }
    );
    
    // Update storage backend reference in database
    const db = getDatabaseClient() as { secret_secrets?: { update: (arg: { where: { id: string }; data: { storageBackend: unknown } }) => Promise<unknown> } };
    if (db.secret_secrets?.update) {
      await db.secret_secrets.update({
        where: { id: secretId },
        data: {
          storageBackend: targetVault.backend as any,
        },
      });
    }
  }
}

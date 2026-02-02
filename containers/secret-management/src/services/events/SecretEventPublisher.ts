/**
 * Secret Event Publisher
 *
 * Publishes secret-related events to RabbitMQ for notification service consumption.
 */

import { EventPublisher } from '@coder/shared';
import { getConfig } from '../../config';

let sharedPublisher: EventPublisher | null = null;

function getPublisher(): EventPublisher {
  if (!sharedPublisher) {
    const config = getConfig();
    const rabbitmq = config.rabbitmq ?? {};
    sharedPublisher = new EventPublisher(
      {
        url: rabbitmq.url ?? 'amqp://localhost:5672',
        exchange: rabbitmq.exchange ?? 'coder.events',
      },
      'secret-management'
    );
  }
  return sharedPublisher;
}

export interface SecretEvent {
  type: string;
  timestamp: string;
  organizationId?: string;
  userId?: string;
  actorId?: string;
  secretId?: string;
  secretName?: string;
  secretScope?: string;
  data?: Record<string, any>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  };
}

/**
 * Publish a secret event to RabbitMQ
 */
export async function publishSecretEvent(
  event: SecretEvent,
  _routingKey?: string
): Promise<void> {
  try {
    const publisher = getPublisher();
    const tenantId = event.organizationId ?? 'default';
    await publisher.publish(event.type, tenantId, event);
  } catch (error: unknown) {
    console.error('Failed to publish secret event to RabbitMQ', {
      eventType: event.type,
      secretId: event.secretId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Publish multiple secret events in batch
 */
export async function publishSecretEventsBatch(
  events: SecretEvent[],
  _routingKey?: string
): Promise<void> {
  try {
    const publisher = getPublisher();
    for (const event of events) {
      await publisher.publish(
        event.type,
        event.organizationId ?? 'default',
        event
      );
    }
  } catch (error: unknown) {
    console.error('Failed to publish batch secret events to RabbitMQ', {
      count: events.length,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Event factory functions for common secret events
 */
export const SecretEvents = {
  secretCreated: (params: {
    secretId: string;
    secretName: string;
    secretScope: string;
    organizationId?: string;
    userId?: string;
    actorId: string;
    metadata?: Record<string, any>;
  }): SecretEvent => ({
    type: 'secret.created',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    userId: params.userId,
    actorId: params.actorId,
    secretId: params.secretId,
    secretName: params.secretName,
    secretScope: params.secretScope,
    data: params.metadata,
  }),

  secretUpdated: (params: {
    secretId: string;
    secretName: string;
    secretScope: string;
    organizationId?: string;
    actorId: string;
    changeReason?: string;
  }): SecretEvent => ({
    type: 'secret.updated',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    actorId: params.actorId,
    secretId: params.secretId,
    secretName: params.secretName,
    secretScope: params.secretScope,
    data: { changeReason: params.changeReason },
  }),

  secretDeleted: (params: {
    secretId: string;
    secretName: string;
    secretScope: string;
    organizationId?: string;
    actorId: string;
  }): SecretEvent => ({
    type: 'secret.deleted',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    actorId: params.actorId,
    secretId: params.secretId,
    secretName: params.secretName,
    secretScope: params.secretScope,
  }),

  secretPermanentlyDeleted: (params: {
    secretId: string;
    secretName: string;
    organizationId?: string;
    actorId: string;
  }): SecretEvent => ({
    type: 'secret.permanently_deleted',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    actorId: params.actorId,
    secretId: params.secretId,
    secretName: params.secretName,
  }),

  secretRestored: (params: {
    secretId: string;
    secretName: string;
    organizationId?: string;
    actorId: string;
  }): SecretEvent => ({
    type: 'secret.restored',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    actorId: params.actorId,
    secretId: params.secretId,
    secretName: params.secretName,
  }),

  secretExpiringSoon: (params: {
    secretId: string;
    secretName: string;
    secretScope: string;
    organizationId?: string;
    daysUntilExpiration: number;
  }): SecretEvent => ({
    type: 'secret.expiring_soon',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    secretId: params.secretId,
    secretName: params.secretName,
    secretScope: params.secretScope,
    data: { daysUntilExpiration: params.daysUntilExpiration },
  }),

  secretExpired: (params: {
    secretId: string;
    secretName: string;
    secretScope: string;
    organizationId?: string;
  }): SecretEvent => ({
    type: 'secret.expired',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    secretId: params.secretId,
    secretName: params.secretName,
    secretScope: params.secretScope,
  }),

  secretRotated: (params: {
    secretId: string;
    secretName: string;
    secretScope: string;
    organizationId?: string;
    actorId: string;
    newVersion: number;
  }): SecretEvent => ({
    type: 'secret.rotated',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    actorId: params.actorId,
    secretId: params.secretId,
    secretName: params.secretName,
    secretScope: params.secretScope,
    data: { newVersion: params.newVersion },
  }),

  secretRotationDue: (params: {
    secretId: string;
    secretName: string;
    organizationId?: string;
  }): SecretEvent => ({
    type: 'secret.rotation_due',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    secretId: params.secretId,
    secretName: params.secretName,
  }),

  secretRotationFailed: (params: {
    secretId: string;
    secretName: string;
    organizationId?: string;
    error: string;
  }): SecretEvent => ({
    type: 'secret.rotation_failed',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    secretId: params.secretId,
    secretName: params.secretName,
    data: { error: params.error },
  }),

  accessGranted: (params: {
    secretId: string;
    secretName: string;
    granteeId: string;
    granteeType: string;
    organizationId?: string;
    actorId: string;
  }): SecretEvent => ({
    type: 'secret.access_granted',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    actorId: params.actorId,
    secretId: params.secretId,
    secretName: params.secretName,
    data: {
      granteeId: params.granteeId,
      granteeType: params.granteeType,
    },
  }),

  accessRevoked: (params: {
    secretId: string;
    secretName: string;
    granteeId: string;
    organizationId?: string;
    actorId: string;
  }): SecretEvent => ({
    type: 'secret.access_revoked',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    actorId: params.actorId,
    secretId: params.secretId,
    secretName: params.secretName,
    data: { granteeId: params.granteeId },
  }),

  certificateExpiring: (params: {
    secretId: string;
    secretName: string;
    organizationId?: string;
    daysUntilExpiration: number;
  }): SecretEvent => ({
    type: 'secret.certificate_expiring',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    secretId: params.secretId,
    secretName: params.secretName,
    data: { daysUntilExpiration: params.daysUntilExpiration },
  }),

  certificateExpired: (params: {
    secretId: string;
    secretName: string;
    organizationId?: string;
  }): SecretEvent => ({
    type: 'secret.certificate_expired',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    secretId: params.secretId,
    secretName: params.secretName,
  }),

  vaultConfigured: (params: {
    vaultId: string;
    vaultName: string;
    backendType: string;
    organizationId?: string;
    actorId: string;
  }): SecretEvent => ({
    type: 'secret.vault_configured',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    actorId: params.actorId,
    data: {
      vaultId: params.vaultId,
      vaultName: params.vaultName,
      backendType: params.backendType,
    },
  }),

  vaultHealthCheckFailed: (params: {
    vaultId: string;
    vaultName: string;
    organizationId?: string;
    error: string;
  }): SecretEvent => ({
    type: 'secret.vault_health_check_failed',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    data: {
      vaultId: params.vaultId,
      vaultName: params.vaultName,
      error: params.error,
    },
  }),

  secretsImported: (params: {
    organizationId?: string;
    actorId: string;
    importedCount: number;
    skippedCount: number;
    format: string;
  }): SecretEvent => ({
    type: 'secret.import_started',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    actorId: params.actorId,
    data: {
      importedCount: params.importedCount,
      skippedCount: params.skippedCount,
      format: params.format,
    },
  }),

  secretsExported: (params: {
    organizationId?: string;
    actorId: string;
    secretCount: number;
    format: string;
    includeValues: boolean;
  }): SecretEvent => ({
    type: 'secret.export_completed',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    actorId: params.actorId,
    data: {
      secretCount: params.secretCount,
      format: params.format,
      includeValues: params.includeValues,
    },
  }),

  secretsMigrated: (params: {
    organizationId?: string;
    actorId: string;
    migratedCount: number;
    failedCount: number;
    sourceVault: string;
    targetVault: string;
  }): SecretEvent => ({
    type: 'secret.migration_completed',
    timestamp: new Date().toISOString(),
    organizationId: params.organizationId,
    actorId: params.actorId,
    data: {
      migratedCount: params.migratedCount,
      failedCount: params.failedCount,
      sourceVault: params.sourceVault,
      targetVault: params.targetVault,
    },
  }),
};

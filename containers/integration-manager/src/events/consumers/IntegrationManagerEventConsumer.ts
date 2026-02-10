/**
 * Event consumer for integration manager
 * Handles sync scheduling events and other integration-related events
 */

import { parseExpression } from 'cron-parser';
import { EventConsumer, EventPublisher, getContainer } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';
import { IntegrationService } from '../../services/IntegrationService';
import { Integration } from '../../types/integration.types';

let consumer: EventConsumer | null = null;
let publisher: EventPublisher | null = null;
let integrationService: IntegrationService | null = null;

/**
 * Initialize event consumer
 */
export async function initializeEventConsumer(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event consumption disabled', { service: 'integration-manager' });
    return;
  }
  
  try {
    // Initialize integration service
    // Note: IntegrationService needs secretManagementUrl - get from config
    const secretManagementUrl = config.services.secret_management?.url || '';
    if (!secretManagementUrl) {
      log.warn('Secret management URL not configured', { service: 'integration-manager' });
      return;
    }
    
    integrationService = new IntegrationService(secretManagementUrl);
    
    // Initialize event publisher
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'integration-manager'
    );
    
    const routingKeys = config.rabbitmq.routingKeys?.length
      ? config.rabbitmq.routingKeys
      : ['integration.sync.check_due', 'integration.token.check-expiring', 'integration.*'];
    consumer = new EventConsumer({
      url: config.rabbitmq.url,
      exchange: config.rabbitmq.exchange || 'coder_events',
      queue: config.rabbitmq.queue,
      routingKeys,
    });

    // Handle check_due event from sync scheduler
    consumer.on('integration.sync.check_due', async (event) => {
      const data = event?.data ?? {};
      log.info('Check-due event received, checking for integrations due for sync', {
        timestamp: data.timestamp,
        service: 'integration-manager',
      });

      if (!integrationService || !publisher) {
        log.error('Integration service or publisher not initialized', { service: 'integration-manager' });
        return;
      }

      try {
        const now = new Date(data.timestamp || Date.now());
        await checkAndScheduleDueIntegrations(now, publisher);
      } catch (error: unknown) {
        log.error('Failed to check for due integrations', error instanceof Error ? error : new Error(String(error)), {
          service: 'integration-manager',
        });
      }
    });

    // Handle token check-expiring event from token refresh worker
    consumer.on('integration.token.check-expiring', async (event) => {
      const data = event?.data ?? {};
      log.info('Token check-expiring event received, checking for expiring OAuth tokens', {
        timestamp: data.timestamp,
        thresholdTime: data.thresholdTime,
        service: 'integration-manager',
      });

      if (!publisher) {
        log.error('Event publisher not initialized', { service: 'integration-manager' });
        return;
      }

      try {
        const now = new Date(data.timestamp || Date.now());
        const thresholdTime = new Date(data.thresholdTime || Date.now());
        await checkAndRefreshExpiringTokens(now, thresholdTime, publisher);
      } catch (error: unknown) {
        log.error('Failed to check for expiring tokens', error instanceof Error ? error : new Error(String(error)), {
          service: 'integration-manager',
        });
      }
    });

    await consumer.start();
    log.info('Integration manager event consumer initialized and started', { service: 'integration-manager' });
  } catch (error) {
    log.error('Failed to initialize event consumer', error, { service: 'integration-manager' });
    throw error;
  }
}

/**
 * Check for integrations due for sync and publish scheduled events
 */
async function checkAndScheduleDueIntegrations(now: Date, publisher: EventPublisher): Promise<void> {
  try {
    const container = getContainer('integration_integrations');
    
    // Query all integrations with sync enabled and nextSyncAt <= now
    // Note: Cosmos DB queries are tenant-scoped, so we need to query per tenant
    // For MVP, we'll query with a filter that works across tenants
    // In production, you might want to maintain a list of active tenants
    
    // Query for integrations with:
    // - syncConfig.syncEnabled === true
    // - nextSyncAt <= now
    // - status === 'connected'
    
    // Since Cosmos DB queries are partition-scoped (by tenantId), we need to query per tenant
    // For MVP, we'll query all integrations and filter client-side
    // In production, you might want to:
    // 1. Maintain a list of active tenants
    // 2. Use a cross-partition query (if supported)
    // 3. Maintain a separate index of due integrations
    
    // For now, we'll query with enableCrossPartitionQuery
    const query = `
      SELECT * FROM c 
      WHERE c.syncConfig.syncEnabled = true 
        AND c.nextSyncAt <= @now
        AND c.status = 'connected'
    `;
    
    try {
      // Query with cross-partition support
      // Note: Cross-partition queries are expensive but necessary for this use case
      // Since we need to query across all tenants, we use enableCrossPartitionQuery
      const querySpec = {
        query,
        parameters: [
          { name: '@now', value: now.toISOString() },
        ],
      };
      
      const { resources } = await container.items
        .query<Integration>(querySpec, { enableCrossPartitionQuery: true } as Parameters<typeof container.items.query>[1])
        .fetchAll();
      
      if (!resources || resources.length === 0) {
        log.debug('No integrations due for sync', {
          timestamp: now.toISOString(),
          service: 'integration-manager',
        });
        return;
      }
      
      log.info('Found integrations due for sync', {
        count: resources.length,
        service: 'integration-manager',
      });
      
      // Publish scheduled events for each due integration
      for (const integration of resources) {
        try {
          await publisher.publish(
            'integration.sync.scheduled',
            integration.tenantId,
            {
              integrationId: integration.id,
              tenantId: integration.tenantId,
              trigger: 'scheduled',
              scheduledAt: now.toISOString(),
            }
          );
          
          // Calculate and update nextSyncAt
          const nextSyncAt = calculateNextSyncAt(integration, now);
          if (nextSyncAt) {
            await updateIntegrationNextSyncAt(integration.id, integration.tenantId, nextSyncAt);
          }
        } catch (error: unknown) {
          log.error('Failed to schedule sync for integration', error instanceof Error ? error : new Error(String(error)), {
            integrationId: integration.id,
            tenantId: integration.tenantId,
            service: 'integration-manager',
          });
        }
      }
    } catch (error: unknown) {
      // Cross-partition query might not be supported or might fail
      log.warn('Cross-partition query failed, may need tenant-specific queries', {
        error: error instanceof Error ? error.message : String(error),
        service: 'integration-manager',
      });
    }
  } catch (error: unknown) {
    log.error('Failed to check for due integrations', error instanceof Error ? error : new Error(String(error)), { service: 'integration-manager' });
  }
}

/**
 * Calculate next sync time based on sync frequency
 */
function calculateNextSyncAt(integration: Integration, now: Date): Date | null {
  if (!integration.syncConfig?.syncFrequency) {
    return null;
  }

  const frequency = integration.syncConfig.syncFrequency;

  switch (frequency.type) {
    case 'interval':
      if (frequency.intervalMinutes) {
        const nextSync = new Date(now);
        nextSync.setMinutes(nextSync.getMinutes() + frequency.intervalMinutes);
        return nextSync;
      }
      break;

    case 'cron':
      if (frequency.cronExpression) {
        try {
          const interval = parseExpression(frequency.cronExpression, { currentDate: now });
          return interval.next().toDate();
        } catch (err: unknown) {
          log.warn('Invalid cron expression, falling back to interval', {
            cronExpression: frequency.cronExpression,
            error: err instanceof Error ? err.message : String(err),
            service: 'integration-manager',
          });
        }
      }
      if (frequency.intervalMinutes) {
        const nextSync = new Date(now);
        nextSync.setMinutes(nextSync.getMinutes() + frequency.intervalMinutes);
        return nextSync;
      }
      break;

    case 'manual':
      return null;
  }

  return null;
}

/**
 * Update integration's nextSyncAt
 */
async function updateIntegrationNextSyncAt(
  integrationId: string,
  tenantId: string,
  nextSyncAt: Date
): Promise<void> {
  try {
    const container = getContainer('integration_integrations');
    const { resource: integration } = await container.item(integrationId, tenantId).read();
    
    if (!integration) {
      log.warn('Integration not found for nextSyncAt update', {
        integrationId,
        tenantId,
        service: 'integration-manager',
      });
      return;
    }
    
    await container.item(integrationId, tenantId).replace({
      ...integration,
      nextSyncAt: nextSyncAt.toISOString(),
      updatedAt: new Date(),
    });
    
    log.debug('Updated nextSyncAt for integration', {
      integrationId,
      tenantId,
      nextSyncAt: nextSyncAt.toISOString(),
      service: 'integration-manager',
    });
  } catch (error: unknown) {
    log.error('Failed to update nextSyncAt', error instanceof Error ? error : new Error(String(error)), {
      integrationId,
      tenantId,
      service: 'integration-manager',
    });
  }
}

/**
 * Check for expiring OAuth tokens and publish refresh events
 */
async function checkAndRefreshExpiringTokens(
  now: Date,
  thresholdTime: Date,
  publisher: EventPublisher
): Promise<void> {
  try {
    const container = getContainer('integration_connections');
    
    // Query for OAuth connections with expiring tokens
    // Query: oauth.expiresAt <= thresholdTime AND status = 'active' AND authType = 'oauth'
    const query = `
      SELECT * FROM c 
      WHERE c.authType = 'oauth'
        AND c.status = 'active'
        AND c.oauth.expiresAt <= @thresholdTime
        AND c.oauth.expiresAt > @now
    `;
    
    try {
      const querySpec = {
        query,
        parameters: [
          { name: '@thresholdTime', value: thresholdTime.toISOString() },
          { name: '@now', value: now.toISOString() },
        ],
      };
      
      const { resources } = await container.items
        .query<any>(querySpec, { enableCrossPartitionQuery: true } as Parameters<typeof container.items.query>[1])
        .fetchAll();

      if (!resources || resources.length === 0) {
        log.debug('No OAuth tokens need refreshing', {
          timestamp: now.toISOString(),
          thresholdTime: thresholdTime.toISOString(),
          service: 'integration-manager',
        });
        return;
      }
      
      log.info('Found OAuth connections with expiring tokens', {
        count: resources.length,
        service: 'integration-manager',
      });
      
      // Publish refresh-requested events for each expiring connection
      for (const connection of resources) {
        try {
          await publisher.publish(
            'integration.token.refresh-requested',
            connection.tenantId || 'system',
            {
              connectionId: connection.id,
              integrationId: connection.integrationId,
              tenantId: connection.tenantId,
              expiresAt: connection.oauth?.expiresAt,
              requestedAt: now.toISOString(),
            }
          );
        } catch (error: unknown) {
          log.error('Failed to publish token refresh request', error instanceof Error ? error : new Error(String(error)), {
            connectionId: connection.id,
            integrationId: connection.integrationId,
            tenantId: connection.tenantId,
            service: 'integration-manager',
          });
        }
      }
    } catch (error: unknown) {
      log.warn('Failed to query expiring tokens', {
        error: error instanceof Error ? error.message : String(error),
        service: 'integration-manager',
      });
    }
  } catch (error: unknown) {
    log.error('Failed to check for expiring tokens', error instanceof Error ? error : new Error(String(error)), { service: 'integration-manager' });
  }
}

/**
 * Close event consumer
 */
export async function closeEventConsumer(): Promise<void> {
  if (consumer) {
    await consumer.stop();
    consumer = null;
  }
  if (publisher) {
    publisher = null;
  }
}

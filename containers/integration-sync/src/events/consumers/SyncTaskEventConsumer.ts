/**
 * Sync Task Event Consumer
 * Consumes integration.sync.scheduled events and executes sync tasks
 */

import { EventConsumer } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';
import { IntegrationSyncService } from '../../services/IntegrationSyncService';
import { TokenRefreshService } from '../../services/TokenRefreshService';

/**
 * Find execution ID by sync task ID
 */
async function findExecutionIdBySyncTaskId(syncTaskId: string, tenantId: string): Promise<string | null> {
  try {
    const container = getContainer('integration_executions');
    const { resources } = await container.items
      .query({
        query: 'SELECT TOP 1 * FROM c WHERE c.taskId = @taskId AND c.tenantId = @tenantId ORDER BY c.createdAt DESC',
        parameters: [
          { name: '@taskId', value: syncTaskId },
          { name: '@tenantId', value: tenantId },
        ],
      }, { partitionKey: tenantId })
      .fetchNext();
    return resources?.[0]?.id || resources?.[0]?.executionId || null;
  } catch (error) {
    log.error('Failed to find execution by sync task ID', error, { syncTaskId, tenantId, service: 'integration-sync' });
    return null;
  }
}

let consumer: EventConsumer | null = null;
let integrationSyncService: IntegrationSyncService | null = null;
let tokenRefreshService: TokenRefreshService | null = null;

export async function initializeEventConsumer(app?: FastifyInstance): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event consumption disabled', { service: 'integration-sync' });
    return;
  }
  
  try {
    // Initialize integration sync service
    integrationSyncService = new IntegrationSyncService(app);
    
    // Initialize token refresh service (for handling refresh-requested events)
    tokenRefreshService = new TokenRefreshService(app);
    
    consumer = new EventConsumer({
      url: config.rabbitmq.url,
      exchange: config.rabbitmq.exchange || 'coder_events',
      queue: `${config.rabbitmq.queue}_sync_tasks`, // Separate queue for sync task events
      routingKeys: [
        'integration.sync.scheduled',
        'integration.webhook.received',
        'integration.token.refresh-requested',
        'integration.data.mapped',
        'integration.data.mapping.failed',
      ],
    });

    // Handle scheduled sync events: only sync enabled entity mappings
    consumer.on('integration.sync.scheduled', async (event) => {
      const integrationId = event.data?.integrationId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!integrationId || !tenantId) {
        log.warn('integration.sync.scheduled missing integrationId or tenantId', { hasData: !!event.data, service: 'integration-sync' });
        return;
      }
      log.info('Scheduled sync event received', { integrationId, tenantId, trigger: event.data?.trigger, service: 'integration-sync' });

      if (!integrationSyncService) {
        log.error('Integration sync service not initialized', { service: 'integration-sync' });
        return;
      }

      try {
        const integration = await integrationSyncService.getIntegration(integrationId, tenantId);
        const entityMappings = integration?.syncConfig?.entityMappings ?? [];
        const enabledEntities = entityMappings
          .filter((m: { externalEntity: string; enabled?: boolean }) => m.enabled !== false)
          .map((m: { externalEntity: string }) => m.externalEntity);

        if (enabledEntities.length > 0) {
          for (const entityType of enabledEntities) {
            try {
              const task = await integrationSyncService.createSyncTask(
                tenantId,
                integrationId,
                'inbound',
                entityType,
                undefined
              );
              await integrationSyncService.executeSyncTask(task.taskId, tenantId);
            } catch (err: unknown) {
              log.error('Scheduled sync failed for entity type', err instanceof Error ? err : new Error(String(err)), {
                integrationId,
                tenantId,
                entityType,
                service: 'integration-sync',
              });
            }
          }
        } else if (entityMappings.length === 0) {
          const task = await integrationSyncService.createSyncTask(
            tenantId,
            integrationId,
            'inbound',
            undefined,
            undefined
          );
          await integrationSyncService.executeSyncTask(task.taskId, tenantId);
        }
      } catch (error: unknown) {
        log.error('Failed to execute scheduled sync', error instanceof Error ? error : new Error(String(error)), { integrationId, tenantId, service: 'integration-sync' });
      }
    });

    // Handle webhook-triggered syncs
    consumer.on('integration.webhook.received', async (event) => {
      const data = event?.data ?? {};
      const integrationId = data.integrationId;
      const tenantId = event.tenantId ?? data.tenantId;
      if (!integrationId || !tenantId) {
        log.warn('integration.webhook.received missing integrationId or tenantId', { hasData: !!event?.data, service: 'integration-sync' });
        return;
      }
      log.info('Webhook event received, triggering sync', { integrationId, tenantId, service: 'integration-sync' });

      if (!integrationSyncService) {
        log.error('Integration sync service not initialized', { service: 'integration-sync' });
        return;
      }

      try {
        const task = await integrationSyncService.createSyncTask(
          tenantId,
          integrationId,
          'inbound',
          data.entityType,
          data.filters
        );
        await integrationSyncService.executeSyncTask(task.taskId, tenantId);
      } catch (error: unknown) {
        log.error('Failed to execute webhook sync', error instanceof Error ? error : new Error(String(error)), {
          integrationId,
          tenantId,
          service: 'integration-sync',
        });
      }
    });

    // Handle token refresh-requested events
    consumer.on('integration.token.refresh-requested', async (event) => {
      const connectionId = event.data?.connectionId;
      const integrationId = event.data?.integrationId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!connectionId || !integrationId || !tenantId) {
        log.warn('integration.token.refresh-requested missing connectionId, integrationId or tenantId', { hasData: !!event.data, service: 'integration-sync' });
        return;
      }
      log.info('Token refresh requested event received', { connectionId, integrationId, tenantId, service: 'integration-sync' });

      if (!tokenRefreshService) {
        log.error('Token refresh service not initialized', { service: 'integration-sync' });
        return;
      }

      try {
        await tokenRefreshService.refreshConnectionTokens({ id: connectionId, integrationId, tenantId });
      } catch (error: unknown) {
        log.error('Failed to handle token refresh request', error instanceof Error ? error : new Error(String(error)), { connectionId, integrationId, tenantId, service: 'integration-sync' });
      }
    });

    // Handle mapping completion events (for tracking sync execution progress)
    consumer.on('integration.data.mapped', async (event) => {
      const data = event.data ?? {};
      const executionId = data.syncTaskId ? await findExecutionIdBySyncTaskId(data.syncTaskId, event.tenantId) : null;
      const tenantId = event.tenantId ?? data.tenantId;

      if (!executionId || !tenantId) {
        log.debug('integration.data.mapped missing executionId or tenantId', {
          hasData: !!event.data,
          syncTaskId: data.syncTaskId,
          service: 'integration-sync',
        });
        return;
      }

      log.debug('Mapping completed for record', {
        executionId,
        shardId: data.shardId,
        externalId: data.externalId,
        service: 'integration-sync',
      });

      if (!integrationSyncService) {
        log.error('Integration sync service not initialized', { service: 'integration-sync' });
        return;
      }

      try {
        // Determine if this was a create or update
        // Check if shard was just created (createdAt === updatedAt) or updated
        const isCreate = data.created === true || (data.createdAt && data.updatedAt && data.createdAt === data.updatedAt);
        
        await integrationSyncService.updateSyncExecutionStats(executionId, tenantId, {
          created: isCreate ? 1 : 0,
          updated: isCreate ? 0 : 1,
        });
      } catch (error: unknown) {
        log.error('Failed to update sync execution stats', error instanceof Error ? error : new Error(String(error)), {
          executionId,
          tenantId,
          service: 'integration-sync',
        });
      }
    });

    // Handle mapping failure events
    consumer.on('integration.data.mapping.failed', async (event) => {
      const data = event.data ?? {};
      const executionId = data.syncTaskId ? await findExecutionIdBySyncTaskId(data.syncTaskId, event.tenantId) : null;
      const tenantId = event.tenantId ?? data.tenantId;

      if (!executionId || !tenantId) {
        log.debug('integration.data.mapping.failed missing executionId or tenantId', {
          hasData: !!event.data,
          syncTaskId: data.syncTaskId,
          service: 'integration-sync',
        });
        return;
      }

      log.warn('Mapping failed for record', {
        executionId,
        externalId: data.externalId,
        error: data.error,
        service: 'integration-sync',
      });

      if (!integrationSyncService) {
        log.error('Integration sync service not initialized', { service: 'integration-sync' });
        return;
      }

      try {
        await integrationSyncService.updateSyncExecutionStats(executionId, tenantId, {
          failed: 1,
        });
      } catch (error: unknown) {
        log.error('Failed to update sync execution stats for failure', error instanceof Error ? error : new Error(String(error)), {
          executionId,
          tenantId,
          service: 'integration-sync',
        });
      }
    });

    await consumer.start();
    log.info('Sync task event consumer initialized and started', { service: 'integration-sync' });
  } catch (error) {
    log.error('Failed to initialize sync task event consumer', error, { service: 'integration-sync' });
    throw error;
  }
}

export async function closeEventConsumer(): Promise<void> {
  if (consumer) {
    await consumer.stop();
    consumer = null;
  }
}

/**
 * Sync Task Event Consumer
 * Consumes integration.sync.scheduled events and executes sync tasks
 */

import { EventConsumer } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';
import { IntegrationSyncService } from '../../services/IntegrationSyncService';
import { TokenRefreshService } from '../../services/TokenRefreshService';

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
      routingKeys: ['integration.sync.scheduled', 'integration.webhook.received', 'integration.token.refresh-requested'],
    });

    // Handle scheduled sync events
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
        const task = await integrationSyncService.createSyncTask(
          tenantId,
          integrationId,
          'inbound',
          undefined,
          undefined
        );
        await integrationSyncService.executeSyncTask(task.taskId, tenantId);
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

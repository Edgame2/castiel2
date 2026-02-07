/**
 * Sync Scheduler Service
 * Automatically schedules sync tasks based on integration sync frequency
 * Hybrid approach: Timer-based interval + RabbitMQ delayed messages
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { publishIntegrationSyncEvent } from '../events/publishers/IntegrationSyncEventPublisher.js';

interface Integration {
  id: string;
  tenantId: string;
  syncConfig?: {
    syncEnabled: boolean;
    syncFrequency?: {
      type: 'interval' | 'cron' | 'manual';
      intervalMinutes?: number;
      cronExpression?: string;
    };
  };
  nextSyncAt?: string; // ISO date string
  status: string;
}

export class SyncSchedulerService {
  private config: ReturnType<typeof loadConfig>;
  private integrationManagerClient: ServiceClient;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.integrationManagerClient = new ServiceClient({
      baseURL: this.config.services.integration_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'integration-sync',
      serviceName: 'integration-sync',
      tenantId,
    });
  }

  /**
   * Start the sync scheduler
   */
  async start(): Promise<void> {
    if (this.schedulerInterval) {
      log.warn('Sync scheduler already running', { service: 'integration-sync' });
      return;
    }

    const intervalMs = this.config.sync_scheduler?.interval_ms || 60000; // Default 1 minute

    if (!this.config.sync_scheduler?.enabled) {
      log.info('Sync scheduler disabled in config', { service: 'integration-sync' });
      return;
    }

    log.info('Starting sync scheduler', {
      intervalMs,
      service: 'integration-sync',
    });

    // Run immediately on start
    await this.checkAndScheduleSyncs();

    // Then run on interval
    this.schedulerInterval = setInterval(async () => {
      if (!this.isRunning) {
        this.isRunning = true;
        try {
          await this.checkAndScheduleSyncs();
        } catch (error: unknown) {
          log.error('Sync scheduler error', error instanceof Error ? error : new Error(String(error)), { service: 'integration-sync' });
        } finally {
          this.isRunning = false;
        }
      }
    }, intervalMs);
  }

  /**
   * Stop the sync scheduler
   */
  async stop(): Promise<void> {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      log.info('Sync scheduler stopped', { service: 'integration-sync' });
    }
  }

  /**
   * Check for due syncs and schedule them
   */
  private async checkAndScheduleSyncs(): Promise<void> {
    try {
      log.debug('Checking for due syncs', { service: 'integration-sync' });

      // Get all active integrations with sync enabled
      // Note: We need to query all tenants, but we'll do it in batches
      // For now, we'll query integrations that have nextSyncAt set
      const now = new Date();
      const _batchSize = this.config.sync_scheduler?.batch_size || 100;

      // Query integrations from integration-manager
      // Since we don't have a direct way to query all tenants, we'll need to
      // get integrations that are due for sync
      // For now, we'll publish a scheduled check event and let integration-manager
      // handle the querying, or we can query per tenant if we have tenant list
      
      // Alternative: Query integration-manager for integrations with nextSyncAt <= now
      // This requires integration-manager to support this query
      // For now, we'll use a simpler approach: check integrations that have been synced recently
      
      // Get integrations that need syncing
      const dueIntegrations = await this.getDueIntegrations(now);

      if (dueIntegrations.length === 0) {
        log.debug('No integrations due for sync', { service: 'integration-sync' });
        return;
      }

      log.info('Found integrations due for sync', {
        count: dueIntegrations.length,
        service: 'integration-sync',
      });

      // Schedule syncs for each due integration
      for (const integration of dueIntegrations) {
        try {
          await this.scheduleSync(integration);
        } catch (error: unknown) {
          log.error('Failed to schedule sync for integration', error instanceof Error ? error : new Error(String(error)), {
            integrationId: integration.id,
            tenantId: integration.tenantId,
            service: 'integration-sync',
          });
        }
      }
    } catch (error: unknown) {
      log.error('Failed to check for due syncs', error instanceof Error ? error : new Error(String(error)), { service: 'integration-sync' });
    }
  }

  /**
   * Get integrations that are due for sync
   * Uses event-based approach: publishes check-due event, integration-manager responds with scheduled events
   * Alternative: Can query integration-manager directly if endpoint exists
   */
  private async getDueIntegrations(now: Date): Promise<Integration[]> {
    // For MVP, we use an event-based approach:
    // 1. Publish integration.sync.check-due event
    // 2. Integration-manager listens for this event and queries its integrations
    // 3. Integration-manager publishes integration.sync.scheduled events for due integrations
    // 4. SyncTaskEventConsumer handles those events
    
    // This approach avoids needing to query across all tenants from integration-sync
    // Integration-manager has access to all tenant integrations and can filter efficiently
    
    try {
      // Publish event to trigger integration-manager to check for due syncs
      await publishIntegrationSyncEvent('integration.sync.check-due', 'system', {
        timestamp: now.toISOString(),
        checkType: 'scheduled',
      });
      
      log.debug('Published check-due event, integration-manager will handle due sync detection', {
        timestamp: now.toISOString(),
        service: 'integration-sync',
      });
      
      // Return empty array - actual syncs will be triggered via integration.sync.scheduled events
      // from integration-manager
      return [];
    } catch (error: unknown) {
      log.error('Failed to publish check-due event', error instanceof Error ? error : new Error(String(error)), { service: 'integration-sync' });
      return [];
    }
  }

  /**
   * Schedule a sync for an integration
   */
  private async scheduleSync(integration: Integration): Promise<void> {
    try {
      log.info('Scheduling sync for integration', {
        integrationId: integration.id,
        tenantId: integration.tenantId,
        service: 'integration-sync',
      });

      // Publish RabbitMQ event to trigger sync
      await publishIntegrationSyncEvent('integration.sync.scheduled', integration.tenantId, {
        integrationId: integration.id,
        tenantId: integration.tenantId,
        trigger: 'scheduled',
        scheduledAt: new Date().toISOString(),
      });

      // Calculate next sync time based on frequency
      const nextSyncAt = this.calculateNextSyncAt(integration);
      
      // Update integration's nextSyncAt via integration-manager
      if (nextSyncAt) {
        const token = this.getServiceToken(integration.tenantId);
        try {
          await this.integrationManagerClient.put<any>(
            `/api/v1/integrations/${integration.id}`,
            {
              nextSyncAt: nextSyncAt.toISOString(),
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-ID': integration.tenantId,
              },
            }
          );
        } catch (error: unknown) {
          log.warn('Failed to update nextSyncAt', {
            error: error instanceof Error ? error.message : String(error),
            integrationId: integration.id,
            tenantId: integration.tenantId,
            service: 'integration-sync',
          });
        }
      }
    } catch (error: unknown) {
      log.error('Failed to schedule sync', error instanceof Error ? error : new Error(String(error)), {
        integrationId: integration.id,
        tenantId: integration.tenantId,
        service: 'integration-sync',
      });
      throw error;
    }
  }

  /**
   * Calculate next sync time based on sync frequency
   */
  private calculateNextSyncAt(integration: Integration): Date | null {
    if (!integration.syncConfig?.syncFrequency) {
      return null;
    }

    const frequency = integration.syncConfig.syncFrequency;
    const now = new Date();

    switch (frequency.type) {
      case 'interval':
        if (frequency.intervalMinutes) {
          const nextSync = new Date(now);
          nextSync.setMinutes(nextSync.getMinutes() + frequency.intervalMinutes);
          return nextSync;
        }
        break;

      case 'cron':
        // For cron, we'd need a cron parser
        // For MVP, we'll handle basic intervals
        // Full cron support can be added later
        if (frequency.intervalMinutes) {
          const nextSync = new Date(now);
          nextSync.setMinutes(nextSync.getMinutes() + frequency.intervalMinutes);
          return nextSync;
        }
        break;

      case 'manual':
        // Manual syncs don't have nextSyncAt
        return null;
    }

    return null;
  }
}

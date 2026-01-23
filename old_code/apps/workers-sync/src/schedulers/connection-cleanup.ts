/**
 * Connection Cleanup Scheduler
 * 
 * Periodically cleans up old unused connections and expired connections.
 * Runs daily to archive/delete unused connections.
 */

import type { InitializedServices } from '../shared/initialize-services.js';
import {
  IntegrationConnectionRepository,
} from '@castiel/api-core/workers-sync';

interface ConnectionCleanupConfig {
  databaseId: string;
  unusedDaysThreshold: number;
  expiredUnusedDaysThreshold: number;
  archiveInsteadOfDelete: boolean;
}

interface CleanupResult {
  connectionId: string;
  integrationId: string;
  tenantId: string;
  action: 'archived' | 'deleted' | 'notified';
  reason: string;
  duration: number;
}

export class ConnectionCleanupScheduler {
  private services: InitializedServices;
  private config: ConnectionCleanupConfig;
  private connectionRepo: IntegrationConnectionRepository;

  constructor(config: ConnectionCleanupConfig, services: InitializedServices) {
    this.config = config;
    this.services = services;

    // Initialize connection repository
    this.connectionRepo = new IntegrationConnectionRepository(
      services.cosmosClient,
      config.databaseId,
      'integration_connections'
    );
  }

  /**
   * Main execution
   * Runs daily to clean up connections
   */
  async execute(): Promise<void> {
    const startTime = Date.now();
    const executionId = `connection-cleanup-${Date.now()}`;

    try {
      this.services.monitoring.trackEvent('connection-cleanup.started', {
        executionId,
        timestamp: new Date().toISOString(),
      });

      // Fetch connections to clean up
      const connectionsToClean = await this.fetchConnectionsToClean();
      this.services.monitoring.trackMetric('connection-cleanup.connections-found', connectionsToClean.length);

      if (connectionsToClean.length === 0) {
        this.services.monitoring.trackEvent('connection-cleanup.no-connections', {
          executionId,
        });
        return;
      }

      // Process each connection
      const results = await this.cleanupConnections(connectionsToClean);

      const duration = Date.now() - startTime;
      const successCount = results.filter((r) => r.action !== 'notified').length;
      const failureCount = results.length - successCount;

      this.services.monitoring.trackEvent('connection-cleanup.completed', {
        executionId,
        successCount,
        failureCount,
        totalCount: results.length,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.services.monitoring.trackException(error as Error, {
        context: 'ConnectionCleanupScheduler.execute',
        executionId,
        duration,
      });
      throw error;
    }
  }

  /**
   * Fetch connections that need cleanup
   */
  private async fetchConnectionsToClean(): Promise<any[]> {
    try {
      const now = new Date();
      const unusedThreshold = new Date(now.getTime() - this.config.unusedDaysThreshold * 24 * 60 * 60 * 1000);
      const expiredUnusedThreshold = new Date(now.getTime() - this.config.expiredUnusedDaysThreshold * 24 * 60 * 60 * 1000);

      // Query for connections that need cleanup
      // Use container directly since IntegrationConnectionRepository doesn't have query method
      const { resources: connections } = await this.connectionRepo['container'].items
        .query({
          query: `
            SELECT * FROM c
            WHERE (
              (c.lastUsedAt <= @unusedThreshold AND c.status = 'active')
              OR (c.expiresAt <= @now AND c.lastUsedAt <= @expiredUnusedThreshold)
            )
            AND c.status != 'archived'
          `,
          parameters: [
            { name: '@unusedThreshold', value: unusedThreshold.toISOString() },
            { name: '@expiredUnusedThreshold', value: expiredUnusedThreshold.toISOString() },
            { name: '@now', value: now.toISOString() },
          ],
        })
        .fetchAll();

      return connections;
    } catch (error) {
      this.services.monitoring.trackException(error as Error, {
        context: 'ConnectionCleanupScheduler.fetchConnectionsToClean',
      });
      throw error;
    }
  }

  /**
   * Cleanup connections
   */
  private async cleanupConnections(
    connections: any[]
  ): Promise<CleanupResult[]> {
    const results: CleanupResult[] = [];

    for (const connection of connections) {
      const startTime = Date.now();
      const result: CleanupResult = {
        connectionId: connection.id,
        integrationId: connection.integrationId,
        tenantId: connection.tenantId,
        action: 'notified',
        reason: '',
        duration: 0,
      };

      try {
        const now = new Date();
        const lastUsedAt = connection.lastUsedAt ? new Date(connection.lastUsedAt) : null;
        const expiresAt = connection.expiresAt ? new Date(connection.expiresAt) : null;
        const unusedDays = lastUsedAt
          ? Math.floor((now.getTime() - lastUsedAt.getTime()) / (24 * 60 * 60 * 1000))
          : 0;

        // Determine action
        if (expiresAt && expiresAt <= now && unusedDays >= this.config.expiredUnusedDaysThreshold) {
          // Delete expired and unused connections
          await this.connectionRepo.delete(connection.id, connection.tenantId);
          result.action = 'deleted';
          result.reason = 'expired_and_unused';
        } else if (unusedDays >= this.config.unusedDaysThreshold) {
          // Archive or delete unused connections
          if (this.config.archiveInsteadOfDelete) {
            // Note: IntegrationConnection doesn't have archivedAt property
            // We'll just update the status to 'revoked' as a workaround
            await this.connectionRepo.update(connection.id, connection.integrationId, {
              status: 'revoked',
            });
            result.action = 'archived';
            result.reason = 'unused';
          } else {
            await this.connectionRepo.delete(connection.id, connection.tenantId);
            result.action = 'deleted';
            result.reason = 'unused';
          }
        }

        this.services.monitoring.trackEvent('connection-cleanup.connection-processed', {
          connectionId: connection.id,
          tenantId: connection.tenantId,
          action: result.action,
        });
      } catch (error) {
        this.services.monitoring.trackException(error as Error, {
          context: 'ConnectionCleanupScheduler.cleanupConnection',
          connectionId: connection.id,
        });
      } finally {
        result.duration = Date.now() - startTime;
        results.push(result);
      }
    }

    return results;
  }
}




/**
 * Token Refresh Service
 * Automatically refreshes OAuth tokens before expiration
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { publishIntegrationSyncEvent } from '../events/publishers/IntegrationSyncEventPublisher.js';

interface IntegrationConnection {
  id: string;
  integrationId: string;
  tenantId?: string;
  userId?: string;
  authType: 'oauth' | 'apikey' | 'serviceaccount' | 'basic';
  oauth?: {
    accessTokenSecretName: string;
    refreshTokenSecretName?: string;
    expiresAt?: string; // ISO date string
    scope?: string[];
  };
  status: 'active' | 'expired' | 'revoked' | 'error';
}

export class TokenRefreshService {
  private config: ReturnType<typeof loadConfig>;
  private integrationManagerClient: ServiceClient;
  private refreshInterval: NodeJS.Timeout | null = null;
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
   * Start the token refresh worker
   */
  async start(): Promise<void> {
    if (this.refreshInterval) {
      log.warn('Token refresh worker already running', { service: 'integration-sync' });
      return;
    }

    const intervalMs = this.config.token_refresh?.interval_ms || 3600000; // Default 1 hour

    if (!this.config.token_refresh?.enabled) {
      log.info('Token refresh worker disabled in config', { service: 'integration-sync' });
      return;
    }

    log.info('Starting token refresh worker', {
      intervalMs,
      service: 'integration-sync',
    });

    // Run immediately on start
    await this.checkAndRefreshTokens();

    // Then run on interval
    this.refreshInterval = setInterval(async () => {
      if (!this.isRunning) {
        this.isRunning = true;
        try {
          await this.checkAndRefreshTokens();
        } catch (error: unknown) {
          log.error('Token refresh worker error', error instanceof Error ? error : new Error(String(error)), { service: 'integration-sync' });
        } finally {
          this.isRunning = false;
        }
      }
    }, intervalMs);
  }

  /**
   * Stop the token refresh worker
   */
  async stop(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      log.info('Token refresh worker stopped', { service: 'integration-sync' });
    }
  }

  /**
   * Check for expiring tokens and refresh them
   */
  private async checkAndRefreshTokens(): Promise<void> {
    try {
      log.debug('Checking for expiring OAuth tokens', { service: 'integration-sync' });

      const now = new Date();
      const expirationThresholdMs = this.config.token_refresh?.expiration_threshold_ms || 3600000; // Default 1 hour
      const thresholdTime = new Date(now.getTime() + expirationThresholdMs);

      // Query integration-manager for OAuth connections with expiring tokens
      // Since we can't easily query across all tenants, we'll use an event-based approach
      // or query integration-manager for connections
      
      // For MVP, we'll query integration-manager for connections
      // In production, integration-manager can expose an endpoint for expiring connections
      
      const expiringConnections = await this.getExpiringConnections(now, thresholdTime);

      if (expiringConnections.length === 0) {
        log.debug('No OAuth tokens need refreshing', { service: 'integration-sync' });
        return;
      }

      log.info('Found OAuth connections with expiring tokens', {
        count: expiringConnections.length,
        service: 'integration-sync',
      });

      // Note: Since getExpiringConnections() uses event-based approach and returns empty array,
      // the actual refresh will be triggered via integration.token.refresh-requested events
      // which are handled by SyncTaskEventConsumer
      // This loop will be empty but kept for future direct query support
      for (const connection of expiringConnections) {
        try {
          await this.refreshConnectionTokens(connection);
        } catch (error: unknown) {
          log.error('Failed to refresh tokens for connection', error instanceof Error ? error : new Error(String(error)), {
            connectionId: connection.id,
            integrationId: connection.integrationId,
            tenantId: connection.tenantId,
            service: 'integration-sync',
          });
        }
      }
    } catch (error: unknown) {
      log.error('Failed to check for expiring tokens', error instanceof Error ? error : new Error(String(error)), { service: 'integration-sync' });
    }
  }

  /**
   * Get connections with expiring OAuth tokens
   * Uses event-based approach: publishes check-expiring event, integration-manager responds with refresh-requested events
   * The refresh-requested events are handled by SyncTaskEventConsumer which triggers actual refresh
   */
  private async getExpiringConnections(now: Date, thresholdTime: Date): Promise<IntegrationConnection[]> {
    // For MVP, we use an event-based approach:
    // 1. Publish integration.token.check-expiring event
    // 2. Integration-manager listens and queries connections with expiring tokens
    // 3. Integration-manager publishes integration.token.refresh-requested events
    // 4. TokenRefreshService can listen to those events, or we handle directly here
    
    try {
      // Publish event to trigger integration-manager to check for expiring tokens
      await publishIntegrationSyncEvent('integration.token.check-expiring', 'system', {
        timestamp: now.toISOString(),
        thresholdTime: thresholdTime.toISOString(),
      });
      
      log.debug('Published check-expiring event, integration-manager will handle token refresh detection', {
        timestamp: now.toISOString(),
        thresholdTime: thresholdTime.toISOString(),
        service: 'integration-sync',
      });
      
      // Return empty array - actual refreshes will be triggered via integration.token.refresh-requested events
      // from integration-manager, which are handled by SyncTaskEventConsumer
      // The TokenRefreshService.refreshConnectionTokens() will be called from the event handler
      return [];
    } catch (error: unknown) {
      log.error('Failed to get expiring connections', error instanceof Error ? error : new Error(String(error)), { service: 'integration-sync' });
      return [];
    }
  }

  /**
   * Refresh tokens for a connection
   * Can be called directly or via event handler
   */
  async refreshConnectionTokens(connection: { id: string; integrationId: string; tenantId?: string }): Promise<void> {
    if (!connection.tenantId || !connection.integrationId) {
      log.warn('Connection missing tenantId or integrationId, skipping refresh', {
        connectionId: connection.id,
        service: 'integration-sync',
      });
      return;
    }

    try {
      log.info('Refreshing OAuth tokens for connection', {
        connectionId: connection.id,
        integrationId: connection.integrationId,
        tenantId: connection.tenantId,
        service: 'integration-sync',
      });

      const token = this.getServiceToken(connection.tenantId);

      // Call integration-manager API to refresh tokens
      const response = await this.integrationManagerClient.post<{ success: boolean }>(
        `/api/v1/integrations/${connection.integrationId}/connections/${connection.id}/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': connection.tenantId,
          },
        }
      );

      if (response.success) {
        // Publish success event
        await publishIntegrationSyncEvent('integration.token.refreshed', connection.tenantId, {
          connectionId: connection.id,
          integrationId: connection.integrationId,
          refreshedAt: new Date().toISOString(),
        });

        log.info('OAuth tokens refreshed successfully', {
          connectionId: connection.id,
          integrationId: connection.integrationId,
          tenantId: connection.tenantId,
          service: 'integration-sync',
        });
      } else {
        throw new Error('Token refresh returned success: false');
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      log.error('Failed to refresh OAuth tokens', error instanceof Error ? error : new Error(errMsg), {
        connectionId: connection.id,
        integrationId: connection.integrationId,
        tenantId: connection.tenantId,
        service: 'integration-sync',
      });

      await publishIntegrationSyncEvent('integration.token.refresh.failed', connection.tenantId || 'system', {
        connectionId: connection.id,
        integrationId: connection.integrationId,
        error: errMsg,
        failedAt: new Date().toISOString(),
      });

      try {
        const token = this.getServiceToken(connection.tenantId || '');
        await this.integrationManagerClient.put<unknown>(
          `/api/v1/integrations/${connection.integrationId}`,
          {
            status: 'error',
            connectionError: `Token refresh failed: ${errMsg}`,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': connection.tenantId,
            },
          }
        );
      } catch (updateError: unknown) {
        log.error('Failed to disable integration after token refresh failure', updateError instanceof Error ? updateError : new Error(String(updateError)), {
          integrationId: connection.integrationId,
          tenantId: connection.tenantId,
          service: 'integration-sync',
        });
      }

      throw error;
    }
  }
}

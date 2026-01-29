/**
 * Adapter Manager Service
 * Manages integration adapters lifecycle and provides adapter instances
 */

import { FastifyInstance } from 'fastify';
import { log } from '../utils/logger';
import { IntegrationConnectionService } from './IntegrationConnectionService';
import { IntegrationService } from './IntegrationService';
import { IntegrationAdapter, IntegrationAdapterFactory } from '../types/adapter.types';
import { adapterRegistry } from './AdapterRegistry';

export class AdapterManagerService {
  private adapterInstances: Map<string, IntegrationAdapter> = new Map();
  private connectionService: IntegrationConnectionService;
  private integrationService: IntegrationService;

  constructor(
    connectionService: IntegrationConnectionService,
    integrationService: IntegrationService,
    _app?: FastifyInstance
  ) {
    this.connectionService = connectionService;
    this.integrationService = integrationService;
  }

  /**
   * Register an adapter factory
   */
  registerAdapter(providerName: string, factory: IntegrationAdapterFactory): void {
    adapterRegistry.register(providerName, factory);
  }

  /**
   * Get adapter instance for an integration
   */
  async getAdapter(
    providerName: string,
    integrationId: string,
    tenantId: string,
    userId?: string
  ): Promise<IntegrationAdapter> {
    const cacheKey = `${providerName}-${integrationId}${userId ? `-${userId}` : ''}`;

    // Check cache
    if (this.adapterInstances.has(cacheKey)) {
      return this.adapterInstances.get(cacheKey)!;
    }

    // Get adapter factory from registry
    const factory = adapterRegistry.get(providerName);
    if (!factory) {
      throw new Error(`Adapter not found for provider: ${providerName}`);
    }

    // Get integration
    const integration = await this.integrationService.getById(integrationId, tenantId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    // Get connection ID - for user-scoped integrations, we need the user's connection
    let connectionId = integrationId;
    if (userId && integration.userScoped) {
      try {
        // Find user-scoped connection for this integration
        // Note: This would require a method to get connections by integration and user
        // For now, we'll use a simplified approach
        connectionId = `${integrationId}-${userId}`;
      } catch (error: any) {
        log.warn('Failed to find user connection, using fallback', {
          error: error.message,
          integrationId,
          userId,
          service: 'integration-manager',
        });
        connectionId = `${integrationId}-${userId}`;
      }
    }

    // Create adapter instance using factory
    // The factory expects: monitoring (optional), connectionService, tenantId, connectionId
    // For now, we'll pass null for monitoring (can be enhanced later)
    const adapter = factory.create(
      null, // monitoring (optional)
      this.connectionService,
      tenantId,
      connectionId
    ) as IntegrationAdapter;

    // Cache instance
    this.adapterInstances.set(cacheKey, adapter);

    // Record connection usage (fire and forget)
    this.recordConnectionUsage(connectionId, integrationId, tenantId).catch((error) => {
      log.warn('Failed to record connection usage', {
        error: error.message,
        connectionId,
        integrationId,
        service: 'integration-manager',
      });
    });

    return adapter;
  }

  /**
   * Connect adapter with credentials
   */
  async connectAdapter(adapter: IntegrationAdapter, credentials: any): Promise<void> {
    if (typeof adapter.connect === 'function') {
      await adapter.connect(credentials);
    }
  }

  /**
   * Disconnect adapter
   */
  async disconnectAdapter(adapter: IntegrationAdapter): Promise<void> {
    if (typeof adapter.disconnect === 'function') {
      await adapter.disconnect();
    }
  }

  /**
   * Test adapter connection
   */
  async testAdapterConnection(adapter: IntegrationAdapter): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      if (typeof adapter.testConnection === 'function') {
        const result = await adapter.testConnection();
        return {
          success: result.success,
          error: result.error,
          details: result.details,
        };
      }
      return {
        success: false,
        error: 'Adapter does not support connection testing',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection test failed',
      };
    }
  }

  /**
   * Clear adapter cache
   */
  clearCache(): void {
    this.adapterInstances.clear();
    log.info('Adapter cache cleared', { service: 'integration-manager' });
  }

  /**
   * Remove adapter from cache
   */
  removeFromCache(providerName: string, integrationId: string, userId?: string): void {
    const cacheKey = `${providerName}-${integrationId}${userId ? `-${userId}` : ''}`;
    const removed = this.adapterInstances.delete(cacheKey);
    if (removed) {
      log.info('Adapter removed from cache', {
        providerName,
        integrationId,
        userId,
        service: 'integration-manager',
      });
    }
  }

  /**
   * Get adapter registry statistics
   */
  getRegistryStats(): {
    totalAdapters: number;
    adapterIds: string[];
    cachedInstances: number;
  } {
    return {
      ...adapterRegistry.getStats(),
      cachedInstances: this.adapterInstances.size,
    };
  }

  /**
   * Record connection usage (internal helper)
   */
  private async recordConnectionUsage(
    _connectionId: string,
    _integrationId: string,
    _tenantId: string
  ): Promise<void> {
    // This would update connection usage statistics
    // For now, it's a no-op, but can be enhanced to track usage metrics
    try {
      // Could update connection document with lastUsedAt timestamp
      // This is optional and doesn't block adapter creation
    } catch (error) {
      // Silently fail - usage tracking is not critical
    }
  }
}

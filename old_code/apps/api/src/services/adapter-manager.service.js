/**
 * Adapter Manager Service
 * Manages integration adapters lifecycle and provides adapter instances
 * Integrates with the existing adapter registry system
 */
import { adapterRegistry } from '../integrations/base-adapter.js';
export class AdapterManagerService {
    adapterInstances = new Map();
    connectionService;
    connectionRepository;
    monitoring;
    constructor(connectionService, monitoring, connectionRepository) {
        this.connectionService = connectionService;
        this.monitoring = monitoring;
        this.connectionRepository = connectionRepository;
    }
    /**
     * Register an adapter factory (delegates to existing registry)
     */
    registerAdapter(providerName, factory) {
        adapterRegistry.register(providerName, factory);
    }
    /**
     * Get adapter instance for an integration
     * Uses the existing adapter registry and factory pattern
     */
    async getAdapter(providerName, integration, userId) {
        const cacheKey = `${providerName}-${integration.id}${userId ? `-${userId}` : ''}`;
        // Check cache
        if (this.adapterInstances.has(cacheKey)) {
            return this.adapterInstances.get(cacheKey);
        }
        // Get adapter factory from registry
        const factory = adapterRegistry.get(providerName);
        if (!factory) {
            throw new Error(`Adapter not found for provider: ${providerName}`);
        }
        // Get connection ID - for user-scoped integrations, we need the user's connection
        let connectionId = integration.id;
        if (userId && integration.userScoped && this.connectionRepository) {
            try {
                // Find user-scoped connection for this integration
                const userConnections = await this.connectionRepository.findUserScoped(integration.id, integration.tenantId, userId);
                if (userConnections.length > 0) {
                    // Use the first user connection found
                    connectionId = userConnections[0].id;
                }
                else {
                    // Fallback: use integration ID with user suffix
                    // This will be created when user connects their account
                    connectionId = `${integration.id}-${userId}`;
                }
            }
            catch (error) {
                // If repository query fails, fall back to default
                this.monitoring?.trackException(error, {
                    operation: 'adapter.getAdapter',
                    integrationId: integration.id,
                    userId,
                });
                connectionId = `${integration.id}-${userId}`;
            }
        }
        // Create adapter instance using factory
        // The factory expects: monitoring, connectionService, tenantId, connectionId
        if (!this.monitoring || !this.connectionService) {
            throw new Error('AdapterManagerService requires monitoring and connectionService');
        }
        const adapter = factory.create(this.monitoring, this.connectionService, integration.tenantId, connectionId);
        // Cache instance
        this.adapterInstances.set(cacheKey, adapter);
        // Record connection usage (fire and forget - don't block adapter creation)
        if (this.connectionService) {
            this.connectionService.recordConnectionUsage(connectionId, integration.id).catch((error) => {
                // Don't fail if usage tracking fails
                this.monitoring?.trackException(error, {
                    operation: 'adapter.getAdapter.recordUsage',
                    integrationId: integration.id,
                    connectionId,
                });
            });
        }
        return adapter;
    }
    /**
     * Connect adapter with credentials
     */
    async connectAdapter(adapter, credentials) {
        if (typeof adapter.connect === 'function') {
            await adapter.connect(credentials);
        }
    }
    /**
     * Disconnect adapter
     */
    async disconnectAdapter(adapter) {
        if (typeof adapter.disconnect === 'function') {
            await adapter.disconnect();
        }
    }
    /**
     * Test adapter connection
     */
    async testAdapterConnection(adapter) {
        try {
            if (typeof adapter.testConnection === 'function') {
                const result = await adapter.testConnection();
                return {
                    success: result.success,
                    error: result.error,
                };
            }
            return {
                success: false,
                error: 'Adapter does not support connection testing',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Connection test failed',
            };
        }
    }
    /**
     * Clear adapter cache
     */
    clearCache() {
        this.adapterInstances.clear();
    }
    /**
     * Remove adapter from cache
     */
    removeFromCache(providerName, integrationId, userId) {
        const cacheKey = `${providerName}-${integrationId}${userId ? `-${userId}` : ''}`;
        this.adapterInstances.delete(cacheKey);
    }
}
//# sourceMappingURL=adapter-manager.service.js.map
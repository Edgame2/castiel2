/**
 * Adapter Manager Service
 * Manages integration adapters lifecycle and provides adapter instances
 * Integrates with the existing adapter registry system
 */
import type { IntegrationDocument } from '../types/integration.types.js';
import type { IntegrationAdapter } from '../types/adapter.types.js';
import type { IntegrationConnectionService } from './integration-connection.service.js';
import type { IntegrationConnectionRepository } from '../repositories/integration.repository.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
export declare class AdapterManagerService {
    private adapterInstances;
    private connectionService?;
    private connectionRepository?;
    private monitoring?;
    constructor(connectionService?: IntegrationConnectionService, monitoring?: IMonitoringProvider, connectionRepository?: IntegrationConnectionRepository);
    /**
     * Register an adapter factory (delegates to existing registry)
     */
    registerAdapter(providerName: string, factory: any): void;
    /**
     * Get adapter instance for an integration
     * Uses the existing adapter registry and factory pattern
     */
    getAdapter(providerName: string, integration: IntegrationDocument, userId?: string): Promise<IntegrationAdapter>;
    /**
     * Connect adapter with credentials
     */
    connectAdapter(adapter: IntegrationAdapter, credentials: any): Promise<void>;
    /**
     * Disconnect adapter
     */
    disconnectAdapter(adapter: IntegrationAdapter): Promise<void>;
    /**
     * Test adapter connection
     */
    testAdapterConnection(adapter: IntegrationAdapter): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Clear adapter cache
     */
    clearCache(): void;
    /**
     * Remove adapter from cache
     */
    removeFromCache(providerName: string, integrationId: string, userId?: string): void;
}
//# sourceMappingURL=adapter-manager.service.d.ts.map
import type { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { KeyVaultService } from '@castiel/key-vault';
import type { AIConnection, CreateAIConnectionInput, UpdateAIConnectionInput, AIConnectionListFilters, AIConnectionCredentials } from '@castiel/shared-types';
/**
 * Service for managing AI connections with Key Vault integration
 * Handles both system-wide and tenant-specific connections
 */
export declare class AIConnectionService {
    private readonly monitoring;
    private readonly redis;
    private readonly keyVault;
    private client;
    private container;
    private modelService;
    private shardRepository;
    private shardTypeRepository;
    constructor(monitoring: IMonitoringProvider, redis: Redis | undefined, keyVault: KeyVaultService | undefined);
    /**
     * Get model by ID - checks aimodel container only
     */
    private getModelById;
    createConnection(input: CreateAIConnectionInput, createdBy: string): Promise<AIConnection>;
    /**
     * Get a connection by ID
     */
    getConnection(connectionId: string): Promise<AIConnection | null>;
    /**
     * List connections with optional filters
     */
    listConnections(filters?: AIConnectionListFilters): Promise<{
        connections: AIConnection[];
        limit: number;
        offset: number;
        count: number;
        total: number;
    }>;
    /**
     * Update a connection
     */
    updateConnection(connectionId: string, input: UpdateAIConnectionInput, updatedBy: string): Promise<AIConnection>;
    /**
     * Delete a connection (soft delete)
     */
    deleteConnection(connectionId: string, deletedBy: string): Promise<void>;
    /**
     * Hard delete a connection (removes from database AND Key Vault)
     */
    hardDeleteConnection(connectionId: string): Promise<void>;
    /**
     * Get connection with credentials (retrieves API key from Key Vault)
     */
    getConnectionWithCredentials(connectionId: string): Promise<AIConnectionCredentials | null>;
    /**
     * Get available connections for a tenant
     * Returns tenant-specific connections + system connections
     */
    getAvailableConnections(tenantId: string): Promise<AIConnection[]>;
    /**
     * Generate Key Vault secret ID
     */
    private generateSecretId;
    /**
     * Unset other default connections for the same scope and model type
     */
    private unsetDefaults;
    /**
     * Get active connection for a specific model
     */
    getConnectionForModel(modelId: string, tenantId: string): Promise<AIConnection | null>;
    /**
     * Get connection with credentials for a specific model
     * This includes retrieving the API key from Key Vault
     */
    getConnectionWithCredentialsForModel(modelId: string, tenantId: string): Promise<AIConnectionCredentials | null>;
    /**
     * Ensure the container exists
     */
    ensureContainer(): Promise<void>;
}
//# sourceMappingURL=ai-connection.service.d.ts.map
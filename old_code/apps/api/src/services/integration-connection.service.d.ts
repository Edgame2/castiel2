import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { KeyVaultService } from '@castiel/key-vault';
import { IntegrationConnectionRepository, IntegrationProviderRepository, IntegrationRepository } from '../repositories/integration.repository.js';
import { IntegrationConnection, IntegrationDocument, ConnectionCredentials } from '../types/integration.types.js';
import type { NotificationService } from './notification.service.js';
import type { UserService } from './auth/user.service.js';
import type { IntegrationExternalUserIdService } from './integration-external-user-id.service.js';
import type { AdapterManagerService } from './adapter-manager.service.js';
interface ConnectionServiceOptions {
    monitoring: IMonitoringProvider;
    redis?: Redis;
    connectionRepository: IntegrationConnectionRepository;
    providerRepository: IntegrationProviderRepository;
    integrationRepository: IntegrationRepository;
    keyVault: KeyVaultService;
    notificationService?: NotificationService;
    userService?: UserService;
    externalUserIdService?: IntegrationExternalUserIdService;
    adapterManager?: AdapterManagerService;
}
/**
 * Integration Connection Service
 * Manages OAuth flows and credential storage using Azure Key Vault
 */
export declare class IntegrationConnectionService {
    private monitoring;
    private redis?;
    private connectionRepo;
    private providerRepo;
    private integrationRepo;
    private keyVault;
    private notificationService?;
    private userService?;
    private externalUserIdService?;
    private adapterManager?;
    private readonly OAUTH_STATE_TTL;
    constructor(options: ConnectionServiceOptions);
    /**
     * Helper: Get tenant admin user IDs
     */
    private getTenantAdminUserIds;
    private getSecretName;
    private storeSecret;
    private retrieveSecret;
    startOAuthFlow(integrationId: string, tenantId: string, userId: string, returnUrl: string): Promise<{
        authorizationUrl: string;
        state: string;
    }>;
    startOAuthFlowForIntegration(integration: IntegrationDocument, userId: string, returnUrl: string): Promise<{
        authorizationUrl: string;
        state: string;
    }>;
    handleOAuthCallback(code: string, state: string): Promise<{
        success: boolean;
        returnUrl: string;
        error?: string;
        connectionId?: string;
    }>;
    private exchangeCodeForTokens;
    refreshTokens(connectionId: string, integrationId: string): Promise<boolean>;
    /**
     * Connect with API key
     */
    connectWithApiKey(integrationId: string, tenantId: string, userId: string, apiKey: string, displayName?: string): Promise<IntegrationConnection>;
    /**
     * Connect with basic auth
     */
    connectWithBasicAuth(integrationId: string, tenantId: string, userId: string, username: string, password: string, displayName?: string): Promise<IntegrationConnection>;
    /**
     * Connect with custom credentials
     */
    connectWithCustomCredentials(integrationId: string, tenantId: string, userId: string, credentials: Record<string, any>, displayName?: string): Promise<IntegrationConnection>;
    /**
     * Create or update connection for integration instance (new container-based)
     */
    private createOrUpdateConnectionForIntegration;
    private createOrUpdateConnection;
    getConnection(integrationId: string, tenantId: string): Promise<IntegrationConnection | null>;
    /**
     * Get all user-scoped connections for an integration
     */
    getUserConnections(integrationId: string, tenantId: string, userId: string): Promise<IntegrationConnection[]>;
    /**
     * Get a specific user connection by ID
     */
    getUserConnection(integrationId: string, connectionId: string, tenantId: string, userId: string): Promise<IntegrationConnection | null>;
    /**
     * Get user OAuth token for a specific integration
     * Tries user-scoped connection first, then falls back to tenant-level connection
     */
    getUserOAuthToken(integrationId: string, tenantId: string, userId?: string): Promise<string>;
    getDecryptedCredentials(connectionId: string, integrationId: string): Promise<ConnectionCredentials | null>;
    deleteConnection(connectionId: string, integrationId: string): Promise<void>;
    testConnection(integrationId: string, tenantId: string, userId?: string): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }>;
    /**
     * Test a specific connection by connectionId
     */
    testSpecificConnection(integrationId: string, connectionId: string, tenantId: string, userId?: string): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }>;
    /**
     * Record connection usage (called when connection is used for operations)
     * Also proactively refreshes OAuth tokens if they are expired or about to expire
     */
    recordConnectionUsage(connectionId: string, integrationId: string): Promise<void>;
    /**
     * Bulk delete user connections
     */
    bulkDeleteUserConnections(integrationId: string, connectionIds: string[], tenantId: string, userId: string): Promise<{
        successCount: number;
        failureCount: number;
        results: Array<{
            connectionId: string;
            success: boolean;
            error?: string;
        }>;
    }>;
    /**
     * Bulk test user connections
     */
    bulkTestUserConnections(integrationId: string, connectionIds: string[], tenantId: string, userId: string): Promise<{
        successCount: number;
        failureCount: number;
        results: Array<{
            connectionId: string;
            success: boolean;
            error?: string;
            details?: any;
        }>;
    }>;
    /**
     * Get connection usage statistics for a user
     */
    getConnectionUsageStats(tenantId: string, userId: string, integrationId?: string): Promise<{
        totalConnections: number;
        activeConnections: number;
        inactiveConnections: number;
        totalUsageCount: number;
        connectionsByStatus: {
            active: number;
            expired: number;
            error: number;
            revoked: number;
            archived: number;
        };
        mostUsedConnections: Array<{
            connectionId: string;
            integrationId: string;
            displayName?: string;
            usageCount: number;
            lastUsedAt?: Date;
        }>;
        recentlyUsedConnections: Array<{
            connectionId: string;
            integrationId: string;
            displayName?: string;
            lastUsedAt: Date;
        }>;
        unusedConnections: Array<{
            connectionId: string;
            integrationId: string;
            displayName?: string;
            createdAt: Date;
        }>;
    }>;
    private getClientId;
    private getClientSecret;
}
export {};
//# sourceMappingURL=integration-connection.service.d.ts.map
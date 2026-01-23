import { CosmosClient, Container, Database } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Cosmos DB configuration
 */
export interface CosmosDbConfig {
    endpoint: string;
    key: string;
    database: string;
    rolesContainer?: string;
    usersContainer: string;
    tenantsContainer?: string;
    ssoConfigsContainer?: string;
    oauth2ClientsContainer?: string;
    joinRequestsContainer?: string;
    tenantInvitationsContainer?: string;
    connectionMode?: 'Direct' | 'Gateway';
    requestTimeout?: number;
    enableEndpointDiscovery?: boolean;
    maxRetryAttempts?: number;
    maxRetryWaitTime?: number;
}
/**
 * Cosmos DB client manager
 * Uses optimized connection pool settings for production
 */
export declare class CosmosDbClient {
    private client;
    private database;
    private monitoring?;
    private rolesContainer?;
    private usersContainer;
    private tenantsContainer?;
    private ssoConfigsContainer?;
    private oauth2ClientsContainer?;
    private joinRequestsContainer?;
    private tenantInvitationsContainer?;
    constructor(config: CosmosDbConfig, monitoring?: IMonitoringProvider);
    /**
     * Get users container
     */
    getUsersContainer(): Container;
    getRolesContainer(): Container;
    /**
     * Get underlying CosmosClient (for services that need direct access)
     */
    getClient(): CosmosClient;
    /**
     * Get database instance
     */
    getDatabase(): Database;
    /**
     * Get tenants container
     */
    getTenantsContainer(): Container;
    /**
     * Get SSO configurations container
     */
    getSSOConfigsContainer(): Container;
    /**
     * Get OAuth2 clients container
     */
    getOAuth2ClientsContainer(): Container;
    getTenantJoinRequestsContainer(): Container;
    getTenantInvitationsContainer(): Container;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=cosmos-db.service.d.ts.map
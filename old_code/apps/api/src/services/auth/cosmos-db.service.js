import { CosmosClient } from '@azure/cosmos';
/**
 * Cosmos DB client manager
 * Uses optimized connection pool settings for production
 */
export class CosmosDbClient {
    client;
    database;
    monitoring;
    rolesContainer;
    usersContainer;
    tenantsContainer;
    ssoConfigsContainer;
    oauth2ClientsContainer;
    joinRequestsContainer;
    tenantInvitationsContainer;
    constructor(config, monitoring) {
        this.monitoring = monitoring;
        // Create optimized connection policy
        const connectionPolicy = {
            connectionMode: (config.connectionMode || 'Direct'), // Direct mode for best performance
            requestTimeout: config.requestTimeout || 30000, // 30 seconds
            enableEndpointDiscovery: config.enableEndpointDiscovery !== false, // Enable for multi-region
            retryOptions: {
                maxRetryAttemptCount: config.maxRetryAttempts || 9,
                fixedRetryIntervalInMilliseconds: 0, // Use exponential backoff
                maxWaitTimeInSeconds: (config.maxRetryWaitTime || 30000) / 1000,
            },
        };
        this.client = new CosmosClient({
            endpoint: config.endpoint,
            key: config.key,
            connectionPolicy,
        });
        this.database = this.client.database(config.database);
        if (config.rolesContainer) {
            this.rolesContainer = this.database.container(config.rolesContainer);
        }
        this.usersContainer = this.database.container(config.usersContainer);
        if (config.tenantsContainer) {
            this.tenantsContainer = this.database.container(config.tenantsContainer);
        }
        if (config.ssoConfigsContainer) {
            this.ssoConfigsContainer = this.database.container(config.ssoConfigsContainer);
        }
        if (config.oauth2ClientsContainer) {
            this.oauth2ClientsContainer = this.database.container(config.oauth2ClientsContainer);
        }
        if (config.joinRequestsContainer) {
            this.joinRequestsContainer = this.database.container(config.joinRequestsContainer);
        }
        if (config.tenantInvitationsContainer) {
            this.tenantInvitationsContainer = this.database.container(config.tenantInvitationsContainer);
        }
    }
    /**
     * Get users container
     */
    getUsersContainer() {
        return this.usersContainer;
    }
    getRolesContainer() {
        if (!this.rolesContainer) {
            throw new Error('Roles container not configured');
        }
        return this.rolesContainer;
    }
    /**
     * Get underlying CosmosClient (for services that need direct access)
     */
    getClient() {
        return this.client;
    }
    /**
     * Get database instance
     */
    getDatabase() {
        return this.database;
    }
    /**
     * Get tenants container
     */
    getTenantsContainer() {
        if (!this.tenantsContainer) {
            throw new Error('Tenants container not configured');
        }
        return this.tenantsContainer;
    }
    /**
     * Get SSO configurations container
     */
    getSSOConfigsContainer() {
        if (!this.ssoConfigsContainer) {
            throw new Error('SSO configurations container not configured');
        }
        return this.ssoConfigsContainer;
    }
    /**
     * Get OAuth2 clients container
     */
    getOAuth2ClientsContainer() {
        if (!this.oauth2ClientsContainer) {
            throw new Error('OAuth2 clients container not configured');
        }
        return this.oauth2ClientsContainer;
    }
    getTenantJoinRequestsContainer() {
        if (!this.joinRequestsContainer) {
            throw new Error('Tenant join requests container not configured');
        }
        return this.joinRequestsContainer;
    }
    getTenantInvitationsContainer() {
        if (!this.tenantInvitationsContainer) {
            throw new Error('Tenant invitations container not configured');
        }
        return this.tenantInvitationsContainer;
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            await this.database.read();
            return true;
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'cosmos-db.health-check' });
            return false;
        }
    }
}
//# sourceMappingURL=cosmos-db.service.js.map
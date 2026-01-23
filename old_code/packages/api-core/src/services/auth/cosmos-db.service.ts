import { CosmosClient, Container, Database, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
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
  // Optional connection pool optimization settings
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
export class CosmosDbClient {
  private client: CosmosClient;
  private database: Database;
  private monitoring?: IMonitoringProvider;
  private rolesContainer?: Container;
  private usersContainer: Container;
  private tenantsContainer?: Container;
  private ssoConfigsContainer?: Container;
  private oauth2ClientsContainer?: Container;
  private joinRequestsContainer?: Container;
  private tenantInvitationsContainer?: Container;

  constructor(config: CosmosDbConfig, monitoring?: IMonitoringProvider) {
    this.monitoring = monitoring;
    // Create optimized connection policy
    const connectionPolicy: ConnectionPolicy = {
      connectionMode: (config.connectionMode || 'Direct') as any, // Direct mode for best performance
      requestTimeout: config.requestTimeout || 30000, // 30 seconds
      enableEndpointDiscovery: config.enableEndpointDiscovery !== false, // Enable for multi-region
      retryOptions: {
        maxRetryAttemptCount: config.maxRetryAttempts || 9,
        fixedRetryIntervalInMilliseconds: 0, // Use exponential backoff
        maxWaitTimeInSeconds: (config.maxRetryWaitTime || 30000) / 1000,
      } as RetryOptions,
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
  getUsersContainer(): Container {
    return this.usersContainer;
  }

  getRolesContainer(): Container {
    if (!this.rolesContainer) {
      throw new Error('Roles container not configured');
    }
    return this.rolesContainer;
  }

  getTenantsContainer(): Container {
    if (!this.tenantsContainer) {
      throw new Error('Tenants container not configured');
    }
    return this.tenantsContainer;
  }

  getSsoConfigsContainer(): Container {
    if (!this.ssoConfigsContainer) {
      throw new Error('SSO configs container not configured');
    }
    return this.ssoConfigsContainer;
  }

  getOauth2ClientsContainer(): Container {
    if (!this.oauth2ClientsContainer) {
      throw new Error('OAuth2 clients container not configured');
    }
    return this.oauth2ClientsContainer;
  }

  getJoinRequestsContainer(): Container {
    if (!this.joinRequestsContainer) {
      throw new Error('Join requests container not configured');
    }
    return this.joinRequestsContainer;
  }

  getTenantInvitationsContainer(): Container {
    if (!this.tenantInvitationsContainer) {
      throw new Error('Tenant invitations container not configured');
    }
    return this.tenantInvitationsContainer;
  }

  /**
   * Get the Cosmos DB client
   */
  getClient(): CosmosClient {
    return this.client;
  }

  /**
   * Get the database
   */
  getDatabase(): Database {
    return this.database;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.database.read();
      return true;
    } catch (error) {
      if (this.monitoring) {
        this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
          operation: 'cosmos-db.health-check',
        });
      }
      return false;
    }
  }
}

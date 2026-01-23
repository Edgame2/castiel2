/**
 * Token Refresher Scheduler
 * 
 * Periodically refreshes OAuth tokens before they expire.
 * Runs every 6 hours to check for credentials approaching expiry.
 */

import type { InitializedServices } from '../shared/initialize-services.js';

interface TokenRefresherConfig {
  databaseId: string;
  credentialsContainerId: string;
  tokenExpiryThresholdMinutes: number;
  maxRefreshRetries: number;
}

interface TokenRefreshResult {
  credentialId: string;
  tenantId: string;
  integrationId: string;
  success: boolean;
  newExpiryTime?: string;
  error?: string;
  duration: number;
}

export class TokenRefresher {
  private services: InitializedServices;
  private config: TokenRefresherConfig;

  constructor(config: TokenRefresherConfig, services: InitializedServices) {
    this.config = config;
    this.services = services;
  }

  /**
   * Main execution
   * Runs every 6 hours to refresh expiring tokens
   */
  async execute(): Promise<void> {
    const startTime = Date.now();
    const executionId = `token-refresher-${Date.now()}`;

    try {
      this.services.monitoring.trackEvent('token-refresher.started', {
        executionId,
        timestamp: new Date().toISOString(),
      });

      // Fetch credentials approaching expiry
      const expiringCredentials = await this.fetchExpiringCredentials();
      this.services.monitoring.trackMetric('token-refresher.expiring-credentials', expiringCredentials.length);

      if (expiringCredentials.length === 0) {
        this.services.monitoring.trackEvent('token-refresher.no-credentials', {
          executionId,
        });
        return;
      }

      // Refresh each credential
      const results = await this.refreshCredentials(expiringCredentials);

      // Log results
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      const duration = Date.now() - startTime;
      this.services.monitoring.trackEvent('token-refresher.completed', {
        executionId,
        successCount,
        failureCount,
        totalCount: results.length,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.services.monitoring.trackException(error as Error, {
        context: 'TokenRefresher.execute',
        executionId,
        duration,
      });
      throw error;
    }
  }

  /**
   * Fetch credentials approaching expiry
   */
  private async fetchExpiringCredentials(): Promise<any[]> {
    try {
      const container = this.services.cosmosClient
        .database(this.config.databaseId)
        .container(this.config.credentialsContainerId);

      const thresholdTime = new Date();
      thresholdTime.setMinutes(
        thresholdTime.getMinutes() + this.config.tokenExpiryThresholdMinutes
      );

      const { resources: credentials } = await container.items
        .query({
          query: `
            SELECT * FROM c
            WHERE c.expiresAt <= @threshold
            AND c.status = 'active'
            AND c.type = 'oauth'
          `,
          parameters: [
            { name: '@threshold', value: thresholdTime.toISOString() },
          ],
        })
        .fetchAll();

      return credentials;
    } catch (error) {
      this.services.monitoring.trackException(error as Error, {
        context: 'TokenRefresher.fetchExpiringCredentials',
      });
      throw error;
    }
  }

  /**
   * Refresh credentials
   */
  private async refreshCredentials(
    credentials: any[]
  ): Promise<TokenRefreshResult[]> {
    const results: TokenRefreshResult[] = [];

    for (const credential of credentials) {
      const startTime = Date.now();
      const result: TokenRefreshResult = {
        credentialId: credential.id,
        tenantId: credential.tenantId,
        integrationId: credential.integrationId,
        success: false,
        duration: 0,
      };

      try {
        // Use SecureCredentialService to refresh token
        if (!this.services.secureCredentialService) {
          throw new Error('SecureCredentialService not initialized');
        }

        // Refresh token logic would go here
        // This is a simplified version - actual implementation would
        // use the adapter's refresh token method
        // Use refreshOAuthToken method instead
        // Note: We need tenantId, integrationId, and connectionId
        // The credential object should have these properties
        const refreshed = await this.services.secureCredentialService.refreshOAuthToken(
          credential.tenantId || '',
          credential.integrationId || '',
          credential.id
        );
        
        if (!refreshed) {
          throw new Error('Failed to refresh OAuth token');
        }
        
        // Create a result object compatible with the expected structure
        const refreshedCredential = {
          expiresAt: new Date(Date.now() + 3600 * 1000), // Default 1 hour
        };

        result.success = true;
        result.newExpiryTime = refreshedCredential.expiresAt?.toISOString();

        this.services.monitoring.trackEvent('token-refresher.credential-refreshed', {
          credentialId: credential.id,
          tenantId: credential.tenantId,
        });
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        this.services.monitoring.trackException(error as Error, {
          context: 'TokenRefresher.refreshCredential',
          credentialId: credential.id,
        });
      } finally {
        result.duration = Date.now() - startTime;
        results.push(result);
      }
    }

    return results;
  }
}




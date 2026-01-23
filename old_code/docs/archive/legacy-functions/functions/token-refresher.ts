import { app, Timer } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { SecureCredentialService } from '../services/secure-credential.service';
import type { Credential } from '../services/secure-credential.service';

/**
 * TokenRefresher Azure Function
 * 
 * Periodically refreshes OAuth tokens before they expire.
 * Runs every 6 hours to check for credentials approaching expiry.
 * Updates credentials in Azure Key Vault and Cosmos DB.
 * 
 * Trigger: Timer trigger (every 6 hours)
 * Input: Cosmos DB (credentials, Credentials stored in Key Vault)
 * Output: Key Vault, Cosmos DB (updated credentials)
 */

interface TokenRefresherConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  credentialsContainerId: string;
  keyVaultUrl: string;
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

class TokenRefresherFunction {
  private cosmosClient: CosmosClient;
  private credentialService: SecureCredentialService;
  private config: TokenRefresherConfig;

  constructor(config: TokenRefresherConfig) {
    this.config = config;

    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

    const credential = new DefaultAzureCredential();
    this.credentialService = new SecureCredentialService(
      config.keyVaultUrl,
      credential
    );
  }

  /**
   * Main timer trigger handler
   * Runs every 6 hours to refresh expiring tokens
   */
  async execute(timerTrigger: Timer, context: any): Promise<void> {
    const startTime = Date.now();
    const executionId = context.invocationId;

    try {
      context.log(
        `[${executionId}] TokenRefresher started at ${new Date().toISOString()}`
      );

      // Fetch credentials approaching expiry
      const expiringCredentials = await this.fetchExpiringCredentials(context);
      context.log(
        `[${executionId}] Found ${expiringCredentials.length} expiring credentials`
      );

      if (expiringCredentials.length === 0) {
        context.log(`[${executionId}] No credentials need refresh`);
        return;
      }

      // Refresh each credential
      const results = await this.refreshCredentials(
        expiringCredentials,
        executionId,
        context
      );

      // Log results
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      context.log(
        `[${executionId}] Token refresh completed: ${successCount} successful, ${failureCount} failed`
      );

      // Store refresh results for audit trail
      await this.storeRefreshResults(results, context);

      const duration = Date.now() - startTime;
      context.log(
        `[${executionId}] TokenRefresher completed in ${duration}ms`
      );
    } catch (error) {
      context.log.error(
        `[${executionId}] TokenRefresher failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Fetch credentials approaching expiry
   * Returns credentials with expiryTime within threshold
   */
  private async fetchExpiringCredentials(context: any): Promise<Credential[]> {
    try {
      const container = this.cosmosClient
        .database(this.config.databaseId)
        .container(this.config.credentialsContainerId);

      const expiryThreshold = new Date(
        Date.now() +
          this.config.tokenExpiryThresholdMinutes * 60 * 1000
      ).toISOString();

      // Query for OAuth credentials approaching expiry
      const { resources: credentials } = await container.items
        .query<Credential>(
          `
          SELECT * FROM c
          WHERE c.type = 'oauth2'
          AND c.expiryTime <= @threshold
          AND c.expiryTime > @now
          AND c.enabled = true
          ORDER BY c.expiryTime ASC
        `,
          {
            parameters: [
              { name: '@threshold', value: expiryThreshold },
              { name: '@now', value: new Date().toISOString() },
            ],
          }
        )
        .fetchAll();

      return credentials;
    } catch (error) {
      context.log.error(
        `Failed to fetch expiring credentials: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Refresh multiple credentials
   */
  private async refreshCredentials(
    credentials: Credential[],
    executionId: string,
    context: any
  ): Promise<TokenRefreshResult[]> {
    const results: TokenRefreshResult[] = [];

    for (const credential of credentials) {
      const result = await this.refreshSingleCredential(
        credential,
        executionId,
        context
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Refresh a single OAuth credential
   */
  private async refreshSingleCredential(
    credential: Credential,
    executionId: string,
    context: any
  ): Promise<TokenRefreshResult> {
    const startTime = Date.now();
    const result: TokenRefreshResult = {
      credentialId: credential.id,
      tenantId: credential.tenantId,
      integrationId: credential.integrationId,
      success: false,
      duration: 0,
    };

    try {
      context.log(
        `[${executionId}] Refreshing token for ${credential.integrationId}`
      );

      // Attempt to refresh using the credential service
      const refreshed = await this.credentialService.refreshOAuthToken(
        credential.id
      );

      if (refreshed) {
        result.success = true;
        result.newExpiryTime = refreshed.expiryTime?.toISOString();

        context.log(
          `[${executionId}] Successfully refreshed token for ${credential.integrationId}`
        );

        // Update credential in Cosmos DB
        await this.updateCredentialInDatabase(credential.id, refreshed, context);
      } else {
        result.error = 'Refresh returned no new credential';
        context.log.warn(
          `[${executionId}] Token refresh returned no new credential: ${credential.id}`
        );
      }
    } catch (error) {
      result.error =
        error instanceof Error ? error.message : String(error);
      context.log.error(
        `[${executionId}] Failed to refresh ${credential.integrationId}: ${result.error}`
      );

      // Check if this is a fatal error (invalid credentials)
      if (result.error.includes('invalid_grant')) {
        context.log.warn(
          `[${executionId}] Invalid grant for ${credential.id}, may require re-authentication`
        );
        // Could trigger notification here
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Update refreshed credential in Cosmos DB
   */
  private async updateCredentialInDatabase(
    credentialId: string,
    refreshedCredential: Credential,
    context: any
  ): Promise<void> {
    try {
      const container = this.cosmosClient
        .database(this.config.databaseId)
        .container(this.config.credentialsContainerId);

      const updateData = {
        ...refreshedCredential,
        id: credentialId,
        lastRefreshedAt: new Date().toISOString(),
        refreshCount: (refreshedCredential as any).refreshCount || 0 + 1,
      };

      await container.items.upsert(updateData);

      context.log(
        `Updated credential ${credentialId} in database`
      );
    } catch (error) {
      context.log.error(
        `Failed to update credential in database: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Store refresh results for audit trail
   */
  private async storeRefreshResults(
    results: TokenRefreshResult[],
    context: any
  ): Promise<void> {
    try {
      const container = this.cosmosClient
        .database(this.config.databaseId)
        .container('token-refresh-audit');

      const auditRecord = {
        id: `refresh-${Date.now()}`,
        timestamp: new Date().toISOString(),
        totalAttempted: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
        ttl: 7776000, // 90 days
      };

      await container.items.create(auditRecord);

      context.log(`Stored refresh audit record`);
    } catch (error) {
      context.log.warn(
        `Failed to store audit record: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw - audit is non-critical
    }
  }
}

// Azure Function binding
app.timer('TokenRefresherTimer', {
  schedule: '0 0 */6 * * *', // Every 6 hours
  runOnStartup: false,
  handler: async (timerTrigger: Timer, context: any) => {
    const config: TokenRefresherConfig = {
      cosmosEndpoint:
        process.env.COSMOS_ENDPOINT || 'https://localhost:8081',
      cosmosKey: process.env.COSMOS_KEY || 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTjd3K6QCHBUI2djStw5ih+ax7IB9binCwZBicT/M=',
      databaseId: process.env.COSMOS_DATABASE || 'castiel',
      credentialsContainerId:
        process.env.CREDENTIALS_CONTAINER || 'credentials',
      keyVaultUrl: process.env.KEY_VAULT_URL || '',
      tokenExpiryThresholdMinutes: parseInt(
        process.env.TOKEN_EXPIRY_THRESHOLD_MINUTES || '60',
        10
      ),
      maxRefreshRetries: parseInt(
        process.env.MAX_REFRESH_RETRIES || '3',
        10
      ),
    };

    const refresher = new TokenRefresherFunction(config);
    await refresher.execute(timerTrigger, context);
  },
});

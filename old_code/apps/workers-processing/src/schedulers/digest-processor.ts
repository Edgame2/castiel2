/**
 * Digest Processor Scheduler
 * 
 * Processes due notification digests periodically. Queries Cosmos DB for digests
 * that are due to be sent and sends them via the appropriate channel (email, Slack, Teams).
 */

import cron from 'node-cron';
import { CosmosClient } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  NotificationDigestRepository,
  NotificationRepository,
  DigestService,
  UnifiedEmailService,
  UserService,
} from '@castiel/api-core';

interface DigestProcessorConfig {
  databaseId: string;
  batchSize: number;
  baseUrl?: string;
}

export class DigestProcessorScheduler {
  private cosmosClient: CosmosClient;
  private monitoring: IMonitoringProvider;
  private config: DigestProcessorConfig;
  private digestService: DigestService;

  constructor(
    config: DigestProcessorConfig,
    cosmosClient: CosmosClient,
    monitoring: IMonitoringProvider
  ) {
    this.config = config;
    this.cosmosClient = cosmosClient;
    this.monitoring = monitoring;

    // Initialize repositories
    const digestRepository = new NotificationDigestRepository(
      cosmosClient,
      config.databaseId,
      'notification-digests'
    );

    const notificationRepository = new NotificationRepository(
      cosmosClient,
      config.databaseId,
      'notifications'
    );

    // Initialize email service (if available)
    let emailService: UnifiedEmailService | undefined;
    try {
      const emailProvider = (process.env.EMAIL_PROVIDER || 'console') as 'console' | 'resend' | 'azure-acs';
      const fromEmail = process.env.EMAIL_FROM || 'noreply@castiel.ai';
      const fromName = process.env.EMAIL_FROM_NAME || 'Castiel';

      const emailConfig: any = {
        provider: emailProvider,
        fromEmail,
        fromName,
      };

      if (emailProvider === 'resend' && process.env.RESEND_API_KEY) {
        emailConfig.resend = { apiKey: process.env.RESEND_API_KEY };
      } else if (emailProvider === 'azure-acs' && process.env.AZURE_ACS_CONNECTION_STRING) {
        emailConfig.azureAcs = { connectionString: process.env.AZURE_ACS_CONNECTION_STRING };
      }

      emailService = new UnifiedEmailService(emailConfig);
    } catch (error) {
      // Email service not available, will skip email digests
      monitoring.trackException(error as Error, {
        context: 'DigestProcessorScheduler.initEmailService',
      });
    }

    // Initialize user service
    const database = cosmosClient.database(config.databaseId);
    const usersContainer = database.container('users');
    const userService = new UserService(usersContainer);

    // Initialize digest service
    this.digestService = new DigestService(
      notificationRepository,
      digestRepository,
      userService,
      monitoring,
      {
        enabled: true,
        baseUrl: config.baseUrl || 'https://app.castiel.ai',
      },
      emailService
    );
  }

  /**
   * Main execution
   * Runs every 15 minutes to process due digests
   */
  async execute(): Promise<void> {
    const startTime = Date.now();
    const executionId = `digest-processor-${Date.now()}`;

    try {
      this.monitoring.trackEvent('digest-processor.started', {
        executionId,
        timestamp: new Date().toISOString(),
      });

      // Fetch due digests
      const dueDigests = await this.fetchDueDigests();
      this.monitoring.trackMetric('digest-processor.due-digests', dueDigests.length);

      if (dueDigests.length === 0) {
        this.monitoring.trackEvent('digest-processor.no-digests', {
          executionId,
        });
        return;
      }

      // Process each digest
      const results = await this.processDigests(dueDigests);

      const duration = Date.now() - startTime;
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      this.monitoring.trackEvent('digest-processor.completed', {
        executionId,
        successCount,
        failureCount,
        totalCount: results.length,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        context: 'DigestProcessorScheduler.execute',
        executionId,
        duration,
      });
      throw error;
    }
  }

  /**
   * Fetch due digests from Cosmos DB
   */
  private async fetchDueDigests(): Promise<any[]> {
    try {
      const container = this.cosmosClient
        .database(this.config.databaseId)
        .container('notification-digests');

      const now = new Date();

      const { resources: digests } = await container.items
        .query({
          query: `
            SELECT * FROM c
            WHERE c.periodEnd <= @now
            AND c.status = 'pending'
            ORDER BY c.periodEnd ASC
            OFFSET 0 LIMIT @limit
          `,
          parameters: [
            { name: '@now', value: now.toISOString() },
            { name: '@limit', value: this.config.batchSize },
          ],
        })
        .fetchAll();

      return digests;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        context: 'DigestProcessorScheduler.fetchDueDigests',
      });
      throw error;
    }
  }

  /**
   * Process digests
   */
  private async processDigests(digests: any[]): Promise<Array<{ digestId: string; success: boolean; error?: string }>> {
    const results: Array<{ digestId: string; success: boolean; error?: string }> = [];

    for (const digest of digests) {
      try {
        // Process digest using DigestService
        const compilation = await this.digestService.compileDigest(digest);
        await this.digestService.sendDigest(compilation);

        results.push({
          digestId: digest.id,
          success: true,
        });

        this.monitoring.trackEvent('digest-processor.digest-processed', {
          digestId: digest.id,
          tenantId: digest.tenantId,
        });
      } catch (error) {
        results.push({
          digestId: digest.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

        this.monitoring.trackException(error as Error, {
          context: 'DigestProcessorScheduler.processDigest',
          digestId: digest.id,
        });
      }
    }

    return results;
  }
}




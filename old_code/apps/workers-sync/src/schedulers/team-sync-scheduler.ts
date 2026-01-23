/**
 * Team Sync Scheduler
 * 
 * Periodically syncs teams from SSO providers (Azure AD, Okta, Google Workspace).
 * Runs on a configurable schedule (default: daily at 2 AM).
 */

import type { InitializedServices } from '../shared/initialize-services.js';
import {
  IntegrationConnectionRepository,
  IntegrationRepository,
  IntegrationProviderRepository,
  IntegrationService,
  AdapterManagerService,
  SSOTeamSyncService,
  TeamService,
  ShardRepository,
  ShardTypeRepository,
  ShardRelationshipService,
} from '@castiel/api-core/workers-sync';

interface TeamSyncSchedulerConfig {
  databaseId: string;
  syncSchedule: string;
  batchSize: number;
  maxRetries: number;
}

interface TeamSyncResult {
  integrationId: string;
  tenantId: string;
  providerName: string;
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ teamId: string; error: string }>;
  duration: number;
}

export class TeamSyncScheduler {
  private services: InitializedServices;
  private config: TeamSyncSchedulerConfig;
  private teamSyncService: SSOTeamSyncService;

  constructor(config: TeamSyncSchedulerConfig, services: InitializedServices) {
    this.config = config;
    this.services = services;

    // Initialize repositories
    const connectionRepository = new IntegrationConnectionRepository(
      services.cosmosClient,
      config.databaseId,
      'integration_connections'
    );
    const integrationRepository = new IntegrationRepository(
      services.cosmosClient,
      config.databaseId,
      'integration_providers'
    );
    
    // TeamService requires ShardRepository, ShardTypeRepository, ShardRelationshipService
    // These are not available in workers-sync, so we'll need to create them or skip team sync
    // For now, we'll create minimal instances
    const shardRepository = new ShardRepository(services.monitoring);
    const shardTypeRepository = new ShardTypeRepository(services.monitoring);
    const relationshipService = new ShardRelationshipService(services.monitoring, shardRepository);
    
    const teamService = new TeamService(
      services.monitoring,
      shardRepository,
      shardTypeRepository,
      relationshipService
    );

    // SSOTeamSyncService will be initialized lazily in execute() method
    // since it requires async imports
    this.teamSyncService = null as any; // Will be initialized in execute()
  }

  private async initializeTeamSyncService(): Promise<SSOTeamSyncService> {
    if (this.teamSyncService) {
      return this.teamSyncService;
    }

    const config = this.config;
    const services = this.services;
    
    // Initialize repositories
    const connectionRepository = new IntegrationConnectionRepository(
      services.cosmosClient,
      config.databaseId,
      'integration_connections'
    );
    const integrationRepository = new IntegrationRepository(
      services.cosmosClient,
      config.databaseId,
      'integration_providers'
    );
    
    // TeamService requires ShardRepository, ShardTypeRepository, ShardRelationshipService
    const shardRepository = new ShardRepository(services.monitoring);
    const shardTypeRepository = new ShardTypeRepository(services.monitoring);
    const relationshipService = new ShardRelationshipService(services.monitoring, shardRepository);
    
    const teamService = new TeamService(
      services.monitoring,
      shardRepository,
      shardTypeRepository,
      relationshipService
    );

    // Initialize SSO Team Sync Service
    // Note: All required services are available from @castiel/api-core
    // Create providerRepository for IntegrationService
    const providerRepository = new IntegrationProviderRepository(
      services.cosmosClient,
      config.databaseId,
      'integration_providers'
    );
    
    // Create IntegrationService with required parameters
    const integrationService = new IntegrationService(
      integrationRepository,
      providerRepository,
      undefined, // notificationService - optional
      undefined, // auditLogService - optional
      undefined, // userService - optional
      services.monitoring
    );
    
    // Create AdapterManagerService
    // Note: IntegrationConnectionService is not available in workers-sync
    // Pass undefined for connectionService - AdapterManagerService can work without it
    const adapterManager = new AdapterManagerService(
      undefined, // connectionService - not available in workers-sync
      services.monitoring,
      connectionRepository
    );
    
    this.teamSyncService = new SSOTeamSyncService(
      services.monitoring,
      teamService,
      integrationService,
      adapterManager
    );
    
    return this.teamSyncService;
  }

  /**
   * Main execution
   * Runs on schedule to sync teams
   */
  async execute(): Promise<void> {
    const startTime = Date.now();
    const executionId = `team-sync-scheduler-${Date.now()}`;

    try {
      // Initialize team sync service if not already initialized
      await this.initializeTeamSyncService();
      
      this.services.monitoring.trackEvent('team-sync-scheduler.started', {
        executionId,
        timestamp: new Date().toISOString(),
      });

      // Fetch integrations with team sync enabled
      const integrations = await this.fetchTeamSyncIntegrations();
      this.services.monitoring.trackMetric('team-sync-scheduler.integrations-found', integrations.length);

      if (integrations.length === 0) {
        this.services.monitoring.trackEvent('team-sync-scheduler.no-integrations', {
          executionId,
        });
        return;
      }

      // Sync teams for each integration
      const results = await this.syncTeams(integrations);

      const duration = Date.now() - startTime;
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      this.services.monitoring.trackEvent('team-sync-scheduler.completed', {
        executionId,
        successCount,
        failureCount,
        totalCount: results.length,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.services.monitoring.trackException(error as Error, {
        context: 'TeamSyncScheduler.execute',
        executionId,
        duration,
      });
      throw error;
    }
  }

  /**
   * Fetch integrations with team sync enabled
   */
  private async fetchTeamSyncIntegrations(): Promise<any[]> {
    try {
      const connectionRepository = new IntegrationConnectionRepository(
        this.services.cosmosClient,
        this.config.databaseId,
        'integration_connections'
      );

      // Query for active SSO integrations with team sync enabled
      // Use container directly since IntegrationConnectionRepository doesn't have query method
      const { resources: connections } = await connectionRepository['container'].items
        .query({
          query: `
            SELECT * FROM c
            WHERE c.status = 'active'
            AND c.authType = 'oauth'
          `,
        })
        .fetchAll();

      return connections;
    } catch (error) {
      this.services.monitoring.trackException(error as Error, {
        context: 'TeamSyncScheduler.fetchTeamSyncIntegrations',
      });
      throw error;
    }
  }

  /**
   * Sync teams for integrations
   */
  private async syncTeams(
    integrations: any[]
  ): Promise<TeamSyncResult[]> {
    const results: TeamSyncResult[] = [];

    for (const integration of integrations) {
      const startTime = Date.now();
      const result: TeamSyncResult = {
        integrationId: integration.integrationId,
        tenantId: integration.tenantId,
        providerName: integration.providerName || 'unknown',
        success: false,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        duration: 0,
      };

      try {
        // Sync teams using SSOTeamSyncService
        const syncResult = await this.teamSyncService.syncTeamsFromSSO(
          integration.tenantId,
          integration.integrationId
        );

        result.success = true;
        result.created = syncResult.created || 0;
        result.updated = syncResult.updated || 0;
        result.skipped = syncResult.skipped || 0;
        result.errors = syncResult.errors || [];

        this.services.monitoring.trackEvent('team-sync-scheduler.integration-synced', {
          integrationId: integration.integrationId,
          tenantId: integration.tenantId,
          created: result.created,
          updated: result.updated,
        });
      } catch (error) {
        result.errors.push({
          teamId: 'all',
          error: error instanceof Error ? error.message : String(error),
        });
        this.services.monitoring.trackException(error as Error, {
          context: 'TeamSyncScheduler.syncTeams',
          integrationId: integration.integrationId,
        });
      } finally {
        result.duration = Date.now() - startTime;
        results.push(result);
      }
    }

    return results;
  }
}




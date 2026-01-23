/**
 * SSO Team Sync Service
 * Synchronizes teams from SSO providers (Azure AD, Okta, Google Workspace)
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { TeamService } from './team.service.js';
import { IntegrationService } from './integration.service.js';
import { AdapterManagerService } from './adapter-manager.service.js';
import { IntegrationExternalUserIdService } from './integration-external-user-id.service.js';
import type {
  SSOTeam,
  TeamSyncConfig,
  CreateTeamInput,
  TeamManager,
  TeamMember,
} from '../types/team.types.js';
import type { IntegrationAdapter } from '../types/adapter.types.js';

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ teamId: string; error: string }>;
}

export class SSOTeamSyncService {
  constructor(
    private monitoring: IMonitoringProvider,
    private teamService: TeamService,
    private integrationService: IntegrationService,
    private adapterManager: AdapterManagerService,
    private externalUserIdService?: IntegrationExternalUserIdService
  ) {}

  /**
   * Sync teams from SSO for a tenant
   */
  async syncTeamsFromSSO(
    tenantId: string,
    integrationId: string,
    userId?: string
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Get integration
      const integration = await this.integrationService.getIntegration(integrationId, tenantId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Get sync config
      const config = await this.getTeamSyncConfig(tenantId, integrationId);
      if (!config || !config.enabled) {
        return {
          created: 0,
          updated: 0,
          skipped: 0,
          errors: [],
        };
      }

      // Get adapter
      const adapter = await this.adapterManager.getAdapter(
        integration.providerName,
        integration,
        userId
      );

      if (!adapter || typeof adapter !== 'object' || !('fetchTeams' in adapter) || typeof adapter.fetchTeams !== 'function') {
        throw new Error(`Adapter for ${integration.providerName} does not support team sync`);
      }

      // Fetch teams from SSO
      const ssoTeams = await this.fetchTeamsFromAdapter(adapter, config);

      // Sync each team
      const result: SyncResult = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      };

      for (const ssoTeam of ssoTeams) {
        try {
          const syncResult = await this.syncTeamFromSSO(
            ssoTeam,
            tenantId,
            integrationId,
            config,
            userId || 'system'
          );

          if (syncResult.created) {result.created++;}
          else if (syncResult.updated) {result.updated++;}
          else {result.skipped++;}
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push({
            teamId: ssoTeam.externalId,
            error: errorMessage,
          });
          this.monitoring.trackException(
            error instanceof Error ? error : new Error(String(error)),
            {
              operation: 'ssoTeamSync.syncTeam',
              teamExternalId: ssoTeam.externalId,
              tenantId,
            }
          );
        }
      }

      this.monitoring.trackEvent('ssoTeamSync.completed', {
        tenantId,
        integrationId,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errorCount: result.errors.length,
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'ssoTeamSync.syncTeamsFromSSO',
          tenantId,
          integrationId,
          durationMs: Date.now() - startTime,
        }
      );
      throw error;
    }
  }

  /**
   * Sync a single team from SSO
   */
  async syncTeamFromSSO(
    ssoTeam: SSOTeam,
    tenantId: string,
    integrationId: string,
    config: TeamSyncConfig,
    userId: string
  ): Promise<{ created: boolean; updated: boolean }> {
    // Find existing team by externalId
    const externalSource = await this.getExternalSourceFromIntegration(integrationId, tenantId);
    const existingTeams = await this.teamService.getTeams(tenantId, {
      externalSource,
    });

    const existingTeam = existingTeams.find(t => t.externalId === ssoTeam.externalId);

    // Skip if manually edited and preserveManualEdits is true
    if (existingTeam && existingTeam.isManuallyEdited && config.preserveManualEdits) {
      return { created: false, updated: false };
    }

    // Map SSO team to internal team
    const teamInput = await this.mapSSOTeamToUserTeam(ssoTeam, config, tenantId, integrationId);

    if (existingTeam) {
      // Update existing team
      await this.teamService.updateTeam(
        existingTeam.id,
        {
          name: teamInput.name,
          manager: teamInput.manager,
          members: teamInput.members,
          parentTeamId: teamInput.parentTeamId,
          syncEnabled: true,
        },
        tenantId,
        userId
      );

      // Update syncedAt timestamp (would need to add this field to update)
      return { created: false, updated: true };
    } else {
      // Create new team
      await this.teamService.createTeam(
        {
          ...teamInput,
          externalId: ssoTeam.externalId,
          externalSource,
          syncEnabled: true,
        },
        tenantId,
        userId
      );

      return { created: true, updated: false };
    }
  }

  /**
   * Sync teams on user login (from SSO token groups)
   */
  async syncTeamsOnLogin(
    userId: string,
    tenantId: string,
    ssoGroups: string[],
    integrationId: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Get sync config
      const config = await this.getTeamSyncConfig(tenantId, integrationId);
      if (!config || !config.enabled) {
        return;
      }

      // Get integration
      const integration = await this.integrationService.getIntegration(integrationId, tenantId);
      if (!integration) {
        return;
      }

      // Get adapter
      const adapter = await this.adapterManager.getAdapter(
        integration.providerName,
        integration,
        userId
      );

      if (!adapter || typeof adapter !== 'object' || !('fetchTeams' in adapter) || typeof adapter.fetchTeams !== 'function') {
        return; // Adapter doesn't support team sync
      }

      // Fetch teams for the groups in the token
      const allTeams = await this.fetchTeamsFromAdapter(adapter, config);
      const relevantTeams = allTeams.filter(team =>
        ssoGroups.some(groupId => groupId === team.externalId)
      );

      // Sync each relevant team
      for (const ssoTeam of relevantTeams) {
        try {
          await this.syncTeamFromSSO(ssoTeam, tenantId, integrationId, config, userId);
        } catch (error: unknown) {
          // Log error but continue with other teams - don't fail login if team sync fails
          this.monitoring.trackException(
            error instanceof Error ? error : new Error(String(error)),
            {
              operation: 'ssoTeamSync.syncTeamsOnLogin',
              userId,
              tenantId,
              teamExternalId: ssoTeam.externalId,
            }
          );
          // Continue with next team instead of failing entire sync
        }
      }

      this.monitoring.trackEvent('ssoTeamSync.loginSync', {
        userId,
        tenantId,
        teamCount: relevantTeams.length,
        durationMs: Date.now() - startTime,
      });
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'ssoTeamSync.syncTeamsOnLogin',
          userId,
          tenantId,
          durationMs: Date.now() - startTime,
        }
      );
      // Don't throw - login should not fail if team sync fails
    }
  }

  /**
   * Get team sync configuration
   */
  async getTeamSyncConfig(tenantId: string, integrationId: string): Promise<TeamSyncConfig | null> {
    try {
      const integration = await this.integrationService.getIntegration(integrationId, tenantId);
      if (!integration) {
        return null;
      }

      // Get config from integration document
      const syncConfig = integration && typeof integration === 'object' && 'syncConfig' in integration
        ? (integration as { syncConfig?: { teamSync?: unknown } }).syncConfig
        : undefined;
      if (!syncConfig || !syncConfig.teamSync || typeof syncConfig.teamSync !== 'object') {
        return null;
      }

      const teamSync = syncConfig.teamSync as {
        enabled?: boolean;
        entityMappings?: Record<string, string>;
        fieldMappings?: {
          manager?: Record<string, string>;
          members?: Record<string, string>;
          parentTeamId?: Record<string, string>;
        };
        preserveManualEdits?: boolean;
      };

      return {
        enabled: teamSync.enabled ?? false,
        teamNameMapping: teamSync.entityMappings || {},
        managerMapping: teamSync.fieldMappings?.manager || {},
        memberMapping: teamSync.fieldMappings?.members || {},
        hierarchyMapping: teamSync.fieldMappings?.parentTeamId || {},
        preserveManualEdits: teamSync.preserveManualEdits ?? true,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'ssoTeamSync.getTeamSyncConfig',
          tenantId,
          integrationId,
        }
      );
      return null;
    }
  }

  /**
   * Update team sync configuration
   */
  async updateTeamSyncConfig(
    tenantId: string,
    integrationId: string,
    config: TeamSyncConfig
  ): Promise<void> {
    try {
      const integration = await this.integrationService.getIntegration(integrationId, tenantId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Get existing syncConfig or create new one
      const existingSyncConfig = integration && typeof integration === 'object' && 'syncConfig' in integration
        ? (integration as { syncConfig?: Record<string, unknown> }).syncConfig || {}
        : {};
      
      // Merge team sync config into existing syncConfig, preserving all existing fields
      const updatedSyncConfig: Record<string, unknown> = {
        ...existingSyncConfig,
        teamSync: {
          enabled: config.enabled,
          entityMappings: config.teamNameMapping || {},
          fieldMappings: {
            manager: config.managerMapping || {},
            members: config.memberMapping || {},
            parentTeamId: config.hierarchyMapping || {},
          },
          preserveManualEdits: config.preserveManualEdits ?? true,
        },
      };

      // Update integration document with merged sync config
      // Use a system user for the update (team sync is system-level)
      const systemUser = {
        id: 'system',
        email: 'system@castiel.ai',
        tenantId,
        roles: ['super_admin'],
      };

      // Cast to UpdateIntegrationInput - teamSync is stored as nested object in syncConfig
      await this.integrationService.updateIntegration(
        integrationId,
        tenantId,
        {
          syncConfig: updatedSyncConfig,
        } as Parameters<typeof this.integrationService.updateIntegration>[2],
        systemUser as Parameters<typeof this.integrationService.updateIntegration>[3]
      );

      this.monitoring.trackEvent('ssoTeamSync.configUpdated', {
        tenantId,
        integrationId,
        enabled: config.enabled,
      });
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'ssoTeamSync.updateTeamSyncConfig',
          tenantId,
          integrationId,
        }
      );
      throw error;
    }
  }

  /**
   * Fetch teams from adapter
   */
  private async fetchTeamsFromAdapter(
    adapter: IntegrationAdapter,
    config: TeamSyncConfig
  ): Promise<SSOTeam[]> {
    const fetchTeams = (adapter as any).fetchTeams;
    if (!fetchTeams) {
      throw new Error('Adapter does not support fetchTeams');
    }

    return await fetchTeams(config);
  }

  /**
   * Map SSO team to internal team structure
   */
  private async mapSSOTeamToUserTeam(
    ssoTeam: SSOTeam,
    config: TeamSyncConfig,
    tenantId: string,
    integrationId: string
  ): Promise<CreateTeamInput> {
    // Map team name
    const name = this.mapField(ssoTeam.name, config.teamNameMapping?.name || 'name');

    if (!name || name.trim().length === 0) {
      throw new Error(`Team name is required for SSO team ${ssoTeam.externalId}`);
    }

    // Map manager - required for team creation
    let manager: TeamManager;
    try {
      manager = await this.mapManager(
        ssoTeam.managerExternalId,
        config,
        tenantId,
        integrationId
      );
    } catch (error: unknown) {
      // If manager mapping fails, we cannot create the team
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to map manager for team ${ssoTeam.externalId}: ${errorMessage}`);
    }

    // Map members - filter out nulls (members that don't exist in system)
    const members = await Promise.all(
      (ssoTeam.memberExternalIds || []).map(externalId =>
        this.mapMember(externalId, config, tenantId, integrationId)
      )
    );

    // Map parent team
    let parentTeamId: string | undefined;
    if (ssoTeam.parentTeamExternalId) {
      const externalSource = await this.getExternalSourceFromIntegration(integrationId, tenantId);
      const parentTeams = await this.teamService.getTeams(tenantId, {
        externalSource,
      });
      const parentTeam = parentTeams.find(t => t.externalId === ssoTeam.parentTeamExternalId);
      if (parentTeam) {
        parentTeamId = parentTeam.id;
      }
    }

    return {
      name,
      manager,
      members: members.filter(m => m !== null),
      parentTeamId,
    };
  }

  /**
   * Map manager external ID to internal user
   */
  private async mapManager(
    managerExternalId: string | undefined,
    config: TeamSyncConfig,
    tenantId: string,
    integrationId: string
  ): Promise<TeamManager> {
    if (!managerExternalId || !this.externalUserIdService) {
      throw new Error('Manager external ID is required for team sync');
    }

    // Get internal user ID from external ID
    const userMapping = await this.externalUserIdService.getUserByExternalId(
      managerExternalId,
      tenantId,
      integrationId
    );

    if (!userMapping) {
      throw new Error(`Manager not found for external ID: ${managerExternalId}`);
    }

    return {
      userId: userMapping.userId,
      email: userMapping.email || '',
      firstname: userMapping.firstname,
      lastname: userMapping.lastname,
    };
  }

  /**
   * Map member external ID to internal user
   */
  private async mapMember(
    memberExternalId: string,
    config: TeamSyncConfig,
    tenantId: string,
    integrationId: string
  ): Promise<TeamMember | null> {
    if (!this.externalUserIdService) {
      return null;
    }

    // Get internal user ID from external ID
    const userMapping = await this.externalUserIdService.getUserByExternalId(
      memberExternalId,
      tenantId,
      integrationId
    );

    if (!userMapping) {
      // Skip members that don't exist in the system
      return null;
    }

    return {
      userId: userMapping.userId,
      email: userMapping.email || '',
      firstname: userMapping.firstname,
      lastname: userMapping.lastname,
      role: config.memberMapping?.role,
      function: config.memberMapping?.function,
    };
  }

  /**
   * Map field using mapping config
   */
  private mapField(value: any, mapping?: string): any {
    if (!mapping) {
      return value;
    }

    // Simple field mapping - can be extended for complex mappings
    return value;
  }

  /**
   * Get external source from integration
   */
  private async getExternalSourceFromIntegration(
    integrationId: string,
    tenantId: string
  ): Promise<'azure_ad' | 'okta' | 'google'> {
    try {
      // Get integration to determine provider
      const integration = await this.integrationService.getIntegration(integrationId, tenantId);
      if (integration) {
        const providerName = integration.providerName?.toLowerCase() || '';
        if (providerName.includes('azure') || providerName.includes('microsoft')) {
          return 'azure_ad';
        }
        if (providerName.includes('okta')) {
          return 'okta';
        }
        if (providerName.includes('google')) {
          return 'google';
        }
      }
    } catch (error: unknown) {
      // Fallback to ID-based detection
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'ssoTeamSync.getExternalSourceFromIntegration',
          integrationId,
          tenantId,
        }
      );
    }

    // Fallback: check integration ID
    if (integrationId.includes('azure') || integrationId.includes('microsoft')) {
      return 'azure_ad';
    }
    if (integrationId.includes('okta')) {
      return 'okta';
    }
    if (integrationId.includes('google')) {
      return 'google';
    }
    return 'azure_ad'; // Default
  }
}


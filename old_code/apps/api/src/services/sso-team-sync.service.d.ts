/**
 * SSO Team Sync Service
 * Synchronizes teams from SSO providers (Azure AD, Okta, Google Workspace)
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { TeamService } from './team.service.js';
import { IntegrationService } from './integration.service.js';
import { AdapterManagerService } from './adapter-manager.service.js';
import { IntegrationExternalUserIdService } from './integration-external-user-id.service.js';
import type { SSOTeam, TeamSyncConfig } from '../types/team.types.js';
export interface SyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{
        teamId: string;
        error: string;
    }>;
}
export declare class SSOTeamSyncService {
    private monitoring;
    private teamService;
    private integrationService;
    private adapterManager;
    private externalUserIdService?;
    constructor(monitoring: IMonitoringProvider, teamService: TeamService, integrationService: IntegrationService, adapterManager: AdapterManagerService, externalUserIdService?: IntegrationExternalUserIdService | undefined);
    /**
     * Sync teams from SSO for a tenant
     */
    syncTeamsFromSSO(tenantId: string, integrationId: string, userId?: string): Promise<SyncResult>;
    /**
     * Sync a single team from SSO
     */
    syncTeamFromSSO(ssoTeam: SSOTeam, tenantId: string, integrationId: string, config: TeamSyncConfig, userId: string): Promise<{
        created: boolean;
        updated: boolean;
    }>;
    /**
     * Sync teams on user login (from SSO token groups)
     */
    syncTeamsOnLogin(userId: string, tenantId: string, ssoGroups: string[], integrationId: string): Promise<void>;
    /**
     * Get team sync configuration
     */
    getTeamSyncConfig(tenantId: string, integrationId: string): Promise<TeamSyncConfig | null>;
    /**
     * Update team sync configuration
     */
    updateTeamSyncConfig(tenantId: string, integrationId: string, config: TeamSyncConfig): Promise<void>;
    /**
     * Fetch teams from adapter
     */
    private fetchTeamsFromAdapter;
    /**
     * Map SSO team to internal team structure
     */
    private mapSSOTeamToUserTeam;
    /**
     * Map manager external ID to internal user
     */
    private mapManager;
    /**
     * Map member external ID to internal user
     */
    private mapMember;
    /**
     * Map field using mapping config
     */
    private mapField;
    /**
     * Get external source from integration
     */
    private getExternalSourceFromIntegration;
}
//# sourceMappingURL=sso-team-sync.service.d.ts.map
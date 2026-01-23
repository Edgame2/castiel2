/**
 * SSO Team Sync Service
 * Synchronizes teams from SSO providers (Azure AD, Okta, Google Workspace)
 */
export class SSOTeamSyncService {
    monitoring;
    teamService;
    integrationService;
    adapterManager;
    externalUserIdService;
    constructor(monitoring, teamService, integrationService, adapterManager, externalUserIdService) {
        this.monitoring = monitoring;
        this.teamService = teamService;
        this.integrationService = integrationService;
        this.adapterManager = adapterManager;
        this.externalUserIdService = externalUserIdService;
    }
    /**
     * Sync teams from SSO for a tenant
     */
    async syncTeamsFromSSO(tenantId, integrationId, userId) {
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
            const adapter = await this.adapterManager.getAdapter(integration.providerName, integration, userId);
            if (!adapter || typeof adapter !== 'object' || !('fetchTeams' in adapter) || typeof adapter.fetchTeams !== 'function') {
                throw new Error(`Adapter for ${integration.providerName} does not support team sync`);
            }
            // Fetch teams from SSO
            const ssoTeams = await this.fetchTeamsFromAdapter(adapter, config);
            // Sync each team
            const result = {
                created: 0,
                updated: 0,
                skipped: 0,
                errors: [],
            };
            for (const ssoTeam of ssoTeams) {
                try {
                    const syncResult = await this.syncTeamFromSSO(ssoTeam, tenantId, integrationId, config, userId || 'system');
                    if (syncResult.created) {
                        result.created++;
                    }
                    else if (syncResult.updated) {
                        result.updated++;
                    }
                    else {
                        result.skipped++;
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    result.errors.push({
                        teamId: ssoTeam.externalId,
                        error: errorMessage,
                    });
                    this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                        operation: 'ssoTeamSync.syncTeam',
                        teamExternalId: ssoTeam.externalId,
                        tenantId,
                    });
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
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'ssoTeamSync.syncTeamsFromSSO',
                tenantId,
                integrationId,
                durationMs: Date.now() - startTime,
            });
            throw error;
        }
    }
    /**
     * Sync a single team from SSO
     */
    async syncTeamFromSSO(ssoTeam, tenantId, integrationId, config, userId) {
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
            await this.teamService.updateTeam(existingTeam.id, {
                name: teamInput.name,
                manager: teamInput.manager,
                members: teamInput.members,
                parentTeamId: teamInput.parentTeamId,
                syncEnabled: true,
            }, tenantId, userId);
            // Update syncedAt timestamp (would need to add this field to update)
            return { created: false, updated: true };
        }
        else {
            // Create new team
            await this.teamService.createTeam({
                ...teamInput,
                externalId: ssoTeam.externalId,
                externalSource,
                syncEnabled: true,
            }, tenantId, userId);
            return { created: true, updated: false };
        }
    }
    /**
     * Sync teams on user login (from SSO token groups)
     */
    async syncTeamsOnLogin(userId, tenantId, ssoGroups, integrationId) {
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
            const adapter = await this.adapterManager.getAdapter(integration.providerName, integration, userId);
            if (!adapter || typeof adapter !== 'object' || !('fetchTeams' in adapter) || typeof adapter.fetchTeams !== 'function') {
                return; // Adapter doesn't support team sync
            }
            // Fetch teams for the groups in the token
            const allTeams = await this.fetchTeamsFromAdapter(adapter, config);
            const relevantTeams = allTeams.filter(team => ssoGroups.some(groupId => groupId === team.externalId));
            // Sync each relevant team
            for (const ssoTeam of relevantTeams) {
                try {
                    await this.syncTeamFromSSO(ssoTeam, tenantId, integrationId, config, userId);
                }
                catch (error) {
                    // Log error but continue with other teams - don't fail login if team sync fails
                    this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                        operation: 'ssoTeamSync.syncTeamsOnLogin',
                        userId,
                        tenantId,
                        teamExternalId: ssoTeam.externalId,
                    });
                    // Continue with next team instead of failing entire sync
                }
            }
            this.monitoring.trackEvent('ssoTeamSync.loginSync', {
                userId,
                tenantId,
                teamCount: relevantTeams.length,
                durationMs: Date.now() - startTime,
            });
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'ssoTeamSync.syncTeamsOnLogin',
                userId,
                tenantId,
                durationMs: Date.now() - startTime,
            });
            // Don't throw - login should not fail if team sync fails
        }
    }
    /**
     * Get team sync configuration
     */
    async getTeamSyncConfig(tenantId, integrationId) {
        try {
            const integration = await this.integrationService.getIntegration(integrationId, tenantId);
            if (!integration) {
                return null;
            }
            // Get config from integration document
            const syncConfig = integration && typeof integration === 'object' && 'syncConfig' in integration
                ? integration.syncConfig
                : undefined;
            if (!syncConfig || !syncConfig.teamSync || typeof syncConfig.teamSync !== 'object') {
                return null;
            }
            const teamSync = syncConfig.teamSync;
            return {
                enabled: teamSync.enabled ?? false,
                teamNameMapping: teamSync.entityMappings || {},
                managerMapping: teamSync.fieldMappings?.manager || {},
                memberMapping: teamSync.fieldMappings?.members || {},
                hierarchyMapping: teamSync.fieldMappings?.parentTeamId || {},
                preserveManualEdits: teamSync.preserveManualEdits ?? true,
            };
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'ssoTeamSync.getTeamSyncConfig',
                tenantId,
                integrationId,
            });
            return null;
        }
    }
    /**
     * Update team sync configuration
     */
    async updateTeamSyncConfig(tenantId, integrationId, config) {
        try {
            const integration = await this.integrationService.getIntegration(integrationId, tenantId);
            if (!integration) {
                throw new Error('Integration not found');
            }
            // Get existing syncConfig or create new one
            const existingSyncConfig = integration && typeof integration === 'object' && 'syncConfig' in integration
                ? integration.syncConfig || {}
                : {};
            // Merge team sync config into existing syncConfig, preserving all existing fields
            const updatedSyncConfig = {
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
            await this.integrationService.updateIntegration(integrationId, tenantId, {
                syncConfig: updatedSyncConfig,
            }, systemUser);
            this.monitoring.trackEvent('ssoTeamSync.configUpdated', {
                tenantId,
                integrationId,
                enabled: config.enabled,
            });
        }
        catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'ssoTeamSync.updateTeamSyncConfig',
                tenantId,
                integrationId,
            });
            throw error;
        }
    }
    /**
     * Fetch teams from adapter
     */
    async fetchTeamsFromAdapter(adapter, config) {
        const fetchTeams = adapter.fetchTeams;
        if (!fetchTeams) {
            throw new Error('Adapter does not support fetchTeams');
        }
        return await fetchTeams(config);
    }
    /**
     * Map SSO team to internal team structure
     */
    async mapSSOTeamToUserTeam(ssoTeam, config, tenantId, integrationId) {
        // Map team name
        const name = this.mapField(ssoTeam.name, config.teamNameMapping?.name || 'name');
        if (!name || name.trim().length === 0) {
            throw new Error(`Team name is required for SSO team ${ssoTeam.externalId}`);
        }
        // Map manager - required for team creation
        let manager;
        try {
            manager = await this.mapManager(ssoTeam.managerExternalId, config, tenantId, integrationId);
        }
        catch (error) {
            // If manager mapping fails, we cannot create the team
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to map manager for team ${ssoTeam.externalId}: ${errorMessage}`);
        }
        // Map members - filter out nulls (members that don't exist in system)
        const members = await Promise.all((ssoTeam.memberExternalIds || []).map(externalId => this.mapMember(externalId, config, tenantId, integrationId)));
        // Map parent team
        let parentTeamId;
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
    async mapManager(managerExternalId, config, tenantId, integrationId) {
        if (!managerExternalId || !this.externalUserIdService) {
            throw new Error('Manager external ID is required for team sync');
        }
        // Get internal user ID from external ID
        const userMapping = await this.externalUserIdService.getUserByExternalId(managerExternalId, tenantId, integrationId);
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
    async mapMember(memberExternalId, config, tenantId, integrationId) {
        if (!this.externalUserIdService) {
            return null;
        }
        // Get internal user ID from external ID
        const userMapping = await this.externalUserIdService.getUserByExternalId(memberExternalId, tenantId, integrationId);
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
    mapField(value, mapping) {
        if (!mapping) {
            return value;
        }
        // Simple field mapping - can be extended for complex mappings
        return value;
    }
    /**
     * Get external source from integration
     */
    async getExternalSourceFromIntegration(integrationId, tenantId) {
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
        }
        catch (error) {
            // Fallback to ID-based detection
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'ssoTeamSync.getExternalSourceFromIntegration',
                integrationId,
                tenantId,
            });
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
//# sourceMappingURL=sso-team-sync.service.js.map
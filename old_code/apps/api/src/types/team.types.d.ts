/**
 * Team Types
 * Type definitions for user teams (sales teams)
 */
/**
 * Team Manager
 */
export interface TeamManager {
    userId: string;
    lastname?: string;
    firstname?: string;
    email: string;
}
/**
 * Team Member
 */
export interface TeamMember {
    userId: string;
    lastname?: string;
    firstname?: string;
    email: string;
    role?: string;
    function?: string;
}
/**
 * Team (domain model)
 */
export interface Team {
    id: string;
    tenantId: string;
    name: string;
    manager: TeamManager;
    members: TeamMember[];
    parentTeamId?: string;
    externalId?: string;
    externalSource?: 'azure_ad' | 'okta' | 'google' | 'manual';
    syncEnabled: boolean;
    isManuallyEdited: boolean;
    syncedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
}
/**
 * Create Team Input
 */
export interface CreateTeamInput {
    name: string;
    manager: TeamManager;
    members?: TeamMember[];
    parentTeamId?: string;
    externalId?: string;
    externalSource?: 'azure_ad' | 'okta' | 'google' | 'manual';
    syncEnabled?: boolean;
}
/**
 * Update Team Input
 */
export interface UpdateTeamInput {
    name?: string;
    manager?: TeamManager;
    members?: TeamMember[];
    parentTeamId?: string | null;
    syncEnabled?: boolean;
}
/**
 * Team Filters
 */
export interface TeamFilters {
    managerId?: string;
    memberId?: string;
    parentTeamId?: string | null;
    externalSource?: 'azure_ad' | 'okta' | 'google' | 'manual';
    syncEnabled?: boolean;
    isManuallyEdited?: boolean;
}
/**
 * SSO Team (from external source)
 */
export interface SSOTeam {
    externalId: string;
    name: string;
    managerExternalId?: string;
    memberExternalIds: string[];
    parentTeamExternalId?: string;
    metadata?: Record<string, any>;
}
/**
 * Team Sync Configuration
 */
export interface TeamSyncConfig {
    enabled: boolean;
    teamNameMapping?: Record<string, string>;
    managerMapping?: Record<string, string>;
    memberMapping?: Record<string, string>;
    hierarchyMapping?: Record<string, string>;
    preserveManualEdits: boolean;
}
//# sourceMappingURL=team.types.d.ts.map
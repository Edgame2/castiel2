/**
 * Team Service
 * Manages user teams (sales teams) with hierarchical support and SSO integration
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
import { AuditLogService } from './audit/audit-log.service.js';
import type { Team, CreateTeamInput, UpdateTeamInput, TeamFilters, TeamManager, TeamMember } from '../types/team.types.js';
export declare class TeamService {
    private monitoring;
    private shardRepository;
    private shardTypeRepository;
    private relationshipService;
    private auditLogService?;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, relationshipService: ShardRelationshipService, auditLogService?: AuditLogService | undefined);
    /**
     * Get a team by ID
     */
    getTeam(teamId: string, tenantId: string): Promise<Team | null>;
    /**
     * Get teams with filters
     */
    getTeams(tenantId: string, filters?: TeamFilters): Promise<Team[]>;
    /**
     * Create a new team
     */
    createTeam(input: CreateTeamInput, tenantId: string, userId: string): Promise<Team>;
    /**
     * Update a team
     */
    updateTeam(teamId: string, input: UpdateTeamInput, tenantId: string, userId: string): Promise<Team>;
    /**
     * Delete a team
     */
    deleteTeam(teamId: string, tenantId: string, userId: string): Promise<void>;
    /**
     * Get parent team
     */
    getParentTeam(teamId: string, tenantId: string): Promise<Team | null>;
    /**
     * Get child teams (direct children only)
     */
    getChildTeams(teamId: string, tenantId: string): Promise<Team[]>;
    /**
     * Get all descendant teams (recursive)
     * Includes cycle detection to prevent infinite recursion
     */
    getDescendantTeams(teamId: string, tenantId: string, visited?: Set<string>, maxDepth?: number): Promise<Team[]>;
    /**
     * Get team members
     */
    getTeamMembers(teamId: string, tenantId: string): Promise<TeamMember[]>;
    /**
     * Get team manager
     */
    getTeamManager(teamId: string, tenantId: string): Promise<TeamManager | null>;
    /**
     * Get all user IDs in a team (manager + members)
     */
    getTeamUserIds(teamId: string, tenantId: string): Promise<string[]>;
    /**
     * Get all user IDs in a team including descendants (recursive)
     */
    getTeamUserIdsRecursive(teamId: string, tenantId: string): Promise<string[]>;
    /**
     * Get teams managed by a user
     */
    getManagerTeams(userId: string, tenantId: string): Promise<Team[]>;
    /**
     * Get teams where user is a member
     */
    getUserTeams(userId: string, tenantId: string): Promise<Team[]>;
    /**
     * Get team for a user (first team where user is manager or member)
     */
    getTeamForUser(userId: string, tenantId: string): Promise<Team | null>;
    /**
     * Check if user is manager of a team
     */
    isUserManagerOfTeam(userId: string, teamId: string, tenantId: string): Promise<boolean>;
    /**
     * Check if user is member of a team
     */
    isUserMemberOfTeam(userId: string, teamId: string, tenantId: string): Promise<boolean>;
    /**
     * Validate team hierarchy (prevent circular references)
     */
    validateTeamHierarchy(teamId: string, parentTeamId: string | null, tenantId: string): Promise<boolean>;
    /**
     * Convert Shard to Team
     */
    private shardToTeam;
    /**
     * Validate team input
     */
    private validateTeamInput;
}
//# sourceMappingURL=team.service.d.ts.map
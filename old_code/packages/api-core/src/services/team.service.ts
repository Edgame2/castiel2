/**
 * Team Service
 * Manages user teams (sales teams) with hierarchical support and SSO integration
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
import { AuditLogService } from './audit/audit-log.service.js';
import type {
  Team,
  CreateTeamInput,
  UpdateTeamInput,
  TeamFilters,
  TeamManager,
  TeamMember,
} from '../types/team.types.js';
import type { Shard } from '../types/shard.types.js';
import { CORE_SHARD_TYPE_NAMES } from '../types/core-shard-types.js';
import { RelationshipType } from '../types/shard-edge.types.js';
import { v4 as uuidv4 } from 'uuid';

export class TeamService {
  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private shardTypeRepository: ShardTypeRepository,
    private relationshipService: ShardRelationshipService,
    private auditLogService?: AuditLogService
  ) {}

  /**
   * Get a team by ID
   */
  async getTeam(teamId: string, tenantId: string): Promise<Team | null> {
    const startTime = Date.now();

    try {
      const shard = await this.shardRepository.findById(teamId, tenantId);

      if (!shard || shard.shardTypeId !== CORE_SHARD_TYPE_NAMES.USER_TEAMS) {
        return null;
      }

      return this.shardToTeam(shard);
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'team.getTeam',
          teamId,
          tenantId,
          durationMs: Date.now() - startTime,
        }
      );
      throw error;
    }
  }

  /**
   * Get teams with filters
   */
  async getTeams(tenantId: string, filters?: TeamFilters): Promise<Team[]> {
    const startTime = Date.now();

    try {
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.USER_TEAMS,
        'system'
      );

      if (!shardType) {
        throw new Error('User Teams shard type not found');
      }

      // Use list method with basic filters
      const result = await this.shardRepository.list({
        filter: {
          tenantId,
          shardTypeId: shardType.id,
        },
        limit: 1000, // Get all teams (adjust if needed)
      });

      let teams = result.shards.map(shard => this.shardToTeam(shard));

      // Apply additional filters in memory (for complex queries like memberId)
      if (filters?.managerId) {
        teams = teams.filter(team => team.manager?.userId === filters.managerId);
      }

      if (filters?.memberId) {
        teams = teams.filter(team =>
          team.members && Array.isArray(team.members) && team.members.some(member => member?.userId === filters.memberId)
        );
      }

      if (filters?.parentTeamId !== undefined) {
        if (filters.parentTeamId === null) {
          teams = teams.filter(team => !team.parentTeamId);
        } else {
          teams = teams.filter(team => team.parentTeamId === filters.parentTeamId);
        }
      }

      if (filters?.externalSource) {
        teams = teams.filter(team => team.externalSource === filters.externalSource);
      }

      if (filters?.syncEnabled !== undefined) {
        teams = teams.filter(team => team.syncEnabled === filters.syncEnabled);
      }

      if (filters?.isManuallyEdited !== undefined) {
        teams = teams.filter(team => team.isManuallyEdited === filters.isManuallyEdited);
      }

      return teams;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'team.getTeams',
          tenantId,
          durationMs: Date.now() - startTime,
        }
      );
      throw error;
    }
  }

  /**
   * Create a new team
   */
  async createTeam(
    input: CreateTeamInput,
    tenantId: string,
    userId: string
  ): Promise<Team> {
    const startTime = Date.now();

    try {
      // Validate input
      this.validateTeamInput(input);

      // Validate hierarchy (no circular references)
      if (input.parentTeamId) {
        const isValid = await this.validateTeamHierarchy(
          '', // new team, no ID yet
          input.parentTeamId,
          tenantId
        );
        if (!isValid) {
          throw new Error('Invalid team hierarchy: circular reference detected');
        }
      }

      // Get shard type
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.USER_TEAMS,
        'system'
      );

      if (!shardType) {
        throw new Error('User Teams shard type not found');
      }

      // Create team shard
      const shard = await this.shardRepository.create({
        tenantId,
        userId,
        shardTypeId: shardType.id,
        structuredData: {
          name: input.name,
          manager: input.manager,
          members: input.members || [],
          parentTeamId: input.parentTeamId,
          externalId: input.externalId,
          externalSource: input.externalSource || 'manual',
          syncEnabled: input.syncEnabled ?? true,
          isManuallyEdited: false,
          syncedAt: null,
        },
      });

      // Create parent-child relationship if parent exists
      if (input.parentTeamId) {
        await this.relationshipService.createRelationship({
          sourceShardId: input.parentTeamId,
          targetShardId: shard.id,
          relationshipType: RelationshipType.PARENT_OF,
          tenantId,
          sourceShardTypeId: shard.shardTypeId,
          sourceShardTypeName: shard.shardTypeName || shard.shardTypeId,
          targetShardTypeId: shard.shardTypeId,
          targetShardTypeName: shard.shardTypeName || shard.shardTypeId,
          createdBy: userId,
        });
      }

      const team = this.shardToTeam(shard);

      // Audit log
      if (this.auditLogService) {
        await this.auditLogService.log({
          tenantId,
          actorId: userId,
          category: 'team' as any,
          eventType: 'team.created' as any,
          outcome: 'success' as any,
          message: `Team ${team.name} created`,
          targetId: team.id,
          targetType: 'team',
          targetName: team.name,
          details: {
            teamName: team.name,
            managerId: team.manager?.userId || 'unknown',
            memberCount: team.members?.length || 0,
          },
        });
      }

      this.monitoring.trackEvent('team.created', {
        tenantId,
        userId,
        teamId: team.id,
        durationMs: Date.now() - startTime,
      });

      return team;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'team.createTeam',
          tenantId,
          userId,
          durationMs: Date.now() - startTime,
        }
      );
      throw error;
    }
  }

  /**
   * Update a team
   */
  async updateTeam(
    teamId: string,
    input: UpdateTeamInput,
    tenantId: string,
    userId: string
  ): Promise<Team> {
    const startTime = Date.now();

    try {
      const existingTeam = await this.getTeam(teamId, tenantId);
      if (!existingTeam) {
        throw new Error('Team not found');
      }

      // Validate hierarchy if parent is being changed
      if (input.parentTeamId !== undefined && input.parentTeamId !== existingTeam.parentTeamId) {
        const isValid = await this.validateTeamHierarchy(
          teamId,
          input.parentTeamId || null,
          tenantId
        );
        if (!isValid) {
          throw new Error('Invalid team hierarchy: circular reference detected');
        }
      }

      // Build update data
      const updateData: any = {};

      if (input.name !== undefined) {
        updateData.name = input.name;
      }

      if (input.manager !== undefined) {
        updateData.manager = input.manager;
      }

      if (input.members !== undefined) {
        updateData.members = input.members;
      }

      if (input.parentTeamId !== undefined) {
        updateData.parentTeamId = input.parentTeamId || null;
      }

      if (input.syncEnabled !== undefined) {
        updateData.syncEnabled = input.syncEnabled;
      }

      // Mark as manually edited if not from SSO
      if (existingTeam.externalSource === 'manual' || !existingTeam.externalSource) {
        updateData.isManuallyEdited = true;
      }

      // Update shard
      const updatedShard = await this.shardRepository.update(teamId, tenantId, {
        structuredData: {
          ...existingTeam,
          ...updateData,
        },
      });

      if (!updatedShard) {
        throw new Error('Failed to update team shard');
      }

      // Update parent-child relationship
      if (input.parentTeamId !== undefined) {
        // Remove old relationship
        if (existingTeam.parentTeamId) {
          const relationships = await this.relationshipService.getRelationships(
            tenantId,
            existingTeam.parentTeamId,
            'outgoing',
            { relationshipType: RelationshipType.PARENT_OF }
          );
          const relationship = relationships.find(r => r.targetShardId === teamId);
          if (relationship) {
            await this.relationshipService.deleteRelationship(
              relationship.id,
              tenantId
            );
          }
        }

        // Create new relationship
        if (input.parentTeamId) {
          await this.relationshipService.createRelationship({
            sourceShardId: input.parentTeamId,
            targetShardId: teamId,
            relationshipType: RelationshipType.PARENT_OF,
            tenantId,
            sourceShardTypeId: updatedShard.shardTypeId,
            sourceShardTypeName: updatedShard.shardTypeName || updatedShard.shardTypeId,
            targetShardTypeId: updatedShard.shardTypeId,
            targetShardTypeName: updatedShard.shardTypeName || updatedShard.shardTypeId,
            createdBy: userId,
          });
        }
      }
      const team = this.shardToTeam(updatedShard);

      // Audit log
      if (this.auditLogService) {
        await this.auditLogService.log({
          tenantId,
          actorId: userId,
          category: 'team' as any,
          eventType: 'team.updated' as any,
          outcome: 'success' as any,
          message: `Team ${team.name} updated`,
          targetId: team.id,
          targetType: 'team',
          targetName: team.name,
          details: {
            teamName: team.name,
            changes: Object.keys(updateData),
          },
        });
      }

      this.monitoring.trackEvent('team.updated', {
        tenantId,
        userId,
        teamId: team.id,
        durationMs: Date.now() - startTime,
      });

      return team;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'team.updateTeam',
          teamId,
          tenantId,
          userId,
          durationMs: Date.now() - startTime,
        }
      );
      throw error;
    }
  }

  /**
   * Delete a team
   */
  async deleteTeam(teamId: string, tenantId: string, userId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const team = await this.getTeam(teamId, tenantId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Check if team has child teams
      const childTeams = await this.getChildTeams(teamId, tenantId);
      if (childTeams.length > 0) {
        throw new Error('Cannot delete team with child teams');
      }

      // Delete relationships
      if (team.parentTeamId) {
        const relationships = await this.relationshipService.getRelationships(
          tenantId,
          team.parentTeamId,
          'outgoing',
          { relationshipType: RelationshipType.PARENT_OF }
        );
        const relationship = relationships.find(r => r.targetShardId === teamId);
        if (relationship) {
          await this.relationshipService.deleteRelationship(
            relationship.id,
            tenantId
          );
        }
      }

      // Delete shard
      await this.shardRepository.delete(teamId, tenantId);

      // Audit log
      if (this.auditLogService) {
        await this.auditLogService.log({
          tenantId,
          actorId: userId,
          category: 'team' as any,
          eventType: 'team.deleted' as any,
          outcome: 'success' as any,
          message: `Team ${team.name} deleted`,
          targetId: teamId,
          targetType: 'team',
          targetName: team.name,
          details: {
            teamName: team.name,
          },
        });
      }

      this.monitoring.trackEvent('team.deleted', {
        tenantId,
        userId,
        teamId,
        durationMs: Date.now() - startTime,
      });
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'team.deleteTeam',
          teamId,
          tenantId,
          userId,
          durationMs: Date.now() - startTime,
        }
      );
      throw error;
    }
  }

  /**
   * Get parent team
   */
  async getParentTeam(teamId: string, tenantId: string): Promise<Team | null> {
    const team = await this.getTeam(teamId, tenantId);
    if (!team || !team.parentTeamId) {
      return null;
    }

    return this.getTeam(team.parentTeamId, tenantId);
  }

  /**
   * Get child teams (direct children only)
   */
  async getChildTeams(teamId: string, tenantId: string): Promise<Team[]> {
    return this.getTeams(tenantId, { parentTeamId: teamId });
  }

  /**
   * Get all descendant teams (recursive)
   * Includes cycle detection to prevent infinite recursion
   */
  async getDescendantTeams(teamId: string, tenantId: string, visited: Set<string> = new Set(), maxDepth: number = 50): Promise<Team[]> {
    // Prevent infinite recursion
    if (visited.has(teamId)) {
      this.monitoring.trackEvent('team.cycleDetected', {
        teamId,
        tenantId,
        visitedTeamsCount: Array.from(visited).length,
      });
      return []; // Cycle detected, return empty to prevent infinite loop
    }

    if (maxDepth <= 0) {
      this.monitoring.trackEvent('team.maxDepthReached', {
        teamId,
        tenantId,
        depth: 50,
      });
      return []; // Maximum depth reached
    }

    visited.add(teamId);
    const descendants: Team[] = [];
    
    try {
      const directChildren = await this.getChildTeams(teamId, tenantId);

      for (const child of directChildren) {
        descendants.push(child);
        const childDescendants = await this.getDescendantTeams(child.id, tenantId, new Set(visited), maxDepth - 1);
        descendants.push(...childDescendants);
      }
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'team.getDescendantTeams',
          teamId,
          tenantId,
        }
      );
      // Return partial results rather than failing completely
    }

    return descendants;
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string, tenantId: string): Promise<TeamMember[]> {
    const team = await this.getTeam(teamId, tenantId);
    if (!team) {
      return [];
    }

    return team.members;
  }

  /**
   * Get team manager
   */
  async getTeamManager(teamId: string, tenantId: string): Promise<TeamManager | null> {
    const team = await this.getTeam(teamId, tenantId);
    if (!team || !team.manager) {
      return null;
    }

    return team.manager;
  }

  /**
   * Get all user IDs in a team (manager + members)
   */
  async getTeamUserIds(teamId: string, tenantId: string): Promise<string[]> {
    const team = await this.getTeam(teamId, tenantId);
    if (!team) {
      return [];
    }

    const userIdSet = new Set<string>();
    
    // Add manager if exists
    if (team.manager?.userId) {
      userIdSet.add(team.manager.userId);
    }
    
    // Add members
    if (team.members && Array.isArray(team.members)) {
      team.members.forEach(member => {
        if (member?.userId) {
          userIdSet.add(member.userId);
        }
      });
    }

    return Array.from(userIdSet);
  }

  /**
   * Get all user IDs in a team including descendants (recursive)
   */
  async getTeamUserIdsRecursive(teamId: string, tenantId: string): Promise<string[]> {
    const userIds = await this.getTeamUserIds(teamId, tenantId);
    const descendants = await this.getDescendantTeams(teamId, tenantId);

    // Parallelize fetching user IDs from all descendant teams
    const descendantUserIdsPromises = descendants.map(descendant =>
      this.getTeamUserIds(descendant.id, tenantId)
    );
    const descendantUserIdsArrays = await Promise.all(descendantUserIdsPromises);

    // Use Set for efficient deduplication
    const userIdSet = new Set(userIds);
    for (const descendantUserIds of descendantUserIdsArrays) {
      for (const id of descendantUserIds) {
        userIdSet.add(id);
      }
    }

    return Array.from(userIdSet);
  }

  /**
   * Get teams managed by a user
   */
  async getManagerTeams(userId: string, tenantId: string): Promise<Team[]> {
    return this.getTeams(tenantId, { managerId: userId });
  }

  /**
   * Get teams where user is a member
   */
  async getUserTeams(userId: string, tenantId: string): Promise<Team[]> {
    return this.getTeams(tenantId, { memberId: userId });
  }

  /**
   * Get team for a user (first team where user is manager or member)
   */
  async getTeamForUser(userId: string, tenantId: string): Promise<Team | null> {
    // Check if user is a manager
    const managerTeams = await this.getManagerTeams(userId, tenantId);
    if (managerTeams.length > 0) {
      return managerTeams[0];
    }

    // Check if user is a member
    const memberTeams = await this.getUserTeams(userId, tenantId);
    if (memberTeams.length > 0) {
      return memberTeams[0];
    }

    return null;
  }

  /**
   * Check if user is manager of a team
   */
  async isUserManagerOfTeam(
    userId: string,
    teamId: string,
    tenantId: string
  ): Promise<boolean> {
    const team = await this.getTeam(teamId, tenantId);
    if (!team || !team.manager) {
      return false;
    }

    return team.manager.userId === userId;
  }

  /**
   * Check if user is member of a team
   */
  async isUserMemberOfTeam(
    userId: string,
    teamId: string,
    tenantId: string
  ): Promise<boolean> {
    const team = await this.getTeam(teamId, tenantId);
    if (!team || !team.members || !Array.isArray(team.members)) {
      return false;
    }

    return team.members.some(member => member?.userId === userId);
  }

  /**
   * Validate team hierarchy (prevent circular references)
   */
  async validateTeamHierarchy(
    teamId: string,
    parentTeamId: string | null,
    tenantId: string
  ): Promise<boolean> {
    if (!parentTeamId) {
      return true; // No parent, always valid
    }

    // Cannot be parent of itself
    if (teamId === parentTeamId) {
      return false;
    }

    // Check if parentTeamId is a descendant of teamId (would create cycle)
    if (teamId) {
      const descendants = await this.getDescendantTeams(teamId, tenantId);
      if (descendants.some(d => d.id === parentTeamId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Convert Shard to Team
   */
  private shardToTeam(shard: Shard): Team {
    const data = shard.structuredData as any;

    // Validate required fields
    if (!data || typeof data !== 'object') {
      throw new Error(`Invalid team shard data for team ${shard.id}`);
    }

    if (!data.name || typeof data.name !== 'string') {
      throw new Error(`Team ${shard.id} is missing required field: name`);
    }

    if (!data.manager || typeof data.manager !== 'object' || !data.manager.userId) {
      throw new Error(`Team ${shard.id} is missing required field: manager with userId`);
    }

    return {
      id: shard.id,
      tenantId: shard.tenantId,
      name: data.name,
      manager: data.manager,
      members: Array.isArray(data.members) ? data.members : [],
      parentTeamId: data.parentTeamId || null,
      externalId: data.externalId,
      externalSource: data.externalSource || 'manual',
      syncEnabled: data.syncEnabled ?? true,
      isManuallyEdited: data.isManuallyEdited ?? false,
      syncedAt: data.syncedAt ? new Date(data.syncedAt) : undefined,
      createdAt: shard.createdAt,
      updatedAt: shard.updatedAt,
      createdBy: shard.userId,
      updatedBy: shard.userId,
    };
  }

  /**
   * Validate team input
   */
  private validateTeamInput(input: CreateTeamInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Team name is required');
    }

    // Validate team name length
    const trimmedName = input.name.trim();
    if (trimmedName.length > 200) {
      throw new Error('Team name must be 200 characters or less');
    }

    if (!input.manager || !input.manager.userId || !input.manager.email) {
      throw new Error('Team manager is required with userId and email');
    }

    // Validate manager email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.manager.email.trim())) {
      throw new Error('Manager email must be a valid email address');
    }

    // Validate manager userId format (should be non-empty string)
    if (typeof input.manager.userId !== 'string' || input.manager.userId.trim().length === 0) {
      throw new Error('Manager userId must be a non-empty string');
    }

    // Validate members
    if (input.members) {
      if (!Array.isArray(input.members)) {
        throw new Error('Members must be an array');
      }

      // Limit member count to prevent performance issues
      if (input.members.length > 1000) {
        throw new Error('Team cannot have more than 1000 members');
      }

      for (const member of input.members) {
        if (!member || typeof member !== 'object') {
          throw new Error('All team members must be objects');
        }

        if (!member.userId || typeof member.userId !== 'string' || member.userId.trim().length === 0) {
          throw new Error('All team members must have a valid userId');
        }

        if (!member.email || typeof member.email !== 'string' || !emailRegex.test(member.email.trim())) {
          throw new Error('All team members must have a valid email address');
        }

        // Manager cannot be a member
        if (member.userId === input.manager.userId) {
          throw new Error('Manager cannot be a member of the same team');
        }
      }

      // Check for duplicate members
      const memberIds = new Set<string>();
      for (const member of input.members) {
        if (memberIds.has(member.userId)) {
          throw new Error(`Duplicate member found: ${member.userId}`);
        }
        memberIds.add(member.userId);
      }
    }
  }
}

/**
 * Team Service
 * 
 * Manages team CRUD operations and team membership.
 * Per ModuleImplementationGuide Section 6
 */

import { getDatabaseClient } from '@coder/shared';

/** Prisma-like DB client shape used by this service (shared returns Cosmos Database) */
type TeamDb = {
  team: {
    findUnique: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
  };
  membership: { findFirst: (args: unknown) => Promise<unknown> };
  teamMember: {
    findUnique: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
  };
};

function getDb(): TeamDb {
  return getDatabaseClient() as unknown as TeamDb;
}

/** Team shape returned by getTeam / createTeam / updateTeam (used by routes) */
export interface TeamResult {
  id: string;
  name: string;
  tenantId?: string;
  parentTeamId?: string | null;
  createdById?: string;
  [key: string]: unknown;
}

/**
 * Create a team
 */
export async function createTeam(
  tenantId: string,
  userId: string,
  name: string,
  description?: string,
  parentTeamId?: string
) {
  const db = getDb();
  
  // Validate name
  if (!name || name.trim().length === 0) {
    throw new Error('Team name is required');
  }
  
  if (name.length > 200) {
    throw new Error('Team name must be 200 characters or less');
  }
  
  // Validate parent team if provided
  if (parentTeamId) {
    const parentTeam = (await db.team.findUnique({
      where: { id: parentTeamId },
      select: { id: true, tenantId: true },
    })) as { id: string; tenantId: string } | null;
    
    if (!parentTeam) {
      throw new Error('Parent team not found');
    }
    
    if (parentTeam.tenantId !== tenantId) {
      throw new Error('Parent team must belong to the same tenant');
    }
  }
  
  // Check if user is a member of the tenant
  const membership = (await db.membership.findFirst({
    where: {
      userId,
      tenantId,
      status: 'active',
    },
  })) as { id: string } | null;
  
  if (!membership) {
    throw new Error('You must be a member of the tenant to create teams');
  }
  
  // Create team and automatically add creator as member
  const team = (await db.team.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      parentTeamId: parentTeamId || null,
      tenantId,
      createdById: userId,
      members: {
        create: {
          userId: userId,
          role: 'Project Manager', // Creator is Project Manager by default
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      },
    },
  })) as TeamResult;
  
  return team;
}

/**
 * Get team by ID
 */
export async function getTeam(teamId: string, userId?: string): Promise<TeamResult | null> {
  const db = getDb();
  
  const team = (await db.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      },
      projects: {
        select: { id: true, name: true },
      },
      subteams: {
        select: { id: true, name: true },
      },
    },
  })) as (TeamResult & { members: Array<{ userId: string }> }) | null;
  
  if (!team) {
    return null;
  }
  
  // If userId provided, check membership
  if (userId) {
    const isMember = team.members.some((m: { userId: string }) => m.userId === userId);
    if (!isMember) {
      throw new Error('You are not a member of this team');
    }
  }
  
  return team as TeamResult;
}

/**
 * List teams for a user in a tenant
 */
export async function listUserTeams(userId: string, tenantId?: string) {
  const db = getDb();
  
  const where: Record<string, unknown> = {
    members: {
      some: {
        userId,
      },
    },
  };
  
  if (tenantId) {
    where.tenantId = tenantId;
  }
  
  const teams = await db.team.findMany({
    where,
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
  
  return teams;
}

/**
 * Update team
 */
export async function updateTeam(
  teamId: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    parentTeamId?: string;
  }
) {
  const db = getDb();
  
  // Get team
  const team = (await db.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where: { userId },
      },
    },
  })) as { id: string; tenantId: string; createdById: string; members: Array<{ userId: string }> } | null;
  
  if (!team) {
    throw new Error('Team not found');
  }
  
  // Check if user is team creator or has permission
  const isTeamCreator = team.createdById === userId;
  const isMember = team.members.length > 0;
  
  if (!isTeamCreator && !isMember) {
    throw new Error('Permission denied. Only team creator or members can update teams.');
  }
  
  // Prepare update data
  const updateData: Record<string, unknown> = {};
  
  if (updates.name !== undefined) {
    if (!updates.name || updates.name.trim().length === 0) {
      throw new Error('Team name cannot be empty');
    }
    if (updates.name.length > 200) {
      throw new Error('Team name must be 200 characters or less');
    }
    updateData.name = updates.name.trim();
  }
  
  if (updates.description !== undefined) {
    updateData.description = updates.description?.trim() || null;
  }
  
  if (updates.parentTeamId !== undefined) {
    if (updates.parentTeamId) {
      // Validate parent team exists
      const parentTeam = (await db.team.findUnique({
        where: { id: updates.parentTeamId },
        select: { id: true, tenantId: true },
      })) as { id: string; tenantId: string } | null;
      
      if (!parentTeam) {
        throw new Error('Parent team not found');
      }
      
      if (parentTeam.tenantId !== team.tenantId) {
        throw new Error('Parent team must belong to the same tenant');
      }
      
      // Prevent circular references
      if (updates.parentTeamId === teamId) {
        throw new Error('Team cannot be its own parent');
      }
      
      updateData.parentTeamId = updates.parentTeamId;
    } else {
      updateData.parentTeamId = null;
    }
  }
  
  // Update team
  const updated = (await db.team.update({
    where: { id: teamId },
    data: updateData,
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      },
    },
  })) as TeamResult;
  
  return updated;
}

/**
 * Delete team
 */
export async function deleteTeam(teamId: string, userId: string) {
  const db = getDb();
  
  // Get team
  const team = (await db.team.findUnique({
    where: { id: teamId },
    include: {
      projects: {
        select: { id: true },
      },
      subteams: {
        select: { id: true },
      },
    },
  })) as { id: string; createdById: string; projects: Array<{ id: string }>; subteams: Array<{ id: string }> } | null;
  
  if (!team) {
    throw new Error('Team not found');
  }
  
  // Check if user is team creator
  if (team.createdById !== userId) {
    throw new Error('Permission denied. Only team creator can delete teams.');
  }
  
  // Prevent deletion if team has projects
  if (team.projects.length > 0) {
    throw new Error('Cannot delete team with existing projects. Please delete or reassign projects first.');
  }
  
  // Prevent deletion if team has subteams
  if (team.subteams.length > 0) {
    throw new Error('Cannot delete team with subteams. Please delete or reassign subteams first.');
  }
  
  // Delete team
  await db.team.delete({
    where: { id: teamId },
  });
}

/**
 * Add member to team
 */
export async function addTeamMember(
  teamId: string,
  userId: string,
  memberUserId: string,
  role: string = 'Member'
) {
  const db = getDb();
  
  // Get team
  const team = (await db.team.findUnique({
    where: { id: teamId },
  })) as { id: string; createdById: string } | null;
  
  if (!team) {
    throw new Error('Team not found');
  }
  
  // Check if user is team creator or has permission
  if (team.createdById !== userId) {
    throw new Error('Permission denied. Only team creator can add members.');
  }
  
  // Check if member is already in team
  const existingMember = (await db.teamMember.findUnique({
    where: {
      teamId_userId: {
      teamId,
      userId: memberUserId,
    },
  },
  })) as { id: string } | null;
  
  if (existingMember) {
    throw new Error('User is already a member of this team');
  }
  
  // Create team membership
  const member = await db.teamMember.create({
    data: {
      teamId,
      userId: memberUserId,
      role,
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });
  
  return member;
}

/**
 * Remove member from team
 */
export async function removeTeamMember(
  teamId: string,
  userId: string,
  memberUserId: string
) {
  const db = getDb();
  
  // Get team
  const team = (await db.team.findUnique({
    where: { id: teamId },
  })) as { id: string; createdById: string } | null;
  
  if (!team) {
    throw new Error('Team not found');
  }
  
  // Check if user is team creator or has permission
  if (team.createdById !== userId) {
    throw new Error('Permission denied. Only team creator can remove members.');
  }
  
  // Prevent removing team creator
  if (memberUserId === team.createdById) {
    throw new Error('Cannot remove team creator from team');
  }
  
  // Remove team membership
  await db.teamMember.delete({
    where: {
      teamId_userId: {
        teamId,
        userId: memberUserId,
      },
    },
  });
}


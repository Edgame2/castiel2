/**
 * Team Service
 * 
 * Manages team CRUD operations and team membership.
 * Per ModuleImplementationGuide Section 6
 */

import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';

/**
 * Create a team
 */
export async function createTeam(
  organizationId: string,
  userId: string,
  name: string,
  description?: string,
  parentTeamId?: string
) {
  const db = getDatabaseClient();
  
  // Validate name
  if (!name || name.trim().length === 0) {
    throw new Error('Team name is required');
  }
  
  if (name.length > 200) {
    throw new Error('Team name must be 200 characters or less');
  }
  
  // Validate parent team if provided
  if (parentTeamId) {
    const parentTeam = await db.team.findUnique({
      where: { id: parentTeamId },
      select: { id: true, organizationId: true },
    });
    
    if (!parentTeam) {
      throw new Error('Parent team not found');
    }
    
    if (parentTeam.organizationId !== organizationId) {
      throw new Error('Parent team must belong to the same organization');
    }
  }
  
  // Check if user is a member of the organization
  const membership = await db.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: 'active',
    },
  });
  
  if (!membership) {
    throw new Error('You must be a member of the organization to create teams');
  }
  
  // Create team and automatically add creator as member
  const team = await db.team.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      parentTeamId: parentTeamId || null,
      organizationId,
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
  });
  
  return team;
}

/**
 * Get team by ID
 */
export async function getTeam(teamId: string, userId?: string) {
  const db = getDatabaseClient();
  
  const team = await db.team.findUnique({
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
  });
  
  if (!team) {
    return null;
  }
  
  // If userId provided, check membership
  if (userId) {
    const isMember = team.members.some(m => m.userId === userId);
    if (!isMember) {
      throw new Error('You are not a member of this team');
    }
  }
  
  return team;
}

/**
 * List teams for a user in an organization
 */
export async function listUserTeams(userId: string, organizationId?: string) {
  const db = getDatabaseClient();
  
  const where: any = {
    members: {
      some: {
        userId,
      },
    },
  };
  
  if (organizationId) {
    where.organizationId = organizationId;
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
  const db = getDatabaseClient();
  
  // Get team
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where: { userId },
      },
    },
  });
  
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
  const updateData: any = {};
  
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
      const parentTeam = await db.team.findUnique({
        where: { id: updates.parentTeamId },
        select: { id: true, organizationId: true },
      });
      
      if (!parentTeam) {
        throw new Error('Parent team not found');
      }
      
      if (parentTeam.organizationId !== team.organizationId) {
        throw new Error('Parent team must belong to the same organization');
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
  const updated = await db.team.update({
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
  });
  
  return updated;
}

/**
 * Delete team
 */
export async function deleteTeam(teamId: string, userId: string) {
  const db = getDatabaseClient();
  
  // Get team
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      projects: {
        select: { id: true },
      },
      subteams: {
        select: { id: true },
      },
    },
  });
  
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
  const db = getDatabaseClient();
  
  // Get team
  const team = await db.team.findUnique({
    where: { id: teamId },
  });
  
  if (!team) {
    throw new Error('Team not found');
  }
  
  // Check if user is team creator or has permission
  if (team.createdById !== userId) {
    throw new Error('Permission denied. Only team creator can add members.');
  }
  
  // Check if member is already in team
  const existingMember = await db.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: memberUserId,
      },
    },
  });
  
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
  const db = getDatabaseClient();
  
  // Get team
  const team = await db.team.findUnique({
    where: { id: teamId },
  });
  
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


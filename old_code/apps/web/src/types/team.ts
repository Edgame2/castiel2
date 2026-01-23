/**
 * Team Types
 * Type definitions for teams (matches API types)
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
  syncedAt?: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
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




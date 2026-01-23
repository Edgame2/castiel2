/**
 * Team Hooks
 * React Query hooks for team operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Team, CreateTeamInput, UpdateTeamInput, TeamFilters } from '@/types/team';

// ============================================================================
// Query Keys
// ============================================================================

export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (filters?: TeamFilters) => [...teamKeys.lists(), filters] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamKeys.details(), id] as const,
  members: (teamId: string) => [...teamKeys.all, 'members', teamId] as const,
  hierarchy: (teamId: string) => [...teamKeys.all, 'hierarchy', teamId] as const,
  userTeams: (userId: string) => [...teamKeys.all, 'user', userId] as const,
};

// ============================================================================
// Team Queries
// ============================================================================

/**
 * List teams
 */
export function useTeams(filters?: TeamFilters, enabled = true) {
  return useQuery({
    queryKey: teamKeys.list(filters),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (filters?.managerId) searchParams.set('managerId', filters.managerId);
      if (filters?.memberId) searchParams.set('memberId', filters.memberId);
      if (filters?.parentTeamId !== undefined) {
        searchParams.set('parentTeamId', filters.parentTeamId || 'null');
      }
      if (filters?.externalSource) searchParams.set('externalSource', filters.externalSource);
      if (filters?.syncEnabled !== undefined) {
        searchParams.set('syncEnabled', String(filters.syncEnabled));
      }
      if (filters?.isManuallyEdited !== undefined) {
        searchParams.set('isManuallyEdited', String(filters.isManuallyEdited));
      }

      const response = await apiClient.get<Team[]>(
        `/api/v1/teams?${searchParams.toString()}`
      );
      return response.data;
    },
    enabled,
  });
}

/**
 * Get single team
 */
export function useTeam(teamId: string, enabled = true) {
  return useQuery({
    queryKey: teamKeys.detail(teamId),
    queryFn: async () => {
      const response = await apiClient.get<Team>(`/api/v1/teams/${teamId}`);
      return response.data;
    },
    enabled: enabled && !!teamId,
  });
}

/**
 * Get team members
 */
export function useTeamMembers(teamId: string, enabled = true) {
  return useQuery({
    queryKey: teamKeys.members(teamId),
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/teams/${teamId}/members`);
      return response.data;
    },
    enabled: enabled && !!teamId,
  });
}

/**
 * Get team hierarchy
 */
export function useTeamHierarchy(teamId: string, enabled = true) {
  return useQuery({
    queryKey: teamKeys.hierarchy(teamId),
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/teams/${teamId}/hierarchy`);
      return response.data;
    },
    enabled: enabled && !!teamId,
  });
}

/**
 * Get teams for a user
 */
export function useUserTeams(userId: string, enabled = true) {
  return useQuery({
    queryKey: teamKeys.userTeams(userId),
    queryFn: async () => {
      const response = await apiClient.get<Team[]>(`/api/v1/users/${userId}/teams`);
      return response.data;
    },
    enabled: enabled && !!userId,
  });
}

// ============================================================================
// Team Mutations
// ============================================================================

/**
 * Create team
 */
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTeamInput) => {
      const response = await apiClient.post<Team>('/api/v1/teams', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
    },
  });
}

/**
 * Update team
 */
export function useUpdateTeam(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTeamInput) => {
      const response = await apiClient.put<Team>(`/api/v1/teams/${teamId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(teamId) });
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
    },
  });
}

/**
 * Delete team
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      await apiClient.delete(`/api/v1/teams/${teamId}`);
      return teamId;
    },
    onSuccess: (teamId) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
      queryClient.removeQueries({ queryKey: teamKeys.detail(teamId) });
    },
  });
}




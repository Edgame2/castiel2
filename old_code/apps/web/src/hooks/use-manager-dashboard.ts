/**
 * Manager Dashboard Hooks
 * React Query hooks for manager dashboard operations
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { ManagerDashboard, ManagerDashboardOptions } from '@/types/manager-dashboard';

// ============================================================================
// Query Keys
// ============================================================================

export const managerDashboardKeys = {
  all: ['manager-dashboard'] as const,
  dashboard: (managerId: string, options?: ManagerDashboardOptions) =>
    [...managerDashboardKeys.all, managerId, options] as const,
  teamOpportunities: (teamId: string) =>
    [...managerDashboardKeys.all, 'team-opportunities', teamId] as const,
  teamPerformance: (teamId: string) =>
    [...managerDashboardKeys.all, 'team-performance', teamId] as const,
};

// ============================================================================
// Manager Dashboard Queries
// ============================================================================

/**
 * Get manager dashboard data
 */
export function useManagerDashboard(
  managerId: string,
  options?: ManagerDashboardOptions,
  enabled = true
) {
  return useQuery({
    queryKey: managerDashboardKeys.dashboard(managerId, options),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (options?.view) searchParams.set('view', options.view);
      if (options?.teamId) searchParams.set('teamId', options.teamId);
      if (options?.includeAllTeams !== undefined) {
        searchParams.set('includeAllTeams', String(options.includeAllTeams));
      }
      if (options?.period?.startDate) {
        searchParams.set('startDate', options.period.startDate.toISOString());
      }
      if (options?.period?.endDate) {
        searchParams.set('endDate', options.period.endDate.toISOString());
      }

      const response = await apiClient.get<ManagerDashboard>(
        `/api/v1/manager/dashboard?${searchParams.toString()}`
      );
      return response.data;
    },
    enabled: enabled && !!managerId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Get opportunities for a specific team
 */
export function useTeamOpportunities(teamId: string, enabled = true) {
  return useQuery({
    queryKey: managerDashboardKeys.teamOpportunities(teamId),
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/v1/manager/teams/${teamId}/opportunities`
      );
      return response.data;
    },
    enabled: enabled && !!teamId,
  });
}

/**
 * Get performance metrics for a specific team
 */
export function useTeamPerformance(teamId: string, enabled = true) {
  return useQuery({
    queryKey: managerDashboardKeys.teamPerformance(teamId),
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/v1/manager/teams/${teamId}/performance`
      );
      return response.data;
    },
    enabled: enabled && !!teamId,
  });
}




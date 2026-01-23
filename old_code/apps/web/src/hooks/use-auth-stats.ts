/**
 * Auth Statistics Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authStatsApi } from '@/lib/api/auth-stats'
import { toast } from 'sonner'

// Query keys
export const authStatsKeys = {
  all: ['auth-stats'] as const,
  dashboard: (startDate?: string, endDate?: string) =>
    [...authStatsKeys.all, 'dashboard', startDate, endDate] as const,
  overview: () => [...authStatsKeys.all, 'overview'] as const,
  loginTrends: (days: number) => [...authStatsKeys.all, 'login-trends', days] as const,
  alerts: (limit: number) => [...authStatsKeys.all, 'alerts', limit] as const,
}

/**
 * Hook to fetch full dashboard data
 */
export function useAuthDashboard(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: authStatsKeys.dashboard(startDate, endDate),
    queryFn: () => authStatsApi.getDashboard(startDate, endDate),
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch overview statistics
 */
export function useAuthOverview() {
  return useQuery({
    queryKey: authStatsKeys.overview(),
    queryFn: () => authStatsApi.getOverview(),
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch login trends
 */
export function useLoginTrends(days: number = 30) {
  return useQuery({
    queryKey: authStatsKeys.loginTrends(days),
    queryFn: () => authStatsApi.getLoginTrends(days),
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch security alerts
 */
export function useSecurityAlerts(limit: number = 10) {
  return useQuery({
    queryKey: authStatsKeys.alerts(limit),
    queryFn: () => authStatsApi.getAlerts(limit),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  })
}

/**
 * Hook to dismiss a security alert
 */
export function useDismissAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (alertId: string) => authStatsApi.dismissAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authStatsKeys.all })
      toast.success('Alert dismissed')
    },
    onError: () => {
      toast.error('Failed to dismiss alert')
    },
  })
}


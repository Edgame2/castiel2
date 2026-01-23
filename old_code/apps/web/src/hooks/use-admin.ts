import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as adminApi from '@/lib/api/admin'

// Platform stats hook
export function usePlatformStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getPlatformStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Tenants list hook
export function useTenants(params?: {
  page?: number
  limit?: number
  search?: string
  status?: string
}) {
  return useQuery({
    queryKey: ['admin', 'tenants', params],
    queryFn: () => adminApi.getTenants(params),
  })
}

// Tenant details hook
export function useTenantById(tenantId: string) {
  return useQuery({
    queryKey: ['admin', 'tenants', tenantId],
    queryFn: () => adminApi.getTenantById(tenantId),
    enabled: !!tenantId,
  })
}

// Update tenant status mutation
export function useUpdateTenantStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tenantId, status }: { tenantId: string; status: 'active' | 'suspended' | 'trial' }) =>
      adminApi.updateTenantStatus(tenantId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants', variables.tenantId] })
      toast.success('Tenant status updated')
    },
    onError: () => {
      toast.error('Failed to update tenant status')
    },
  })
}

// System health hook
export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: adminApi.getSystemHealth,
    refetchInterval: 15000, // Refetch every 15 seconds
  })
}

// System logs hook
export function useSystemLogs(params?: {
  page?: number
  limit?: number
  level?: string
  service?: string
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: ['admin', 'logs', params],
    queryFn: () => adminApi.getSystemLogs(params),
  })
}

// Impersonate tenant mutation
export function useImpersonateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tenantId: string) => adminApi.impersonateTenant(tenantId),
    onSuccess: (data) => {
      // Store the impersonation token
      localStorage.setItem('impersonation_token', data.token)
      // Invalidate all queries to refetch with new context
      queryClient.invalidateQueries()
      toast.success('Now impersonating tenant')
    },
    onError: () => {
      toast.error('Failed to impersonate tenant')
    },
  })
}

// Stop impersonation mutation
export function useStopImpersonation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminApi.stopImpersonation,
    onSuccess: () => {
      // Remove the impersonation token
      localStorage.removeItem('impersonation_token')
      // Invalidate all queries to refetch with original context
      queryClient.invalidateQueries()
      toast.success('Stopped impersonating tenant')
    },
    onError: () => {
      toast.error('Failed to stop impersonation')
    },
  })
}

// Conversation system stats hook
export function useConversationSystemStats(params?: {
  fromDate?: string
  toDate?: string
}) {
  return useQuery({
    queryKey: ['admin', 'conversation-stats', params],
    queryFn: () => adminApi.getConversationSystemStats(params),
    refetchInterval: 60000, // Refetch every minute
  })
}

// Performance metrics hook
export function usePerformanceMetrics(params?: {
  tenantId?: string
  timeRange?: number
}) {
  return useQuery({
    queryKey: ['admin', 'performance', 'metrics', params],
    queryFn: () => adminApi.getPerformanceMetrics(params),
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// AI metrics hook
export function useAIMetrics(params?: {
  period?: 'hour' | 'day' | 'week' | 'month'
}) {
  return useQuery({
    queryKey: ['admin', 'performance', 'ai-metrics', params],
    queryFn: () => adminApi.getAIMetrics(params),
    refetchInterval: 60000, // Refetch every minute
  })
}

// Cache statistics hook
export function useCacheStats() {
  return useQuery({
    queryKey: ['admin', 'performance', 'cache-stats'],
    queryFn: adminApi.getCacheStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Cache health hook
export function useCacheHealth() {
  return useQuery({
    queryKey: ['admin', 'performance', 'cache-health'],
    queryFn: adminApi.getCacheHealth,
    refetchInterval: 60000, // Refetch every minute
  })
}

// Cache configuration hook
export function useCacheConfig() {
  return useQuery({
    queryKey: ['admin', 'performance', 'cache-config'],
    queryFn: adminApi.getCacheConfig,
    refetchInterval: 300000, // Refetch every 5 minutes (config changes infrequently)
  })
}

// Performance anomalies hook
export function usePerformanceAnomalies(params?: {
  tenantId?: string
  stdDevThreshold?: number
}) {
  return useQuery({
    queryKey: ['admin', 'performance', 'anomalies', params],
    queryFn: () => adminApi.getPerformanceAnomalies(params),
    refetchInterval: 60000, // Refetch every minute
  })
}

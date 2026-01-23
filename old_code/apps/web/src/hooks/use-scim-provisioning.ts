/**
 * SCIM Provisioning Hooks
 * React Query hooks for SCIM provisioning management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'
import {
  getSCIMConfig,
  enableSCIM,
  disableSCIM,
  rotateSCIMToken,
  testSCIMConnection,
  getSCIMActivityLogs,
  type SCIMConfigResponse,
  type SCIMActivityLogsResponse,
  type EnableSCIMResponse,
  type RotateTokenResponse,
  type TestConnectionResponse,
} from '@/lib/api/scim-provisioning'

// Query keys
export const scimProvisioningKeys = {
  all: ['scim-provisioning'] as const,
  config: (tenantId: string) => [...scimProvisioningKeys.all, 'config', tenantId] as const,
  logs: (tenantId: string, limit?: number) => [...scimProvisioningKeys.all, 'logs', tenantId, limit] as const,
}

/**
 * Hook to fetch SCIM configuration
 */
export function useSCIMConfig(tenantId: string) {
  return useQuery({
    queryKey: scimProvisioningKeys.config(tenantId),
    queryFn: () => getSCIMConfig(tenantId),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to enable SCIM
 */
export function useEnableSCIM() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tenantId: string) => enableSCIM(tenantId),
    onSuccess: (data, tenantId) => {
      queryClient.invalidateQueries({ queryKey: scimProvisioningKeys.config(tenantId) })
      toast.success('SCIM enabled successfully', {
        description: 'Save your token securely - it will not be shown again.',
      })
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to enable SCIM: ${message}`)
    },
  })
}

/**
 * Hook to disable SCIM
 */
export function useDisableSCIM() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tenantId: string) => disableSCIM(tenantId),
    onSuccess: (_, tenantId) => {
      queryClient.invalidateQueries({ queryKey: scimProvisioningKeys.config(tenantId) })
      toast.success('SCIM disabled successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to disable SCIM: ${message}`)
    },
  })
}

/**
 * Hook to rotate SCIM token
 */
export function useRotateSCIMToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tenantId: string) => rotateSCIMToken(tenantId),
    onSuccess: (data, tenantId) => {
      queryClient.invalidateQueries({ queryKey: scimProvisioningKeys.config(tenantId) })
      toast.success('Token rotated successfully', {
        description: 'Save your new token securely - it will not be shown again.',
      })
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to rotate token: ${message}`)
    },
  })
}

/**
 * Hook to test SCIM connection
 */
export function useTestSCIMConnection() {
  return useMutation({
    mutationFn: (tenantId: string) => testSCIMConnection(tenantId),
    onSuccess: () => {
      toast.success('SCIM connection test successful')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Connection test failed: ${message}`)
    },
  })
}

/**
 * Hook to fetch SCIM activity logs
 */
export function useSCIMActivityLogs(tenantId: string, limit?: number) {
  return useQuery({
    queryKey: scimProvisioningKeys.logs(tenantId, limit),
    queryFn: () => getSCIMActivityLogs(tenantId, limit),
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
  })
}


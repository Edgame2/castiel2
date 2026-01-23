/**
 * SSO Configuration Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ssoConfigApi } from '@/lib/api/sso-config'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'
import type { CreateSSOConfigRequest, UpdateSSOConfigRequest } from '@/types/sso-config'

// Query keys
export const ssoConfigKeys = {
  all: ['sso-config'] as const,
  config: () => [...ssoConfigKeys.all, 'config'] as const,
}

/**
 * Hook to fetch SSO configuration
 */
export function useSSOConfig() {
  return useQuery({
    queryKey: ssoConfigKeys.config(),
    queryFn: () => ssoConfigApi.getConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to create SSO configuration
 */
export function useCreateSSOConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSSOConfigRequest) => ssoConfigApi.createConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ssoConfigKeys.config() })
      toast.success('SSO configuration created successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to create SSO configuration: ${message}`)
    },
  })
}

/**
 * Hook to update SSO configuration
 */
export function useUpdateSSOConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateSSOConfigRequest) => ssoConfigApi.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ssoConfigKeys.config() })
      toast.success('SSO configuration updated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to update SSO configuration: ${message}`)
    },
  })
}

/**
 * Hook to delete SSO configuration
 */
export function useDeleteSSOConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => ssoConfigApi.deleteConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ssoConfigKeys.config() })
      toast.success('SSO configuration deleted')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to delete SSO configuration: ${message}`)
    },
  })
}

/**
 * Hook to activate SSO configuration
 */
export function useActivateSSOConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => ssoConfigApi.activateConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ssoConfigKeys.config() })
      toast.success('SSO activated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to activate SSO: ${message}`)
    },
  })
}

/**
 * Hook to deactivate SSO configuration
 */
export function useDeactivateSSOConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => ssoConfigApi.deactivateConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ssoConfigKeys.config() })
      toast.success('SSO deactivated')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to deactivate SSO: ${message}`)
    },
  })
}

/**
 * Hook to validate SSO configuration
 */
export function useValidateSSOConfig() {
  return useMutation({
    mutationFn: () => ssoConfigApi.validateConfig(),
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Validation failed: ${message}`)
    },
  })
}

/**
 * Hook to test SSO connection
 */
export function useTestSSOConnection() {
  return useMutation({
    mutationFn: () => ssoConfigApi.testConnection(),
    onSuccess: (data) => {
      // Open test URL in new window
      window.open(data.testUrl, '_blank', 'width=600,height=700')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to start test: ${message}`)
    },
  })
}


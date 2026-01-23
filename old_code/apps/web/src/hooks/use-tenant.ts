import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantApi } from '@/lib/api/tenant'
import { UpdateTenantDto, CreateApiKeyDto, UpdateSSOConfigDto } from '@/types/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'

// Query keys
export const tenantKeys = {
  all: ['tenant'] as const,
  detail: () => [...tenantKeys.all, 'detail'] as const,
  featureFlags: () => [...tenantKeys.all, 'feature-flags'] as const,
  apiKeys: () => [...tenantKeys.all, 'api-keys'] as const,
  usage: (period?: string) => [...tenantKeys.all, 'usage', period] as const,
  sso: () => [...tenantKeys.all, 'sso'] as const,
}

/**
 * Hook to fetch current tenant
 */
export function useTenant() {
  return useQuery({
    queryKey: tenantKeys.detail(),
    queryFn: () => tenantApi.getTenant(),
  })
}

/**
 * Hook to update tenant
 */
export function useUpdateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateTenantDto) => tenantApi.updateTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail() })
      toast.success('Organization updated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to fetch feature flags
 */
export function useFeatureFlags() {
  return useQuery({
    queryKey: tenantKeys.featureFlags(),
    queryFn: () => tenantApi.getFeatureFlags(),
  })
}

/**
 * Hook to toggle feature flag
 */
export function useToggleFeatureFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => tenantApi.toggleFeatureFlag(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.featureFlags() })
      toast.success(`Feature ${data.enabled ? 'enabled' : 'disabled'} successfully`)
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to fetch API keys
 */
export function useApiKeys() {
  return useQuery({
    queryKey: tenantKeys.apiKeys(),
    queryFn: () => tenantApi.getApiKeys(),
  })
}

/**
 * Hook to create API key
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateApiKeyDto) => tenantApi.createApiKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.apiKeys() })
      toast.success('API key created successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to delete API key
 */
export function useDeleteApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => tenantApi.deleteApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.apiKeys() })
      toast.success('API key deleted successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to fetch usage statistics
 */
export function useUsageStats(period?: string) {
  return useQuery({
    queryKey: tenantKeys.usage(period),
    queryFn: () => tenantApi.getUsageStats(period),
  })
}

/**
 * Hook to fetch SSO configuration
 */
export function useSSOConfig() {
  return useQuery({
    queryKey: tenantKeys.sso(),
    queryFn: () => tenantApi.getSSOConfig(),
  })
}

/**
 * Hook to update SSO configuration
 */
export function useUpdateSSOConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateSSOConfigDto) => tenantApi.updateSSOConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.sso() })
      toast.success('SSO configuration updated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

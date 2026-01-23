import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTenantMemberships, updateDefaultTenant, switchTenant } from '@/lib/api/auth-tenants'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'

export const tenantMembershipKeys = {
  all: ['auth', 'tenant-memberships'] as const,
}

export function useTenantMemberships() {
  return useQuery({
    queryKey: tenantMembershipKeys.all,
    queryFn: getTenantMemberships,
  })
}

export function useUpdateDefaultTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tenantId: string) => updateDefaultTenant(tenantId),
    onSuccess: (data) => {
      queryClient.setQueryData(tenantMembershipKeys.all, data)
      if (typeof window !== 'undefined' && data.defaultTenantId) {
        localStorage.setItem('tenantId', data.defaultTenantId)
      }
      toast.success('Default tenant updated')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update default tenant'
      toast.error(message)
    },
  })
}

export function useSwitchTenant() {
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()

  return useMutation({
    mutationFn: (tenantId: string) => switchTenant(tenantId),
    onSuccess: async (data) => {
      // Update localStorage with the new tenant
      if (typeof window !== 'undefined') {
        localStorage.setItem('tenantId', data.user.tenantId)
      }
      
      // Refresh user context to reflect new tenant
      await refreshUser()
      
      // Invalidate all queries since we're in a new tenant context
      queryClient.invalidateQueries()
      
      toast.success(`Switched to ${data.user.tenantName || data.user.tenantId}`)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to switch tenant'
      toast.error(message)
    },
  })
}

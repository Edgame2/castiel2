import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { membershipApi } from '@/lib/api/membership'
import { handleApiError } from '@/lib/api/client'
import type { TenantJoinRequestListResponse, TenantJoinRequestStatus } from '@/types/api'

interface JoinRequestMutationInput {
  requestId: string
  action: 'approve' | 'decline'
}

export function useJoinRequests(tenantId?: string, status?: TenantJoinRequestStatus) {
  return useQuery<TenantJoinRequestListResponse>({
    queryKey: ['joinRequests', tenantId, status],
    enabled: !!tenantId,
    queryFn: () => membershipApi.listJoinRequests(tenantId as string, status),
  })
}

export function useJoinRequestActions(tenantId?: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ requestId, action }: JoinRequestMutationInput) => {
      if (!tenantId) {
        return Promise.reject(new Error('Missing tenant context'))
      }
      return membershipApi.updateJoinRequest(tenantId, requestId, action)
    },
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'approve' ? 'Request approved' : 'Request declined')
      queryClient.invalidateQueries({ queryKey: ['joinRequests', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['membership', 'summary', tenantId] })
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })

  return {
    approve: (requestId: string) => mutation.mutate({ requestId, action: 'approve' }),
    decline: (requestId: string) => mutation.mutate({ requestId, action: 'decline' }),
    isPending: mutation.isPending,
  }
}

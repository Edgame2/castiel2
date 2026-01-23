import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invitationApi } from '@/lib/api/invitations'
import { membershipApi } from '@/lib/api/membership'
import { handleApiError } from '@/lib/api/client'
import { useAuth } from '@/contexts/auth-context'
import type { MembershipSummaryResponse } from '@/types/api'

type InvitationResponseMutationInput = {
  action: 'accept' | 'decline'
  body?: { userId?: string; tenantSwitchTargetId?: string }
}

export function useInvitationPreview(tenantId?: string, token?: string) {
  return useQuery({
    queryKey: ['invitation', 'preview', tenantId, token],
    enabled: !!tenantId && !!token,
    queryFn: () => invitationApi.preview(tenantId as string, token as string),
  })
}

export function useInvitationResponse(tenantId?: string, token?: string) {
  return useMutation({
    mutationFn: ({ action, body }: InvitationResponseMutationInput) => {
      if (!tenantId || !token) {
        return Promise.reject(new Error('Missing invitation context'))
      }
      return invitationApi.respond(tenantId, token, action, body)
    },
    onSuccess: (data, variables) => {
      toast.success(
        variables.action === 'accept'
          ? 'Invitation accepted successfully'
          : 'Invitation declined'
      )
      return data
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

export function useMembershipSummary() {
  const { user } = useAuth()

  return useQuery<MembershipSummaryResponse>({
    queryKey: ['membership', 'summary', user?.tenantId],
    enabled: !!user?.tenantId,
    queryFn: () => membershipApi.getSummary(user!.tenantId),
    staleTime: 60 * 1000,
  })
}

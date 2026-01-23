import apiClient from './client'
import type { InviteUserResponse, InvitationMembershipInfo, TenantInvitationPreview } from '@/types/api'

interface InvitationResponsePayload {
  success: boolean
  invitation: InviteUserResponse
  membership?: InvitationMembershipInfo
}

export const invitationApi = {
  preview: async (tenantId: string, token: string): Promise<TenantInvitationPreview> => {
    const { data } = await apiClient.get<TenantInvitationPreview>(
      `/api/tenants/${tenantId}/invitations/${token}`
    )
    return data
  },
  respond: async (
    tenantId: string,
    token: string,
    action: 'accept' | 'decline',
    body?: { userId?: string; tenantSwitchTargetId?: string }
  ): Promise<InvitationResponsePayload> => {
    const { data } = await apiClient.post<InvitationResponsePayload>(
      `/api/tenants/${tenantId}/invitations/${token}/${action}`,
      body
    )
    return data
  },
}

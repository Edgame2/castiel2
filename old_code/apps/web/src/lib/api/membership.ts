import apiClient from './client'
import type {
  MembershipSummaryResponse,
  TenantJoinRequestListResponse,
  TenantJoinRequestMutationResponse,
  TenantJoinRequestStatus,
} from '@/types/api'

export const membershipApi = {
  getSummary: async (tenantId: string): Promise<MembershipSummaryResponse> => {
    const { data } = await apiClient.get<MembershipSummaryResponse>(
      `/api/tenants/${tenantId}/membership/summary`
    )
    return data
  },
  listJoinRequests: async (
    tenantId: string,
    status?: TenantJoinRequestStatus
  ): Promise<TenantJoinRequestListResponse> => {
    const params = new URLSearchParams()
    if (status) {
      params.set('status', status)
    }

    const query = params.toString()
    const path = query
      ? `/api/tenants/${tenantId}/join-requests?${query}`
      : `/api/tenants/${tenantId}/join-requests`

    const { data } = await apiClient.get<TenantJoinRequestListResponse>(path)
    return data
  },
  updateJoinRequest: async (
    tenantId: string,
    requestId: string,
    action: 'approve' | 'decline'
  ): Promise<TenantJoinRequestMutationResponse> => {
    const { data } = await apiClient.post<TenantJoinRequestMutationResponse>(
      `/api/tenants/${tenantId}/join-requests/${requestId}/${action}`
    )
    return data
  },
}

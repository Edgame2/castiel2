import apiClient from './client'
import { ExternalUserId } from '@/types/api'

/**
 * Get tenant ID from local storage
 */
function getTenantId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('tenantId') || ''
}

export interface CreateExternalUserIdDto {
  integrationId: string
  externalUserId: string
  integrationName?: string
  connectionId?: string
  metadata?: Record<string, any>
  status?: 'active' | 'invalid' | 'pending'
}

export interface UpdateExternalUserIdDto {
  externalUserId?: string
  integrationName?: string
  connectionId?: string
  metadata?: Record<string, any>
  status?: 'active' | 'invalid' | 'pending'
}

export interface ExternalUserIdsResponse {
  externalUserIds: ExternalUserId[]
}

/**
 * External User IDs API client
 */
export const externalUserIdsApi = {
  /**
   * Get all external user IDs for a user
   */
  getUserExternalUserIds: async (userId: string): Promise<ExternalUserId[]> => {
    const tenantId = getTenantId()
    const response = await apiClient.get<ExternalUserIdsResponse>(
      `/api/tenants/${tenantId}/users/${userId}/external-user-ids`
    )
    return response.data.externalUserIds
  },

  /**
   * Create or update external user ID
   */
  createOrUpdateExternalUserId: async (
    userId: string,
    data: CreateExternalUserIdDto
  ): Promise<ExternalUserId> => {
    const tenantId = getTenantId()
    const response = await apiClient.post<ExternalUserId>(
      `/api/tenants/${tenantId}/users/${userId}/external-user-ids`,
      data
    )
    return response.data
  },

  /**
   * Update external user ID and metadata
   */
  updateExternalUserId: async (
    userId: string,
    integrationId: string,
    data: UpdateExternalUserIdDto
  ): Promise<ExternalUserId> => {
    const tenantId = getTenantId()
    const response = await apiClient.patch<ExternalUserId>(
      `/api/tenants/${tenantId}/users/${userId}/external-user-ids/${integrationId}`,
      data
    )
    return response.data
  },

  /**
   * Delete external user ID
   */
  deleteExternalUserId: async (userId: string, integrationId: string): Promise<void> => {
    const tenantId = getTenantId()
    await apiClient.delete(
      `/api/tenants/${tenantId}/users/${userId}/external-user-ids/${integrationId}`
    )
  },

  /**
   * Sync external user ID from integration
   */
  syncExternalUserId: async (userId: string, integrationId: string): Promise<ExternalUserId> => {
    const tenantId = getTenantId()
    const response = await apiClient.post<ExternalUserId>(
      `/api/tenants/${tenantId}/users/${userId}/external-user-ids/${integrationId}/sync`
    )
    return response.data
  },
}

export default externalUserIdsApi



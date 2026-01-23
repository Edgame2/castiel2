import apiClient from './client'
import {
  Tenant,
  UpdateTenantDto,
  FeatureFlag,
  ApiKey,
  CreateApiKeyDto,
  UsageStats,
  SSOConfig,
  UpdateSSOConfigDto,
} from '@/types/api'

// Tenant/Organization API endpoints
export const tenantApi = {
  /**
   * Get current tenant information
   */
  getTenant: async (): Promise<Tenant> => {
    const response = await apiClient.get<Tenant>('/tenant')
    return response.data
  },

  /**
   * Update current tenant
   */
  updateTenant: async (data: UpdateTenantDto): Promise<Tenant> => {
    const response = await apiClient.patch<Tenant>('/tenant', data)
    return response.data
  },

  /**
   * Get feature flags
   */
  getFeatureFlags: async (): Promise<FeatureFlag[]> => {
    const response = await apiClient.get<FeatureFlag[]>('/tenant/feature-flags')
    return response.data
  },

  /**
   * Toggle feature flag
   */
  toggleFeatureFlag: async (id: string): Promise<FeatureFlag> => {
    const response = await apiClient.post<FeatureFlag>(`/tenant/feature-flags/${id}/toggle`)
    return response.data
  },

  /**
   * Get API keys
   */
  getApiKeys: async (): Promise<ApiKey[]> => {
    const response = await apiClient.get<ApiKey[]>('/tenant/api-keys')
    return response.data
  },

  /**
   * Create API key
   */
  createApiKey: async (data: CreateApiKeyDto): Promise<ApiKey> => {
    const response = await apiClient.post<ApiKey>('/tenant/api-keys', data)
    return response.data
  },

  /**
   * Delete API key
   */
  deleteApiKey: async (id: string): Promise<void> => {
    await apiClient.delete(`/tenant/api-keys/${id}`)
  },

  /**
   * Get usage statistics
   */
  getUsageStats: async (period?: string): Promise<UsageStats> => {
    const response = await apiClient.get<UsageStats>('/tenant/usage', {
      params: { period },
    })
    return response.data
  },

  /**
   * Get SSO configuration
   */
  getSSOConfig: async (): Promise<SSOConfig> => {
    const response = await apiClient.get<SSOConfig>('/tenant/sso')
    return response.data
  },

  /**
   * Update SSO configuration
   */
  updateSSOConfig: async (data: UpdateSSOConfigDto): Promise<SSOConfig> => {
    const response = await apiClient.patch<SSOConfig>('/tenant/sso', data)
    return response.data
  },
}

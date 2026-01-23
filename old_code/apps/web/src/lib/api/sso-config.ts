/**
 * SSO Configuration API Client
 */

import apiClient from './client'
import type {
  SSOConfiguration,
  CreateSSOConfigRequest,
  UpdateSSOConfigRequest,
  SSOValidationResult,
} from '@/types/sso-config'

/**
 * SSO Config API
 */
export const ssoConfigApi = {
  /**
   * Get SSO configuration for the current tenant
   */
  async getConfig(): Promise<SSOConfiguration | null> {
    try {
      const response = await apiClient.get('/api/admin/sso/config' as any)
      return response.data.config
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  /**
   * Create SSO configuration
   */
  async createConfig(data: CreateSSOConfigRequest): Promise<SSOConfiguration> {
    const response = await apiClient.post('/api/admin/sso/config', data)
    return response.data.config
  },

  /**
   * Update SSO configuration
   */
  async updateConfig(data: UpdateSSOConfigRequest): Promise<SSOConfiguration> {
    const response = await apiClient.put('/api/admin/sso/config', data)
    return response.data.config
  },

  /**
   * Delete SSO configuration
   */
  async deleteConfig(): Promise<void> {
    await apiClient.delete('/api/admin/sso/config')
  },

  /**
   * Activate SSO configuration
   */
  async activateConfig(): Promise<SSOConfiguration> {
    const response = await apiClient.post('/api/admin/sso/config/activate' as any)
    return response.data.config
  },

  /**
   * Deactivate SSO configuration
   */
  async deactivateConfig(): Promise<SSOConfiguration> {
    const response = await apiClient.post('/api/admin/sso/config/deactivate' as any)
    return response.data.config
  },

  /**
   * Validate SSO configuration
   */
  async validateConfig(): Promise<SSOValidationResult> {
    const response = await apiClient.post('/api/admin/sso/config/validate' as any)
    return response.data
  },

  /**
   * Get SP metadata URL
   */
  getMetadataUrl(tenantId: string): string {
    return `${apiClient.defaults.baseURL}/auth/sso/${tenantId}/metadata`
  },

  /**
   * Test SSO connection (initiates test login)
   */
  async testConnection(): Promise<{ testUrl: string }> {
    const response = await apiClient.post('/api/admin/sso/config/test' as any)
    return response.data
  },
}

export default ssoConfigApi


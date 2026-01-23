import apiClient from './client'

// Redaction API types
export interface RedactionConfig {
  enabled: boolean
  fields: string[]
  redactionValue: string
  updatedAt: string
  updatedBy: string
}

export interface UpdateRedactionConfigRequest {
  fields: string[]
  redactionValue?: string
}

export interface RedactionConfigResponse {
  success: boolean
  message: string
}

// Redaction API endpoints
export const redactionApi = {
  /**
   * Get redaction configuration for current tenant
   */
  getConfig: async (): Promise<RedactionConfig> => {
    const response = await apiClient.get<RedactionConfig>('/api/v1/redaction/config')
    return response.data
  },

  /**
   * Configure redaction for current tenant
   */
  updateConfig: async (
    data: UpdateRedactionConfigRequest
  ): Promise<RedactionConfigResponse> => {
    const response = await apiClient.put<RedactionConfigResponse>(
      '/api/v1/redaction/config',
      data
    )
    return response.data
  },

  /**
   * Disable redaction for current tenant
   */
  deleteConfig: async (): Promise<RedactionConfigResponse> => {
    const response = await apiClient.delete<RedactionConfigResponse>(
      '/api/v1/redaction/config'
    )
    return response.data
  },
}

export default redactionApi







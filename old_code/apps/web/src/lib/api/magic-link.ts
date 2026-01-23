/**
 * Magic Link API Client
 * 
 * API methods for passwordless authentication via magic links
 */

import apiClient from './client'
import type {
  RequestMagicLinkRequest,
  RequestMagicLinkResponse,
  VerifyMagicLinkResponse,
} from '@/types/magic-link'

/**
 * Magic Link API
 */
export const magicLinkApi = {
  /**
   * Request a magic link for passwordless login
   */
  async requestMagicLink(data: RequestMagicLinkRequest): Promise<RequestMagicLinkResponse> {
    const response = await apiClient.post('/api/v1/auth/magic-link/request', data)
    return response.data
  },

  /**
   * Verify a magic link token and complete login
   */
  async verifyMagicLink(token: string): Promise<VerifyMagicLinkResponse> {
    const response = await apiClient.get(`/api/v1/auth/magic-link/verify/${token}`)
    return response.data
  },
}

export default magicLinkApi


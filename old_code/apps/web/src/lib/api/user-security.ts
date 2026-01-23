/**
 * User Security API Client
 */

import apiClient from './client'

/**
 * User security status
 */
export interface UserSecurityStatus {
  userId: string;
  email: string;
  status: string;
  mfaEnabled: boolean;
  mfaMethods: string[];
  activeSessions: number;
  lastLogin?: string;
  failedLoginAttempts: number;
  lockedAt?: string;
  lockReason?: string;
  mustChangePassword: boolean;
  passwordLastChanged?: string;
  createdAt: string;
}

/**
 * User Security API
 */
export const userSecurityApi = {
  /**
   * Get user security status
   */
  async getStatus(userId: string): Promise<UserSecurityStatus> {
    const response = await apiClient.get(`/api/admin/users/${userId}/security`)
    return response.data
  },

  /**
   * Force password reset for a user
   */
  async forcePasswordReset(userId: string, sendEmail: boolean = true): Promise<{ success: boolean; resetToken?: string }> {
    const response = await apiClient.post(`/api/admin/users/${userId}/force-password-reset`, { sendEmail })
    return response.data
  },

  /**
   * Revoke all sessions for a user
   */
  async revokeSessions(userId: string): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/api/admin/users/${userId}/revoke-sessions`)
    return response.data
  },

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string, method?: string): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/api/admin/users/${userId}/disable-mfa`, { method })
    return response.data
  },

  /**
   * Lock user account
   */
  async lockAccount(userId: string, reason?: string): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/api/admin/users/${userId}/lock`, { reason })
    return response.data
  },

  /**
   * Unlock user account
   */
  async unlockAccount(userId: string): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/api/admin/users/${userId}/unlock`)
    return response.data
  },
}

export default userSecurityApi


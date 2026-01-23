/**
 * MFA Audit API Client
 */

import apiClient from './client'
import type { MFAAuditQueryParams, MFAAuditResponse, MFAAuditStats } from '@/types/mfa-audit'

/**
 * MFA Audit API
 */
export const mfaAuditApi = {
  /**
   * Get MFA audit logs
   */
  async getLogs(params?: MFAAuditQueryParams): Promise<MFAAuditResponse> {
    const response = await apiClient.get('/api/admin/mfa/audit', { params })
    return response.data
  },

  /**
   * Get MFA audit statistics
   */
  async getStats(startDate?: string, endDate?: string): Promise<MFAAuditStats> {
    const response = await apiClient.get('/api/admin/mfa/stats', {
      params: { startDate, endDate },
    })
    return response.data
  },

  /**
   * Export MFA audit logs to CSV
   */
  async exportLogs(params?: MFAAuditQueryParams): Promise<Blob> {
    const response = await apiClient.get('/api/admin/mfa/audit/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  },
}

export default mfaAuditApi

/**
 * Auth Statistics API Client
 */

import apiClient from './client'
import type { AuthDashboardData, AuthOverviewStats, LoginTrend, SecurityAlert } from '@/types/auth-stats'

/**
 * Auth Stats API
 */
export const authStatsApi = {
  /**
   * Get full dashboard data
   */
  async getDashboard(startDate?: string, endDate?: string): Promise<AuthDashboardData> {
    const response = await apiClient.get('/api/admin/auth/dashboard', {
      params: { startDate, endDate },
    })
    return response.data
  },

  /**
   * Get overview statistics
   */
  async getOverview(): Promise<AuthOverviewStats> {
    const response = await apiClient.get('/api/admin/auth/overview' as any)
    return response.data
  },

  /**
   * Get login trends
   */
  async getLoginTrends(days: number = 30): Promise<LoginTrend[]> {
    const response = await apiClient.get('/api/admin/auth/login-trends', {
      params: { days },
    })
    return response.data.trends
  },

  /**
   * Get recent security alerts
   */
  async getAlerts(limit: number = 10): Promise<SecurityAlert[]> {
    const response = await apiClient.get('/api/admin/auth/alerts', {
      params: { limit },
    })
    return response.data.alerts
  },

  /**
   * Dismiss a security alert
   */
  async dismissAlert(alertId: string): Promise<void> {
    await apiClient.post(`/api/admin/auth/alerts/${alertId}/dismiss`)
  },
}

export default authStatsApi


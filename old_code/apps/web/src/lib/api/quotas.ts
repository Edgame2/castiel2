/**
 * Quotas API Client
 * API client for quota management and performance tracking
 */

import apiClient from './client';
import type {
  Quota,
  CreateQuotaInput,
  UpdateQuotaInput,
  QuotaPerformance,
  QuotaForecast,
} from '@/types/quota';

/**
 * Quotas API endpoints
 */
export const quotasApi = {
  /**
   * Create a new quota
   */
  createQuota: async (data: CreateQuotaInput): Promise<Quota> => {
    const response = await apiClient.post<Quota>('/api/v1/quotas', data);
    return response.data;
  },

  /**
   * Get quota by ID
   */
  getQuota: async (quotaId: string): Promise<Quota> => {
    const response = await apiClient.get<Quota>(`/api/v1/quotas/${quotaId}`);
    return response.data;
  },

  /**
   * Update quota
   */
  updateQuota: async (quotaId: string, data: UpdateQuotaInput): Promise<Quota> => {
    const response = await apiClient.put<Quota>(`/api/v1/quotas/${quotaId}`, data);
    return response.data;
  },

  /**
   * List quotas
   */
  listQuotas: async (params?: {
    quotaType?: 'individual' | 'team' | 'tenant';
    targetUserId?: string;
    teamId?: string;
    periodType?: 'monthly' | 'quarterly' | 'yearly';
  }): Promise<Quota[]> => {
    const response = await apiClient.get<Quota[]>('/api/v1/quotas', { params });
    return response.data;
  },

  /**
   * Calculate quota performance
   */
  calculatePerformance: async (quotaId: string): Promise<QuotaPerformance> => {
    const response = await apiClient.post<QuotaPerformance>(
      `/api/v1/quotas/${quotaId}/calculate-performance`
    );
    return response.data;
  },

  /**
   * Get quota forecast
   */
  getForecast: async (quotaId: string): Promise<QuotaForecast> => {
    const response = await apiClient.get<QuotaForecast>(`/api/v1/quotas/${quotaId}/forecast`);
    return response.data;
  },

  /**
   * Rollup quota from children
   */
  rollupQuota: async (quotaId: string): Promise<Quota> => {
    const response = await apiClient.post<Quota>(`/api/v1/quotas/${quotaId}/rollup`);
    return response.data;
  },

  /**
   * Delete quota
   */
  deleteQuota: async (quotaId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/quotas/${quotaId}`);
  },
};


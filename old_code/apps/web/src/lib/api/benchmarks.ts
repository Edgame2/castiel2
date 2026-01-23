/**
 * Benchmarks API Client
 * API client for benchmarking win rates, closing times, deal sizes, and renewals
 */

import apiClient from './client';
import type {
  WinRateBenchmark,
  ClosingTimeBenchmark,
  DealSizeBenchmark,
  RenewalEstimate,
} from '@/types/quota';

/**
 * Benchmarks API endpoints
 */
export const benchmarksApi = {
  /**
   * Calculate win rates
   */
  calculateWinRates: async (params?: {
    industryId?: string;
    startDate?: Date;
    endDate?: Date;
    scope?: 'tenant' | 'industry' | 'peer';
  }): Promise<WinRateBenchmark> => {
    const queryParams: any = {};
    if (params?.industryId) queryParams.industryId = params.industryId;
    if (params?.startDate) queryParams.startDate = params.startDate.toISOString();
    if (params?.endDate) queryParams.endDate = params.endDate.toISOString();
    if (params?.scope) queryParams.scope = params.scope;

    const response = await apiClient.get<WinRateBenchmark>('/api/v1/benchmarks/win-rates', {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Calculate closing times
   */
  calculateClosingTimes: async (params?: {
    industryId?: string;
    startDate?: Date;
    endDate?: Date;
    scope?: 'tenant' | 'industry' | 'peer';
  }): Promise<ClosingTimeBenchmark> => {
    const queryParams: any = {};
    if (params?.industryId) queryParams.industryId = params.industryId;
    if (params?.startDate) queryParams.startDate = params.startDate.toISOString();
    if (params?.endDate) queryParams.endDate = params.endDate.toISOString();
    if (params?.scope) queryParams.scope = params.scope;

    const response = await apiClient.get<ClosingTimeBenchmark>('/api/v1/benchmarks/closing-times', {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Calculate deal size distribution
   */
  calculateDealSizeDistribution: async (params?: {
    industryId?: string;
    startDate?: Date;
    endDate?: Date;
    scope?: 'tenant' | 'industry' | 'peer';
  }): Promise<DealSizeBenchmark> => {
    const queryParams: any = {};
    if (params?.industryId) queryParams.industryId = params.industryId;
    if (params?.startDate) queryParams.startDate = params.startDate.toISOString();
    if (params?.endDate) queryParams.endDate = params.endDate.toISOString();
    if (params?.scope) queryParams.scope = params.scope;

    const response = await apiClient.get<DealSizeBenchmark>('/api/v1/benchmarks/deal-sizes', {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Estimate renewal probability for contract
   */
  estimateRenewal: async (contractId: string): Promise<RenewalEstimate> => {
    const response = await apiClient.get<RenewalEstimate>(
      `/api/v1/benchmarks/renewals/${contractId}`
    );
    return response.data;
  },
};



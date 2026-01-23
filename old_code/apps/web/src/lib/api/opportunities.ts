/**
 * Opportunity API Client
 * API client for opportunity management, pipeline, and forecasting
 */

import apiClient from './client';
import type { Shard } from '@/types/api';

export interface OpportunityFilters {
  ownerId?: string;
  stage?: string | string[];
  status?: 'open' | 'won' | 'lost' | ('open' | 'won' | 'lost')[];
  accountId?: string;
  riskLevel?: 'high' | 'medium' | 'low' | ('high' | 'medium' | 'low')[];
  riskCategory?: string | string[];
  riskScoreMin?: number;
  riskScoreMax?: number;
  revenueAtRiskMin?: number;
  closeDateFrom?: string;
  closeDateTo?: string;
  searchQuery?: string;
}

export interface OpportunityListResult {
  opportunities: Shard[];
  total: number;
  continuationToken?: string;
  hasMore: boolean;
}

export interface OpportunityWithRelated {
  opportunity: Shard;
  relatedShards: {
    account?: Shard;
    contact?: Shard;
    documents: Shard[];
    tasks: Shard[];
    notes: Shard[];
    meetings: Shard[];
    calls: Shard[];
  };
  riskEvaluation?: any;
}

export interface PipelineView {
  viewType: 'all' | 'active' | 'stage' | 'kanban';
  opportunities: Shard[];
  stages?: {
    stage: string;
    opportunities: Shard[];
    totalValue: number;
    totalExpectedRevenue: number;
    count: number;
  }[];
  summary: {
    totalValue: number;
    totalExpectedRevenue: number;
    totalRevenueAtRisk: number;
    riskAdjustedValue: number;
    opportunityCount: number;
  };
}

export interface PipelineMetrics {
  userId: string;
  totalPipelineValue: number;
  totalExpectedRevenue: number;
  totalRevenueAtRisk: number;
  riskAdjustedValue: number;
  opportunityCount: number;
  currency: string;
  calculatedAt: string;
}

export type ForecastPeriod = 'month' | 'quarter' | 'year' | 'custom';

export interface RevenueForecast {
  period: ForecastPeriod;
  range: {
    startDate: string;
    endDate: string;
  };
  scenarios: Array<{
    name: 'best' | 'base' | 'risk-adjusted' | 'worst-case';
    revenue: number;
    opportunityCount: number;
    currency: string;
  }>;
  byPeriod: Array<{
    period: string;
    best: number;
    base: number;
    riskAdjusted: number;
    worstCase: number;
    opportunityCount: number;
  }>;
  calculatedAt: string;
}

/**
 * Opportunity API endpoints
 */
export const opportunityApi = {
  /**
   * List opportunities owned by user
   */
  listOpportunities: async (
    filters?: OpportunityFilters,
    options?: {
      limit?: number;
      continuationToken?: string;
      includeRisk?: boolean;
    }
  ): Promise<OpportunityListResult> => {
    const params: any = {
      ...filters,
      ...options,
    };

    // Convert arrays to query params
    if (filters?.stage && Array.isArray(filters.stage)) {
      params.stage = filters.stage;
    }
    if (filters?.status && Array.isArray(filters.status)) {
      params.status = filters.status;
    }
    if (filters?.riskLevel && Array.isArray(filters.riskLevel)) {
      params.riskLevel = filters.riskLevel;
    }

    const response = await apiClient.get<{ success: boolean; data: OpportunityListResult }>(
      '/api/v1/opportunities',
      { params }
    );
    return response.data.data;
  },

  /**
   * Get opportunity details with related shards
   */
  getOpportunity: async (
    opportunityId: string,
    includeRelated: boolean = true
  ): Promise<OpportunityWithRelated> => {
    const response = await apiClient.get<{ success: boolean; data: OpportunityWithRelated }>(
      `/api/v1/opportunities/${opportunityId}`,
      {
        params: { includeRelated },
      }
    );
    return response.data.data;
  },

  /**
   * Get opportunities by account
   */
  getOpportunitiesByAccount: async (
    accountId: string,
    options?: {
      limit?: number;
      includeClosed?: boolean;
    }
  ): Promise<Shard[]> => {
    const response = await apiClient.get<{ success: boolean; data: { opportunities: Shard[] } }>(
      `/api/v1/opportunities/account/${accountId}`,
      { params: options }
    );
    return response.data.data.opportunities;
  },

  /**
   * Update opportunity stage
   */
  updateStage: async (opportunityId: string, stage: string): Promise<Shard> => {
    const response = await apiClient.patch<{ success: boolean; data: Shard }>(
      `/api/v1/opportunities/${opportunityId}/stage`,
      { stage }
    );
    return response.data.data;
  },
};

/**
 * Pipeline API endpoints
 */
export const pipelineApi = {
  /**
   * Get pipeline view
   */
  getPipelineView: async (
    viewType: 'all' | 'active' | 'stage' | 'kanban' = 'all',
    filters?: {
      includeClosed?: boolean;
      stage?: string | string[];
      accountId?: string;
      riskLevel?: 'high' | 'medium' | 'low' | ('high' | 'medium' | 'low')[];
    }
  ): Promise<PipelineView> => {
    const response = await apiClient.get<{ success: boolean; data: PipelineView }>(
      '/api/v1/pipeline',
      {
        params: { viewType, ...filters },
      }
    );
    return response.data.data;
  },

  /**
   * Get pipeline metrics
   */
  getMetrics: async (options?: {
    includeClosed?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<PipelineMetrics> => {
    const response = await apiClient.get<{ success: boolean; data: PipelineMetrics }>(
      '/api/v1/pipeline/metrics',
      { params: options }
    );
    return response.data.data;
  },

  /**
   * Get closed won/lost metrics
   */
  getClosedWonLost: async (period: {
    startDate: string;
    endDate: string;
  }): Promise<any> => {
    const response = await apiClient.get<{ success: boolean; data: any }>(
      '/api/v1/pipeline/closed-won-lost',
      { params: period }
    );
    return response.data.data;
  },

  /**
   * Organize pipeline by risk level
   */
  getRiskOrganization: async (): Promise<any> => {
    const response = await apiClient.get<{ success: boolean; data: any }>(
      '/api/v1/pipeline/risk-organization'
    );
    return response.data.data;
  },

  /**
   * Get opportunity recommendations
   */
  getRecommendations: async (opportunityId: string): Promise<any[]> => {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(
      `/api/v1/pipeline/opportunities/${opportunityId}/recommendations`
    );
    return response.data.data;
  },

  /**
   * Get pipeline summary
   */
  getSummary: async (): Promise<any> => {
    const response = await apiClient.get<{ success: boolean; data: any }>(
      '/api/v1/pipeline/summary'
    );
    return response.data.data;
  },

  /**
   * Generate revenue forecast
   */
  getForecast: async (
    period: 'month' | 'quarter' | 'year' | 'custom' = 'month',
    range?: {
      startDate: string;
      endDate: string;
    }
  ): Promise<RevenueForecast> => {
    const response = await apiClient.get<{ success: boolean; data: RevenueForecast }>(
      '/api/v1/pipeline/forecast',
      {
        params: { period, ...range },
      }
    );
    return response.data.data;
  },
};


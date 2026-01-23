/**
 * Risk Analysis API Client
 * API client for risk evaluation, catalog management, revenue at risk, and early warnings
 */

import apiClient from './client';
import type {
  RiskCatalog,
  RiskEvaluation,
  HistoricalPattern,
  RevenueAtRisk,
  PortfolioRevenueAtRisk,
  TeamRevenueAtRisk,
  TenantRevenueAtRisk,
  EarlyWarningSignal,
  ScoreBreakdownResponse,
} from '@/types/risk-analysis';

/**
 * Risk Analysis API endpoints
 */
export const riskAnalysisApi = {
  /**
   * Get risk catalog
   */
  getCatalog: async (params?: {
    industryId?: string;
  }): Promise<RiskCatalog[]> => {
    const response = await apiClient.get<RiskCatalog[]>('/api/v1/risk-analysis/catalog', { params });
    return response.data;
  },

  /**
   * Create custom risk
   */
  createCustomRisk: async (data: {
    catalogType?: 'global' | 'industry' | 'tenant';
    industryId?: string;
    riskId: string;
    name: string;
    description: string;
    category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';
    defaultPonderation: number;
    sourceShardTypes?: string[];
    detectionRules?: any;
    explainabilityTemplate?: string;
  }): Promise<RiskCatalog> => {
    const response = await apiClient.post<RiskCatalog>('/api/v1/risk-analysis/catalog', data);
    return response.data;
  },

  /**
   * Update risk
   */
  updateRisk: async (
    riskId: string,
    data: {
      name?: string;
      description?: string;
      defaultPonderation?: number;
      detectionRules?: any;
      isActive?: boolean;
    }
  ): Promise<RiskCatalog> => {
    const response = await apiClient.put<RiskCatalog>(`/api/v1/risk-analysis/catalog/${riskId}`, data);
    return response.data;
  },

  /**
   * Delete risk (tenant-specific only)
   */
  deleteRisk: async (riskId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/risk-analysis/catalog/${riskId}`);
  },

  /**
   * Duplicate global or industry risk to tenant-specific
   */
  duplicateRisk: async (
    riskId: string,
    catalogType: 'global' | 'industry',
    options?: {
      industryId?: string;
      newRiskId?: string;
    }
  ): Promise<RiskCatalog> => {
    const response = await apiClient.post<RiskCatalog>(
      `/api/v1/risk-analysis/catalog/${riskId}/duplicate`,
      {},
      {
        params: {
          catalogType,
          ...options,
        },
      }
    );
    return response.data;
  },

  /**
   * Enable or disable a global/industry risk for tenant
   */
  setRiskEnabled: async (
    riskId: string,
    catalogType: 'global' | 'industry',
    enabled: boolean,
    options?: {
      industryId?: string;
    }
  ): Promise<void> => {
    await apiClient.post(
      `/api/v1/risk-analysis/catalog/${riskId}/enable`,
      { enabled },
      {
        params: {
          catalogType,
          ...options,
        },
      }
    );
  },

  /**
   * Evaluate opportunity risks
   */
  evaluateOpportunity: async (
    opportunityId: string,
    options?: {
      forceRefresh?: boolean;
      includeHistorical?: boolean;
      includeAI?: boolean;
    }
  ): Promise<RiskEvaluation> => {
    const response = await apiClient.post<RiskEvaluation>(
      `/api/v1/risk-analysis/opportunities/${opportunityId}/evaluate`,
      options || {}
    );
    return response.data;
  },

  /**
   * Get historical patterns for opportunity
   */
  getHistoricalPatterns: async (opportunityId: string): Promise<HistoricalPattern[]> => {
    const response = await apiClient.get<HistoricalPattern[]>(
      `/api/v1/risk-analysis/opportunities/${opportunityId}/historical-patterns`
    );
    return response.data;
  },

  /**
   * Calculate revenue at risk for opportunity
   */
  calculateRevenueAtRisk: async (opportunityId: string): Promise<RevenueAtRisk> => {
    const response = await apiClient.get<RevenueAtRisk>(
      `/api/v1/risk-analysis/opportunities/${opportunityId}/revenue-at-risk`
    );
    return response.data;
  },

  /**
   * Calculate revenue at risk for user portfolio
   */
  calculatePortfolioRevenueAtRisk: async (userId: string): Promise<PortfolioRevenueAtRisk> => {
    const response = await apiClient.get<PortfolioRevenueAtRisk>(
      `/api/v1/risk-analysis/portfolio/${userId}/revenue-at-risk`
    );
    return response.data;
  },

  /**
   * Calculate revenue at risk for team
   */
  calculateTeamRevenueAtRisk: async (teamId: string): Promise<TeamRevenueAtRisk> => {
    const response = await apiClient.get<TeamRevenueAtRisk>(
      `/api/v1/risk-analysis/teams/${teamId}/revenue-at-risk`
    );
    return response.data;
  },

  /**
   * Calculate revenue at risk for tenant
   */
  calculateTenantRevenueAtRisk: async (): Promise<TenantRevenueAtRisk> => {
    const response = await apiClient.get<TenantRevenueAtRisk>(
      '/api/v1/risk-analysis/tenant/revenue-at-risk'
    );
    return response.data;
  },

  /**
   * Detect early warning signals for opportunity
   */
  detectEarlyWarnings: async (opportunityId: string): Promise<EarlyWarningSignal[]> => {
    const response = await apiClient.post<EarlyWarningSignal[]>(
      `/api/v1/risk-analysis/opportunities/${opportunityId}/early-warnings`
    );
    return response.data;
  },

  /**
   * Get score calculation breakdown for opportunity
   * Phase 2.2: Risk Score Transparency
   */
  getScoreBreakdown: async (opportunityId: string): Promise<ScoreBreakdownResponse> => {
    const response = await apiClient.get<ScoreBreakdownResponse>(
      `/api/v1/risk-analysis/opportunities/${opportunityId}/score-breakdown`
    );
    return response.data;
  },
};


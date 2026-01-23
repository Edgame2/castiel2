/**
 * Risk Analysis Hooks
 * React Query hooks for risk analysis data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { riskAnalysisApi } from '@/lib/api/risk-analysis';
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
 * Query keys for risk analysis
 */
export const riskAnalysisKeys = {
  all: ['risk-analysis'] as const,
  catalog: (industryId?: string) => [...riskAnalysisKeys.all, 'catalog', industryId] as const,
  evaluation: (opportunityId: string) => [...riskAnalysisKeys.all, 'evaluation', opportunityId] as const,
  historicalPatterns: (opportunityId: string) => [...riskAnalysisKeys.all, 'historical-patterns', opportunityId] as const,
  revenueAtRisk: (opportunityId: string) => [...riskAnalysisKeys.all, 'revenue-at-risk', opportunityId] as const,
  portfolioRevenueAtRisk: (userId: string) => [...riskAnalysisKeys.all, 'portfolio-revenue-at-risk', userId] as const,
  teamRevenueAtRisk: (teamId: string) => [...riskAnalysisKeys.all, 'team-revenue-at-risk', teamId] as const,
  tenantRevenueAtRisk: () => [...riskAnalysisKeys.all, 'tenant-revenue-at-risk'] as const,
  earlyWarnings: (opportunityId: string) => [...riskAnalysisKeys.all, 'early-warnings', opportunityId] as const,
  scoreBreakdown: (opportunityId: string) => [...riskAnalysisKeys.all, 'score-breakdown', opportunityId] as const,
};

/**
 * Hook to fetch risk catalog
 */
export function useRiskCatalog(industryId?: string) {
  return useQuery({
    queryKey: riskAnalysisKeys.catalog(industryId),
    queryFn: () => riskAnalysisApi.getCatalog({ industryId }),
    staleTime: 60 * 60 * 1000, // 1 hour - catalogs change infrequently
  });
}

/**
 * Hook to evaluate opportunity risks
 */
export function useRiskEvaluation(
  opportunityId: string,
  options?: {
    forceRefresh?: boolean;
    includeHistorical?: boolean;
    includeAI?: boolean;
  },
  queryOptions?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...riskAnalysisKeys.evaluation(opportunityId), options],
    queryFn: () => riskAnalysisApi.evaluateOpportunity(opportunityId, options),
    enabled: queryOptions?.enabled !== false && !!opportunityId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook to get historical patterns
 */
export function useHistoricalPatterns(opportunityId: string, enabled = true) {
  return useQuery({
    queryKey: riskAnalysisKeys.historicalPatterns(opportunityId),
    queryFn: () => riskAnalysisApi.getHistoricalPatterns(opportunityId),
    enabled: enabled && !!opportunityId,
  });
}

/**
 * Hook to calculate revenue at risk for opportunity
 */
export function useRevenueAtRisk(opportunityId: string, enabled = true) {
  return useQuery({
    queryKey: riskAnalysisKeys.revenueAtRisk(opportunityId),
    queryFn: () => riskAnalysisApi.calculateRevenueAtRisk(opportunityId),
    enabled: enabled && !!opportunityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to calculate revenue at risk for portfolio
 */
export function usePortfolioRevenueAtRisk(userId: string, enabled = true) {
  return useQuery({
    queryKey: riskAnalysisKeys.portfolioRevenueAtRisk(userId),
    queryFn: () => riskAnalysisApi.calculatePortfolioRevenueAtRisk(userId),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to calculate revenue at risk for team
 */
export function useTeamRevenueAtRisk(teamId: string, enabled = true) {
  return useQuery({
    queryKey: riskAnalysisKeys.teamRevenueAtRisk(teamId),
    queryFn: () => riskAnalysisApi.calculateTeamRevenueAtRisk(teamId),
    enabled: enabled && !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to calculate revenue at risk for tenant
 */
export function useTenantRevenueAtRisk(enabled = true) {
  return useQuery({
    queryKey: riskAnalysisKeys.tenantRevenueAtRisk(),
    queryFn: () => riskAnalysisApi.calculateTenantRevenueAtRisk(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to detect early warning signals
 */
export function useEarlyWarnings(opportunityId: string, enabled = true) {
  return useQuery({
    queryKey: riskAnalysisKeys.earlyWarnings(opportunityId),
    queryFn: () => riskAnalysisApi.detectEarlyWarnings(opportunityId),
    enabled: enabled && !!opportunityId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Mutation to create custom risk
 */
export function useCreateCustomRisk() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: riskAnalysisApi.createCustomRisk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riskAnalysisKeys.all });
    },
  });
}

/**
 * Mutation to update risk
 */
export function useUpdateRisk() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ riskId, data }: { riskId: string; data: any }) =>
      riskAnalysisApi.updateRisk(riskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riskAnalysisKeys.all });
    },
  });
}

/**
 * Mutation to delete risk
 */
export function useDeleteRisk() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (riskId: string) => riskAnalysisApi.deleteRisk(riskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riskAnalysisKeys.all });
    },
  });
}

/**
 * Mutation to duplicate risk
 */
export function useDuplicateRisk() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      riskId,
      catalogType,
      options,
    }: {
      riskId: string;
      catalogType: 'global' | 'industry';
      options?: { industryId?: string; newRiskId?: string };
    }) => riskAnalysisApi.duplicateRisk(riskId, catalogType, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riskAnalysisKeys.all });
    },
  });
}

/**
 * Mutation to enable/disable risk for tenant
 */
export function useSetRiskEnabled() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      riskId,
      catalogType,
      enabled,
      options,
    }: {
      riskId: string;
      catalogType: 'global' | 'industry';
      enabled: boolean;
      options?: { industryId?: string };
    }) => riskAnalysisApi.setRiskEnabled(riskId, catalogType, enabled, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riskAnalysisKeys.all });
    },
  });
}

/**
 * Mutation to evaluate opportunity (with refresh)
 */
export function useEvaluateOpportunity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      opportunityId,
      options,
    }: {
      opportunityId: string;
      options?: { forceRefresh?: boolean; includeHistorical?: boolean; includeAI?: boolean };
    }) => riskAnalysisApi.evaluateOpportunity(opportunityId, options),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: riskAnalysisKeys.evaluation(variables.opportunityId),
      });
      queryClient.invalidateQueries({
        queryKey: riskAnalysisKeys.revenueAtRisk(variables.opportunityId),
      });
    },
  });
}

/**
 * Mutation to detect early warnings
 */
export function useDetectEarlyWarnings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (opportunityId: string) => riskAnalysisApi.detectEarlyWarnings(opportunityId),
    onSuccess: (_, opportunityId) => {
      queryClient.invalidateQueries({
        queryKey: riskAnalysisKeys.earlyWarnings(opportunityId),
      });
    },
  });
}

/**
 * Hook to get score calculation breakdown
 * Phase 2.2: Risk Score Transparency
 */
export function useScoreBreakdown(opportunityId: string, enabled = true) {
  return useQuery({
    queryKey: riskAnalysisKeys.scoreBreakdown(opportunityId),
    queryFn: () => riskAnalysisApi.getScoreBreakdown(opportunityId),
    enabled: enabled && !!opportunityId,
    staleTime: 15 * 60 * 1000, // 15 minutes - same as evaluation
  });
}
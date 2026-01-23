/**
 * Opportunities React Hooks
 * React Query hooks for opportunity management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  opportunityApi,
  pipelineApi,
  type OpportunityFilters,
  type OpportunityListResult,
  type OpportunityWithRelated,
  type PipelineView,
  type PipelineMetrics,
  type RevenueForecast,
} from '@/lib/api/opportunities';
import type { ForecastPeriod } from '@/lib/api/opportunities';

// ============================================
// Query Keys
// ============================================

export const opportunityKeys = {
  all: ['opportunities'] as const,
  lists: () => [...opportunityKeys.all, 'list'] as const,
  list: (filters?: OpportunityFilters) => [...opportunityKeys.lists(), filters] as const,
  details: () => [...opportunityKeys.all, 'detail'] as const,
  detail: (id: string) => [...opportunityKeys.details(), id] as const,
  byAccount: (accountId: string) => [...opportunityKeys.all, 'account', accountId] as const,
};

export const pipelineKeys = {
  all: ['pipeline'] as const,
  view: (viewType?: string, filters?: any) => [...pipelineKeys.all, 'view', viewType, filters] as const,
  metrics: (filters?: any) => [...pipelineKeys.all, 'metrics', filters] as const,
  summary: () => [...pipelineKeys.all, 'summary'] as const,
  closedWonLost: (period: { startDate: string; endDate: string }) =>
    [...pipelineKeys.all, 'closed-won-lost', period] as const,
  riskOrganization: () => [...pipelineKeys.all, 'risk-organization'] as const,
  recommendations: (opportunityId: string) => [...pipelineKeys.all, 'recommendations', opportunityId] as const,
  forecast: (period: ForecastPeriod, range?: any) => [...pipelineKeys.all, 'forecast', period, range] as const,
};

// ============================================
// Opportunity Query Hooks
// ============================================

/**
 * Hook to list opportunities
 */
export function useOpportunities(
  filters?: OpportunityFilters,
  options?: {
    limit?: number;
    continuationToken?: string;
    includeRisk?: boolean;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: opportunityKeys.list(filters),
    queryFn: () => opportunityApi.listOpportunities(filters, options),
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook to get a single opportunity
 */
export function useOpportunity(opportunityId: string, includeRelated: boolean = true, enabled: boolean = true) {
  return useQuery({
    queryKey: opportunityKeys.detail(opportunityId),
    queryFn: () => opportunityApi.getOpportunity(opportunityId, includeRelated),
    enabled: enabled && !!opportunityId,
  });
}

/**
 * Hook to get opportunities by account
 */
export function useOpportunitiesByAccount(
  accountId: string,
  options?: {
    limit?: number;
    includeClosed?: boolean;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: opportunityKeys.byAccount(accountId),
    queryFn: () => opportunityApi.getOpportunitiesByAccount(accountId, options),
    enabled: (options?.enabled !== false) && !!accountId,
  });
}

/**
 * Hook to update opportunity stage
 */
export function useUpdateOpportunityStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId, stage }: { opportunityId: string; stage: string }) =>
      opportunityApi.updateStage(opportunityId, stage),
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: opportunityKeys.detail(variables.opportunityId) });
      queryClient.invalidateQueries({ queryKey: opportunityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all });
      toast.success('Opportunity stage updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update opportunity stage');
    },
  });
}

// ============================================
// Pipeline Query Hooks
// ============================================

/**
 * Hook to get pipeline view
 */
export function usePipelineView(
  viewType: 'all' | 'active' | 'stage' | 'kanban' = 'all',
  filters?: {
    includeClosed?: boolean;
    stage?: string | string[];
    accountId?: string;
    riskLevel?: 'high' | 'medium' | 'low' | ('high' | 'medium' | 'low')[];
  },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: pipelineKeys.view(viewType, filters),
    queryFn: () => pipelineApi.getPipelineView(viewType, filters),
    enabled,
  });
}

/**
 * Hook to get pipeline metrics
 */
export function usePipelineMetrics(
  options?: {
    includeClosed?: boolean;
    startDate?: string;
    endDate?: string;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: pipelineKeys.metrics(options),
    queryFn: () => pipelineApi.getMetrics(options),
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook to get pipeline summary
 */
export function usePipelineSummary(enabled: boolean = true) {
  return useQuery({
    queryKey: pipelineKeys.summary(),
    queryFn: () => pipelineApi.getSummary(),
    enabled,
  });
}

/**
 * Hook to get closed won/lost metrics
 */
export function useClosedWonLost(
  period: { startDate: string; endDate: string },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: pipelineKeys.closedWonLost(period),
    queryFn: () => pipelineApi.getClosedWonLost(period),
    enabled: enabled && !!period.startDate && !!period.endDate,
  });
}

/**
 * Hook to get risk organization
 */
export function useRiskOrganization(enabled: boolean = true) {
  return useQuery({
    queryKey: pipelineKeys.riskOrganization(),
    queryFn: () => pipelineApi.getRiskOrganization(),
    enabled,
  });
}

/**
 * Hook to get opportunity recommendations
 */
export function useOpportunityRecommendations(opportunityId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: pipelineKeys.recommendations(opportunityId),
    queryFn: () => pipelineApi.getRecommendations(opportunityId),
    enabled: enabled && !!opportunityId,
  });
}

/**
 * Hook to get revenue forecast
 */
export function useRevenueForecast(
  period: ForecastPeriod = 'month',
  range?: {
    startDate: string;
    endDate: string;
  },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: pipelineKeys.forecast(period, range),
    queryFn: () => pipelineApi.getForecast(period, range),
    enabled,
  });
}




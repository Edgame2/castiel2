/**
 * Quotas Hooks
 * React Query hooks for quota management and performance tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotasApi } from '@/lib/api/quotas';
import type {
  Quota,
  CreateQuotaInput,
  UpdateQuotaInput,
  QuotaPerformance,
  QuotaForecast,
} from '@/types/quota';

/**
 * Query keys for quotas
 */
export const quotaKeys = {
  all: ['quotas'] as const,
  list: (filters?: any) => [...quotaKeys.all, 'list', filters] as const,
  detail: (quotaId: string) => [...quotaKeys.all, 'detail', quotaId] as const,
  performance: (quotaId: string) => [...quotaKeys.all, 'performance', quotaId] as const,
  forecast: (quotaId: string) => [...quotaKeys.all, 'forecast', quotaId] as const,
};

/**
 * Hook to list quotas
 */
export function useQuotas(filters?: {
  quotaType?: 'individual' | 'team' | 'tenant';
  targetUserId?: string;
  teamId?: string;
  periodType?: 'monthly' | 'quarterly' | 'yearly';
}) {
  return useQuery({
    queryKey: quotaKeys.list(filters),
    queryFn: () => quotasApi.listQuotas(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get quota by ID
 */
export function useQuota(quotaId: string, enabled = true) {
  return useQuery({
    queryKey: quotaKeys.detail(quotaId),
    queryFn: () => quotasApi.getQuota(quotaId),
    enabled: enabled && !!quotaId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get quota performance
 */
export function useQuotaPerformance(quotaId: string, enabled = true) {
  return useQuery({
    queryKey: quotaKeys.performance(quotaId),
    queryFn: () => quotasApi.calculatePerformance(quotaId),
    enabled: enabled && !!quotaId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get quota forecast
 */
export function useQuotaForecast(quotaId: string, enabled = true) {
  return useQuery({
    queryKey: quotaKeys.forecast(quotaId),
    queryFn: () => quotasApi.getForecast(quotaId),
    enabled: enabled && !!quotaId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation to create quota
 */
export function useCreateQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuotaInput) => quotasApi.createQuota(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotaKeys.all });
    },
  });
}

/**
 * Mutation to update quota
 */
export function useUpdateQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quotaId, data }: { quotaId: string; data: UpdateQuotaInput }) =>
      quotasApi.updateQuota(quotaId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: quotaKeys.all });
      queryClient.invalidateQueries({ queryKey: quotaKeys.detail(variables.quotaId) });
    },
  });
}

/**
 * Mutation to calculate performance
 */
export function useCalculatePerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotaId: string) => quotasApi.calculatePerformance(quotaId),
    onSuccess: (_, quotaId) => {
      queryClient.invalidateQueries({ queryKey: quotaKeys.performance(quotaId) });
      queryClient.invalidateQueries({ queryKey: quotaKeys.detail(quotaId) });
    },
  });
}

/**
 * Mutation to rollup quota
 */
export function useRollupQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotaId: string) => quotasApi.rollupQuota(quotaId),
    onSuccess: (_, quotaId) => {
      queryClient.invalidateQueries({ queryKey: quotaKeys.detail(quotaId) });
      queryClient.invalidateQueries({ queryKey: quotaKeys.all });
    },
  });
}

/**
 * Mutation to delete quota
 */
export function useDeleteQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotaId: string) => quotasApi.deleteQuota(quotaId),
    onSuccess: (_, quotaId) => {
      queryClient.invalidateQueries({ queryKey: quotaKeys.all });
      queryClient.removeQueries({ queryKey: quotaKeys.detail(quotaId) });
    },
  });
}


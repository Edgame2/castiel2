/**
 * Benchmarks Hooks
 * React Query hooks for benchmarking data
 */

import { useQuery } from '@tanstack/react-query';
import { benchmarksApi } from '@/lib/api/benchmarks';
import type {
  WinRateBenchmark,
  ClosingTimeBenchmark,
  DealSizeBenchmark,
  RenewalEstimate,
} from '@/types/quota';

/**
 * Query keys for benchmarks
 */
export const benchmarkKeys = {
  all: ['benchmarks'] as const,
  winRates: (params?: any) => [...benchmarkKeys.all, 'win-rates', params] as const,
  closingTimes: (params?: any) => [...benchmarkKeys.all, 'closing-times', params] as const,
  dealSizes: (params?: any) => [...benchmarkKeys.all, 'deal-sizes', params] as const,
  renewal: (contractId: string) => [...benchmarkKeys.all, 'renewal', contractId] as const,
};

/**
 * Hook to calculate win rates
 */
export function useWinRates(params?: {
  industryId?: string;
  startDate?: Date;
  endDate?: Date;
  scope?: 'tenant' | 'industry' | 'peer';
}) {
  return useQuery({
    queryKey: benchmarkKeys.winRates(params),
    queryFn: () => benchmarksApi.calculateWinRates(params),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to calculate closing times
 */
export function useClosingTimes(params?: {
  industryId?: string;
  startDate?: Date;
  endDate?: Date;
  scope?: 'tenant' | 'industry' | 'peer';
}) {
  return useQuery({
    queryKey: benchmarkKeys.closingTimes(params),
    queryFn: () => benchmarksApi.calculateClosingTimes(params),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to calculate deal size distribution
 */
export function useDealSizeDistribution(params?: {
  industryId?: string;
  startDate?: Date;
  endDate?: Date;
  scope?: 'tenant' | 'industry' | 'peer';
}) {
  return useQuery({
    queryKey: benchmarkKeys.dealSizes(params),
    queryFn: () => benchmarksApi.calculateDealSizeDistribution(params),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to estimate renewal probability
 */
export function useRenewalEstimate(contractId: string, enabled = true) {
  return useQuery({
    queryKey: benchmarkKeys.renewal(contractId),
    queryFn: () => benchmarksApi.estimateRenewal(contractId),
    enabled: enabled && !!contractId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}



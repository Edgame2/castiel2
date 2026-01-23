import { useQuery } from '@tanstack/react-query'
import {
  phase2MetricsApi,
  MetricsQueryParams,
  AggregatedMetricsParams,
  MetricType,
  MetricPeriod,
} from '@/lib/api/phase2-metrics'

// Query keys
export const phase2MetricsKeys = {
  all: ['phase2-metrics'] as const,
  list: (params: MetricsQueryParams) =>
    [...phase2MetricsKeys.all, 'list', params] as const,
  aggregated: (params: AggregatedMetricsParams) =>
    [...phase2MetricsKeys.all, 'aggregated', params] as const,
}

/**
 * Hook to query metrics for a time period
 */
export function usePhase2Metrics(
  params: MetricsQueryParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: phase2MetricsKeys.list(params),
    queryFn: () => phase2MetricsApi.getMetrics(params),
    enabled: options?.enabled !== false && !!params.startDate && !!params.endDate,
  })
}

/**
 * Hook to get aggregated metrics (P50, P95, P99) for a time period
 */
export function useAggregatedMetrics(
  params: AggregatedMetricsParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: phase2MetricsKeys.aggregated(params),
    queryFn: () => phase2MetricsApi.getAggregatedMetrics(params),
    enabled:
      options?.enabled !== false &&
      !!params.startDate &&
      !!params.endDate &&
      !!params.metricType,
  })
}

// Re-export types for convenience
export type { MetricType, MetricPeriod, MetricsQueryParams, AggregatedMetricsParams } from '@/lib/api/phase2-metrics'







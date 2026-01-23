import apiClient from './client'

// Phase 2 Metrics API types
export type MetricType =
  | 'ingestion_lag'
  | 'change_miss_rate'
  | 'vector_hit_ratio'
  | 'insight_confidence_drift'

export type MetricPeriod = 'minute' | 'hour' | 'day'

export interface Phase2Metric {
  id: string
  metricType: MetricType
  value: number
  timestamp: string
  period: MetricPeriod
  metadata?: {
    unit?: string
    [key: string]: unknown
  }
  createdAt: string
}

export interface Phase2MetricsResponse {
  metrics: Phase2Metric[]
  count: number
}

export interface AggregatedMetricsResponse {
  metricType: MetricType
  p50: number
  p95: number
  p99: number
  mean: number
  min: number
  max: number
  count: number
}

export interface MetricsQueryParams {
  metricType?: MetricType
  startDate: string
  endDate: string
  period?: MetricPeriod
  limit?: number
}

export interface AggregatedMetricsParams {
  metricType: MetricType
  startDate: string
  endDate: string
}

// Phase 2 Metrics API endpoints
export const phase2MetricsApi = {
  /**
   * Query metrics for a time period
   */
  getMetrics: async (params: MetricsQueryParams): Promise<Phase2MetricsResponse> => {
    const response = await apiClient.get<Phase2MetricsResponse>('/api/v1/metrics', {
      params,
    })
    return response.data
  },

  /**
   * Get aggregated metrics (P50, P95, P99) for a time period
   */
  getAggregatedMetrics: async (
    params: AggregatedMetricsParams
  ): Promise<AggregatedMetricsResponse> => {
    const response = await apiClient.get<AggregatedMetricsResponse>(
      '/api/v1/metrics/aggregated',
      { params }
    )
    return response.data
  },
}

export default phase2MetricsApi







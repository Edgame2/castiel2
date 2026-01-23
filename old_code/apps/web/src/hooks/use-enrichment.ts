import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as enrichmentApi from '@/lib/api/enrichment'

// Enrichment jobs list hook
export function useEnrichmentJobs(params?: {
  page?: number
  limit?: number
  status?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['enrichment', 'jobs', params],
    queryFn: () => enrichmentApi.getEnrichmentJobs(params),
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  })
}

// Single enrichment job hook
export function useEnrichmentJob(jobId: string) {
  return useQuery({
    queryKey: ['enrichment', 'jobs', jobId],
    queryFn: () => enrichmentApi.getEnrichmentJob(jobId),
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Stop refetching if job is completed, failed, or cancelled
      const data = query.state.data
      if (data?.status && ['completed', 'failed', 'cancelled'].includes(data.status)) {
        return false
      }
      return 3000 // Refetch every 3 seconds for active jobs
    },
  })
}

// Enrichment stats hook
export function useEnrichmentStats() {
  return useQuery({
    queryKey: ['enrichment', 'stats'],
    queryFn: enrichmentApi.getEnrichmentStats,
    refetchInterval: 10000, // Refetch every 10 seconds
  })
}

// Retry job mutation
export function useRetryEnrichmentJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) => enrichmentApi.retryEnrichmentJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['enrichment', 'jobs'] })
      queryClient.invalidateQueries({ queryKey: ['enrichment', 'jobs', jobId] })
      queryClient.invalidateQueries({ queryKey: ['enrichment', 'stats'] })
      toast.success('Job queued for retry')
    },
    onError: () => {
      toast.error('Failed to retry job')
    },
  })
}

// Cancel job mutation
export function useCancelEnrichmentJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) => enrichmentApi.cancelEnrichmentJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['enrichment', 'jobs'] })
      queryClient.invalidateQueries({ queryKey: ['enrichment', 'jobs', jobId] })
      queryClient.invalidateQueries({ queryKey: ['enrichment', 'stats'] })
      toast.success('Job cancelled')
    },
    onError: () => {
      toast.error('Failed to cancel job')
    },
  })
}

// Job logs hook
export function useEnrichmentJobLogs(
  jobId: string,
  params?: {
    page?: number
    limit?: number
    level?: string
  }
) {
  return useQuery({
    queryKey: ['enrichment', 'jobs', jobId, 'logs', params],
    queryFn: () => enrichmentApi.getEnrichmentJobLogs(jobId, params),
    enabled: !!jobId,
    refetchInterval: 5000, // Refetch every 5 seconds
  })
}

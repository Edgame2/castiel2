/**
 * React Query hooks for embedding jobs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listEmbeddingJobs,
  getEmbeddingJob,
  getEmbeddingJobStats,
  type EmbeddingJob,
  type EmbeddingJobListParams,
  type EmbeddingJobStats,
} from '@/lib/api/embedding-jobs'

/**
 * Hook to list embedding jobs
 */
export function useEmbeddingJobs(
  params?: EmbeddingJobListParams,
  options?: { refetchInterval?: number | false; enabled?: boolean }
) {
  // Determine if we should auto-refresh (if there are active jobs)
  const shouldRefetch = params?.status === 'processing' || params?.status === 'pending' || !params?.status

  return useQuery({
    queryKey: ['embedding-jobs', params],
    queryFn: () => listEmbeddingJobs(params),
    refetchInterval: options?.refetchInterval !== undefined 
      ? options.refetchInterval 
      : shouldRefetch 
        ? 5000 // Auto-refresh every 5 seconds for active jobs
        : false,
    enabled: options?.enabled !== false,
  })
}

/**
 * Hook to get a single embedding job
 */
export function useEmbeddingJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['embedding-job', jobId],
    queryFn: () => getEmbeddingJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Auto-refresh if job is still pending or processing
      const data = query.state.data
      if (data?.status === 'pending' || data?.status === 'processing') {
        return 5000
      }
      return false
    },
  })
}

/**
 * Hook to get embedding job statistics
 */
export function useEmbeddingJobStats() {
  return useQuery({
    queryKey: ['embedding-job-stats'],
    queryFn: () => getEmbeddingJobStats(),
    refetchInterval: 10000, // Refresh every 10 seconds
  })
}


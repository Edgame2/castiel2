import { apiClient } from './client'
import type {
  EnrichmentJob,
  EnrichmentStats,
  EnrichmentLogEntry,
  PaginatedResponse,
} from '@/types/api'

// Get enrichment jobs list
export async function getEnrichmentJobs(params?: {
  page?: number
  limit?: number
  status?: string
  search?: string
}): Promise<PaginatedResponse<EnrichmentJob>> {
  const response = await apiClient.get('/enrichment/jobs', { params })
  return response.data
}

// Get single enrichment job
export async function getEnrichmentJob(jobId: string): Promise<EnrichmentJob> {
  const response = await apiClient.get(`/enrichment/jobs/${jobId}`)
  return response.data
}

// Get enrichment stats
export async function getEnrichmentStats(): Promise<EnrichmentStats> {
  const response = await apiClient.get('/enrichment/stats' as any)
  return response.data
}

// Retry failed job
export async function retryEnrichmentJob(jobId: string): Promise<EnrichmentJob> {
  const response = await apiClient.post(`/enrichment/jobs/${jobId}/retry`)
  return response.data
}

// Cancel job
export async function cancelEnrichmentJob(jobId: string): Promise<EnrichmentJob> {
  const response = await apiClient.post(`/enrichment/jobs/${jobId}/cancel`)
  return response.data
}

// Get job logs
export async function getEnrichmentJobLogs(
  jobId: string,
  params?: {
    page?: number
    limit?: number
    level?: string
  }
): Promise<PaginatedResponse<EnrichmentLogEntry>> {
  const response = await apiClient.get(`/enrichment/jobs/${jobId}/logs`, { params })
  return response.data
}

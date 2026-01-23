/**
 * Embedding Jobs API Client
 * Frontend API client for embedding job management
 */

import { apiClient } from './client'

export interface EmbeddingJob {
  id: string
  tenantId: string
  shardId: string
  shardTypeId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retryCount: number
  error?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  metadata?: {
    embeddingModel?: string
    vectorCount?: number
    processingTimeMs?: number
  }
}

export interface EmbeddingJobListParams {
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  limit?: number
  offset?: number
  shardId?: string
  shardTypeId?: string
}

export interface EmbeddingJobListResponse {
  jobs: EmbeddingJob[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface EmbeddingJobStats {
  pending: number
  processing: number
  completed: number
  failed: number
}

/**
 * List embedding jobs
 */
export async function listEmbeddingJobs(
  params?: EmbeddingJobListParams
): Promise<EmbeddingJobListResponse> {
  const response = await apiClient.get<EmbeddingJobListResponse>('/api/v1/embedding-jobs', {
    params,
  })
  return response.data
}

/**
 * Get embedding job by ID
 */
export async function getEmbeddingJob(jobId: string): Promise<EmbeddingJob> {
  const response = await apiClient.get<EmbeddingJob>(`/api/v1/embedding-jobs/${jobId}`)
  return response.data
}

/**
 * Get embedding job statistics
 */
export async function getEmbeddingJobStats(): Promise<EmbeddingJobStats> {
  const response = await apiClient.get<EmbeddingJobStats>('/api/v1/embedding-jobs/stats')
  return response.data
}







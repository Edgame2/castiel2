/**
 * Embedding Management API Client
 * Handles embedding generation, status, validation, and history
 */

import apiClient from './client'

export interface EmbeddingStatus {
  hasEmbeddings: boolean
  vectorCount: number
  latestVectorDate?: string
  oldestVectorDate?: string
  isRecent: boolean
  model?: string
  dimensions?: number
}

export interface EmbeddingHistoryItem {
  jobId: string
  status: string
  createdAt: string
  completedAt?: string
  error?: string
  retryCount: number
}

export interface EmbeddingValidationResult {
  isValid: boolean
  issues: string[]
  metrics: {
    vectorCount: number
    dimensions: number | null
    isNormalized: boolean
    hasValidModel: boolean
    averageMagnitude: number | null
  }
}

export interface EmbeddingGenerationResult {
  success: boolean
  shardId: string
  vectorsGenerated: number
  templateUsed: string
  processingTimeMs: number
}

export const embeddingsApi = {
  /**
   * Get embedding status for a shard
   */
  async getStatus(shardId: string): Promise<EmbeddingStatus> {
    const { data } = await apiClient.get<EmbeddingStatus>(
      `/api/v1/shards/${encodeURIComponent(shardId)}/embeddings/status`
    )
    return data
  },

  /**
   * Get embedding generation history for a shard
   */
  async getHistory(shardId: string, limit: number = 20): Promise<EmbeddingHistoryItem[]> {
    const { data } = await apiClient.get<EmbeddingHistoryItem[]>(
      `/api/v1/shards/${encodeURIComponent(shardId)}/embeddings/history`,
      { params: { limit } }
    )
    return data
  },

  /**
   * Validate embedding quality for a shard
   */
  async validate(shardId: string): Promise<EmbeddingValidationResult> {
    const { data } = await apiClient.post<EmbeddingValidationResult>(
      `/api/v1/shards/${encodeURIComponent(shardId)}/embeddings/validate`
    )
    return data
  },

  /**
   * Generate embeddings for a shard
   */
  async generate(shardId: string, force: boolean = false): Promise<EmbeddingGenerationResult> {
    const { data } = await apiClient.post<EmbeddingGenerationResult>(
      `/api/v1/shards/${encodeURIComponent(shardId)}/embeddings/generate`,
      { force }
    )
    return data
  },

  /**
   * Regenerate embeddings for a shard (force)
   */
  async regenerate(shardId: string): Promise<EmbeddingGenerationResult> {
    const { data } = await apiClient.post<EmbeddingGenerationResult>(
      `/api/v1/shards/${encodeURIComponent(shardId)}/embeddings/regenerate`
    )
    return data
  },

  /**
   * Batch generate embeddings for multiple shards
   */
  async batchGenerate(shardIds: string[], force: boolean = false): Promise<{
    success: boolean
    message: string
    shardCount: number
  }> {
    const { data } = await apiClient.post<{
      success: boolean
      message: string
      shardCount: number
    }>(
      '/api/v1/shards/embeddings/batch',
      { shardIds, force }
    )
    return data
  },
}


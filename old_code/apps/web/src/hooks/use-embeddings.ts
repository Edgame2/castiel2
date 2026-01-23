/**
 * React Query hooks for embedding management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { embeddingsApi, type EmbeddingStatus, type EmbeddingHistoryItem, type EmbeddingValidationResult, type EmbeddingGenerationResult } from '@/lib/api/embeddings'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'

export const embeddingKeys = {
  all: ['embeddings'] as const,
  status: (shardId: string) => [...embeddingKeys.all, 'status', shardId] as const,
  history: (shardId: string) => [...embeddingKeys.all, 'history', shardId] as const,
  validation: (shardId: string) => [...embeddingKeys.all, 'validation', shardId] as const,
}

/**
 * Get embedding status for a shard
 */
export function useEmbeddingStatus(shardId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: embeddingKeys.status(shardId),
    queryFn: () => embeddingsApi.getStatus(shardId),
    enabled: options?.enabled !== false && !!shardId,
  })
}

/**
 * Get embedding generation history for a shard
 */
export function useEmbeddingHistory(shardId: string, limit: number = 20, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: embeddingKeys.history(shardId),
    queryFn: () => embeddingsApi.getHistory(shardId, limit),
    enabled: options?.enabled !== false && !!shardId,
  })
}

/**
 * Validate embedding quality for a shard
 */
export function useValidateEmbedding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (shardId: string) => embeddingsApi.validate(shardId),
    onSuccess: (data, shardId) => {
      if (data.isValid) {
        toast.success('Embeddings are valid')
      } else {
        toast.warning(`Embedding validation found ${data.issues.length} issue(s)`)
      }
      queryClient.setQueryData(embeddingKeys.validation(shardId), data)
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to validate embeddings: ${message}`)
    },
  })
}

/**
 * Generate embeddings for a shard
 */
export function useGenerateEmbedding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ shardId, force }: { shardId: string; force?: boolean }) =>
      embeddingsApi.generate(shardId, force),
    onSuccess: (data, variables) => {
      toast.success(`Generated ${data.vectorsGenerated} embedding(s)`)
      queryClient.invalidateQueries({ queryKey: embeddingKeys.status(variables.shardId) })
      queryClient.invalidateQueries({ queryKey: embeddingKeys.history(variables.shardId) })
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to generate embeddings: ${message}`)
    },
  })
}

/**
 * Regenerate embeddings for a shard
 */
export function useRegenerateEmbedding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (shardId: string) => embeddingsApi.regenerate(shardId),
    onSuccess: (data, shardId) => {
      toast.success(`Regenerated ${data.vectorsGenerated} embedding(s)`)
      queryClient.invalidateQueries({ queryKey: embeddingKeys.status(shardId) })
      queryClient.invalidateQueries({ queryKey: embeddingKeys.history(shardId) })
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to regenerate embeddings: ${message}`)
    },
  })
}

/**
 * Batch generate embeddings for multiple shards
 */
export function useBatchGenerateEmbeddings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ shardIds, force }: { shardIds: string[]; force?: boolean }) =>
      embeddingsApi.batchGenerate(shardIds, force),
    onSuccess: (data, variables) => {
      toast.success(`Started batch generation for ${data.shardCount} shard(s)`)
      // Invalidate status for all shards
      variables.shardIds.forEach(shardId => {
        queryClient.invalidateQueries({ queryKey: embeddingKeys.status(shardId) })
      })
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to start batch generation: ${message}`)
    },
  })
}


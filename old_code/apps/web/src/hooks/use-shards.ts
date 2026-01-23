import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedQuery } from './use-authenticated-query'
import { shardApi, shardTypeApi } from '@/lib/api/shards'
import { CreateShardDto, UpdateShardDto, ShardType } from '@/types/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'

// Query keys
export const shardKeys = {
  all: ['shards'] as const,
  lists: () => [...shardKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...shardKeys.lists(), params] as const,
  details: () => [...shardKeys.all, 'detail'] as const,
  detail: (id: string) => [...shardKeys.details(), id] as const,
}

/**
 * Hook to fetch paginated shards
 */
export function useShards(params?: {
  page?: number
  limit?: number
  search?: string
  shardTypeId?: string
  isPublic?: boolean
}) {
  return useQuery({
    queryKey: shardKeys.list(params),
    queryFn: () => shardApi.getShards(params),
  })
}

/**
 * Hook to fetch a single shard
 */
export function useShard(id: string) {
  return useQuery({
    queryKey: shardKeys.detail(id),
    queryFn: () => shardApi.getShard(id),
    enabled: !!id,
  })
}

/**
 * Hook to create a new shard
 */
export function useCreateShard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateShardDto) => shardApi.createShard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shardKeys.lists() })
      toast.success('Shard created successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to update a shard
 */
export function useUpdateShard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShardDto }) =>
      shardApi.updateShard(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: shardKeys.lists() })
      queryClient.invalidateQueries({ queryKey: shardKeys.detail(data.id) })
      toast.success('Shard updated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to delete a shard
 */
export function useDeleteShard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => shardApi.deleteShard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shardKeys.lists() })
      toast.success('Shard deleted successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to search shards
 */
export function useSearchShards(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...shardKeys.all, 'search', query],
    queryFn: () => shardApi.searchShards(query),
    enabled: options?.enabled !== false && query.length > 0,
  })
}

/**
 * Hook to perform vector search on shards
 */
export function useVectorSearchShards(
  query: string,
  params?: {
    limit?: number
    shardTypeId?: string
    minScore?: number
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: [...shardKeys.all, 'vector-search', query, params],
    queryFn: () => shardApi.vectorSearchShards(query, params),
    enabled: params?.enabled !== false && query.length > 0,
  })
}

// ShardType hooks
export function useShardTypes() {
  return useAuthenticatedQuery({
    queryKey: ['shardTypes'],
    queryFn: () => shardTypeApi.getShardTypes(),
  })
}

export function useShardType(id: string) {
  return useAuthenticatedQuery({
    queryKey: ['shardTypes', id],
    queryFn: () => shardTypeApi.getShardType(id),
    enabled: !!id,
  })
}

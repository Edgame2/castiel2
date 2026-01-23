/**
 * React Query hooks for multi-modal assets
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'
import { multimodalAssetsApi, MultimodalAsset, AssetType, UploadAssetResponse } from '@/lib/api/multimodal-assets'

// Query keys
export const multimodalAssetKeys = {
  all: ['multimodal-assets'] as const,
  lists: () => [...multimodalAssetKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...multimodalAssetKeys.lists(), filters] as const,
  details: () => [...multimodalAssetKeys.all, 'detail'] as const,
  detail: (id: string) => [...multimodalAssetKeys.details(), id] as const,
}

/**
 * Hook to get a single asset
 */
export function useMultimodalAsset(assetId: string | undefined) {
  return useQuery({
    queryKey: multimodalAssetKeys.detail(assetId || ''),
    queryFn: () => multimodalAssetsApi.getAsset(assetId!),
    enabled: !!assetId,
  })
}

/**
 * Hook to list assets
 */
export function useMultimodalAssets(options?: {
  assetType?: AssetType
  conversationId?: string
  messageId?: string
  shardId?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: multimodalAssetKeys.list(options),
    queryFn: () => multimodalAssetsApi.listAssets(options),
  })
}

/**
 * Hook to upload an asset
 */
export function useUploadMultimodalAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      file,
      options,
    }: {
      file: File
      options: {
        assetType: AssetType
        conversationId?: string
        messageId?: string
        shardId?: string
        insightId?: string
        autoAnalyze?: boolean
      }
    }) => multimodalAssetsApi.uploadAsset(file, options),
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: multimodalAssetKeys.lists() })
      
      if (variables.options.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: multimodalAssetKeys.list({ conversationId: variables.options.conversationId })
        })
      }

      toast.success('Asset uploaded successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message)
    },
  })
}

/**
 * Hook to process an asset
 */
export function useProcessMultimodalAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assetId: string) => multimodalAssetsApi.processAsset(assetId),
    onSuccess: (data) => {
      // Invalidate asset detail and lists
      queryClient.invalidateQueries({ queryKey: multimodalAssetKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: multimodalAssetKeys.lists() })
      
      if (data.attachedTo?.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: multimodalAssetKeys.list({ conversationId: data.attachedTo.conversationId })
        })
      }

      toast.success('Asset processing started')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message)
    },
  })
}

/**
 * Hook to delete an asset
 */
export function useDeleteMultimodalAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assetId: string) => multimodalAssetsApi.deleteAsset(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: multimodalAssetKeys.all })
      toast.success('Asset deleted successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message)
    },
  })
}










import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { externalUserIdsApi, CreateExternalUserIdDto, UpdateExternalUserIdDto } from '@/lib/api/external-user-ids'
import { ExternalUserId } from '@/types/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'

// Query keys
export const externalUserIdsKeys = {
  all: ['external-user-ids'] as const,
  lists: () => [...externalUserIdsKeys.all, 'list'] as const,
  list: (userId: string) => [...externalUserIdsKeys.lists(), userId] as const,
  details: () => [...externalUserIdsKeys.all, 'detail'] as const,
  detail: (userId: string, integrationId: string) =>
    [...externalUserIdsKeys.details(), userId, integrationId] as const,
}

/**
 * Hook to fetch all external user IDs for a user
 */
export function useUserExternalUserIds(userId: string) {
  return useQuery({
    queryKey: externalUserIdsKeys.list(userId),
    queryFn: () => externalUserIdsApi.getUserExternalUserIds(userId),
    enabled: !!userId,
  })
}

/**
 * Hook to create or update external user ID
 */
export function useCreateExternalUserId() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: CreateExternalUserIdDto }) =>
      externalUserIdsApi.createOrUpdateExternalUserId(userId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: externalUserIdsKeys.list(variables.userId) })
      queryClient.invalidateQueries({ queryKey: externalUserIdsKeys.detail(variables.userId, data.integrationId) })
      toast.success('External user ID saved successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Failed to save external user ID'
      toast.error(errorMsg)
    },
  })
}

/**
 * Hook to update external user ID
 */
export function useUpdateExternalUserId() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      integrationId,
      data,
    }: {
      userId: string
      integrationId: string
      data: UpdateExternalUserIdDto
    }) => externalUserIdsApi.updateExternalUserId(userId, integrationId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: externalUserIdsKeys.list(variables.userId) })
      queryClient.invalidateQueries({
        queryKey: externalUserIdsKeys.detail(variables.userId, variables.integrationId),
      })
      toast.success('External user ID updated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Failed to update external user ID'
      toast.error(errorMsg)
    },
  })
}

/**
 * Hook to delete external user ID
 */
export function useDeleteExternalUserId() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, integrationId }: { userId: string; integrationId: string }) =>
      externalUserIdsApi.deleteExternalUserId(userId, integrationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: externalUserIdsKeys.list(variables.userId) })
      toast.success('External user ID deleted successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Failed to delete external user ID'
      toast.error(errorMsg)
    },
  })
}

/**
 * Hook to sync external user ID from integration
 */
export function useSyncExternalUserId() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, integrationId }: { userId: string; integrationId: string }) =>
      externalUserIdsApi.syncExternalUserId(userId, integrationId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: externalUserIdsKeys.list(variables.userId) })
      queryClient.invalidateQueries({
        queryKey: externalUserIdsKeys.detail(variables.userId, variables.integrationId),
      })
      toast.success('External user ID synced successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      const errorMsg = typeof message === 'string' ? message : (message as any).message || 'Failed to sync external user ID'
      toast.error(errorMsg)
    },
  })
}



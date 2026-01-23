import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'
import {
  redactionApi,
  UpdateRedactionConfigRequest,
} from '@/lib/api/redaction'

// Query keys
export const redactionKeys = {
  all: ['redaction'] as const,
  config: () => [...redactionKeys.all, 'config'] as const,
}

/**
 * Hook to get redaction configuration for current tenant
 */
export function useRedactionConfig() {
  return useQuery({
    queryKey: redactionKeys.config(),
    queryFn: () => redactionApi.getConfig(),
  })
}

/**
 * Hook to update redaction configuration
 */
export function useUpdateRedactionConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateRedactionConfigRequest) =>
      redactionApi.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: redactionKeys.config() })
      toast.success('Redaction configuration updated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to disable redaction
 */
export function useDeleteRedactionConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => redactionApi.deleteConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: redactionKeys.config() })
      toast.success('Redaction disabled successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}







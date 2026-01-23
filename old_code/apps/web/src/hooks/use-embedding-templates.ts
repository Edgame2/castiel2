import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { embeddingTemplatesApi, EmbeddingTemplate } from '@/lib/api/embedding-templates'
import { handleApiError } from '@/lib/api/client'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

export function useEmbeddingTemplatesList() {
  return useQuery({
    queryKey: ['embedding-templates', 'list'],
    queryFn: () => embeddingTemplatesApi.list(),
  })
}

export function useEmbeddingTemplate(shardTypeId: string) {
  return useQuery({
    queryKey: ['embedding-templates', 'detail', shardTypeId],
    queryFn: () => embeddingTemplatesApi.get(shardTypeId),
    enabled: !!shardTypeId,
  })
}

export function useUpdateEmbeddingTemplate(shardTypeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['embedding-templates', 'update', shardTypeId],
    mutationFn: (template: EmbeddingTemplate) => embeddingTemplatesApi.update(shardTypeId, template),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['embedding-templates', 'detail', shardTypeId] })
      qc.invalidateQueries({ queryKey: ['embedding-templates', 'list'] })
    },
    onError: (err) => {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      const errorMessage = handleApiError(err)
      trackException(errorObj, 3)
      trackTrace('Failed to update embedding template', 3, {
        errorMessage: typeof errorMessage === 'string' ? errorMessage : String(errorMessage),
        shardTypeId,
      })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'
import {
  projectResolverApi,
  ProjectContextParams,
  AddInternalRelationshipsRequest,
  AddExternalRelationshipsRequest,
} from '@/lib/api/project-resolver'

// Query keys
export const projectResolverKeys = {
  all: ['project-resolver'] as const,
  context: (projectId: string, params?: ProjectContextParams) =>
    [...projectResolverKeys.all, 'context', projectId, params] as const,
  insights: (projectId: string) =>
    [...projectResolverKeys.all, 'insights', projectId] as const,
}

/**
 * Hook to get project context - returns scoped shard set via relationship traversal
 */
export function useProjectContext(
  projectId: string,
  params?: ProjectContextParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: projectResolverKeys.context(projectId, params),
    queryFn: () => projectResolverApi.getProjectContext(projectId, params),
    enabled: options?.enabled !== false && !!projectId,
  })
}

/**
 * Hook to add internal relationships to a project
 */
export function useAddInternalRelationships() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string
      data: AddInternalRelationshipsRequest
    }) => projectResolverApi.addInternalRelationships(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectResolverKeys.context(variables.projectId),
      })
      toast.success('Internal relationships added successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to add external relationships to a project
 */
export function useAddExternalRelationships() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string
      data: AddExternalRelationshipsRequest
    }) => projectResolverApi.addExternalRelationships(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectResolverKeys.context(variables.projectId),
      })
      toast.success('External relationships added successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : (message as any).message || 'An error occurred')
    },
  })
}

/**
 * Hook to get insights with provenance for a project
 */
export function useProjectInsights(projectId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectResolverKeys.insights(projectId),
    queryFn: () => projectResolverApi.getProjectInsights(projectId),
    enabled: options?.enabled !== false && !!projectId,
  })
}







/**
 * React Query hooks for prompt A/B testing
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listPromptABTests,
  getPromptABTest,
  createPromptABTest,
  updatePromptABTest,
  deletePromptABTest,
  getPromptABTestResults,
  exportPromptABTestResults,
  type PromptABTest,
  type PromptABTestListParams,
  type CreatePromptABTestInput,
  type UpdatePromptABTestInput,
} from '@/lib/api/prompt-ab-tests'
import { toast } from 'sonner'

export const promptABTestKeys = {
  all: ['prompt-ab-tests'] as const,
  lists: () => [...promptABTestKeys.all, 'list'] as const,
  list: (params?: PromptABTestListParams) => [...promptABTestKeys.lists(), params] as const,
  details: () => [...promptABTestKeys.all, 'detail'] as const,
  detail: (id: string) => [...promptABTestKeys.details(), id] as const,
  results: (id: string) => [...promptABTestKeys.detail(id), 'results'] as const,
}

/**
 * Hook to list prompt A/B test experiments
 */
export function usePromptABTests(params?: PromptABTestListParams) {
  return useQuery({
    queryKey: promptABTestKeys.list(params),
    queryFn: () => listPromptABTests(params),
  })
}

/**
 * Hook to get a single prompt A/B test experiment
 */
export function usePromptABTest(experimentId: string | undefined) {
  return useQuery({
    queryKey: promptABTestKeys.detail(experimentId!),
    queryFn: () => getPromptABTest(experimentId!),
    enabled: !!experimentId,
  })
}

/**
 * Hook to get experiment results
 */
export function usePromptABTestResults(experimentId: string | undefined) {
  return useQuery({
    queryKey: promptABTestKeys.results(experimentId!),
    queryFn: () => getPromptABTestResults(experimentId!),
    enabled: !!experimentId,
  })
}

/**
 * Hook to create a prompt A/B test experiment
 */
export function useCreatePromptABTest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePromptABTestInput) => createPromptABTest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptABTestKeys.lists() })
      toast.success('A/B test experiment created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create A/B test experiment')
    },
  })
}

/**
 * Hook to update a prompt A/B test experiment
 */
export function useUpdatePromptABTest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ experimentId, input }: { experimentId: string; input: UpdatePromptABTestInput }) =>
      updatePromptABTest(experimentId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: promptABTestKeys.lists() })
      queryClient.invalidateQueries({ queryKey: promptABTestKeys.detail(data.id) })
      toast.success('A/B test experiment updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update A/B test experiment')
    },
  })
}

/**
 * Hook to delete a prompt A/B test experiment
 */
export function useDeletePromptABTest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (experimentId: string) => deletePromptABTest(experimentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptABTestKeys.lists() })
      toast.success('A/B test experiment deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete A/B test experiment')
    },
  })
}

/**
 * Hook to export A/B test results
 */
export function useExportPromptABTestResults() {
  return useMutation({
    mutationFn: ({ experimentId, format }: { experimentId: string; format?: 'csv' | 'json' }) =>
      exportPromptABTestResults(experimentId, format || 'json'),
    onSuccess: (blob, variables) => {
      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a' as any)
      a.href = url
      a.download = `ab-test-${variables.experimentId}-${new Date().toISOString().split('T' as any)[0]}.${variables.format || 'json'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`A/B test results exported as ${variables.format || 'json'}`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to export A/B test results')
    },
  })
}


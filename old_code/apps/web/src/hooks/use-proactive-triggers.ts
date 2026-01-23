/**
 * Proactive Triggers React Hooks
 * React Query hooks for Proactive Triggers functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listProactiveTriggers,
  getProactiveTrigger,
  createProactiveTrigger,
  updateProactiveTrigger,
  deleteProactiveTrigger,
  seedDefaultTriggers,
  type ProactiveTriggersListParams,
  type ProactiveTrigger,
  type CreateProactiveTriggerRequest,
  type UpdateProactiveTriggerRequest,
} from '@/lib/api/proactive-triggers';

// ============================================
// Query Keys
// ============================================

export const proactiveTriggerKeys = {
  all: ['proactive-triggers'] as const,
  lists: () => [...proactiveTriggerKeys.all, 'list'] as const,
  list: (params?: ProactiveTriggersListParams) =>
    [...proactiveTriggerKeys.lists(), params] as const,
  details: () => [...proactiveTriggerKeys.all, 'detail'] as const,
  detail: (id: string) => [...proactiveTriggerKeys.details(), id] as const,
};

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to list proactive triggers
 */
export function useProactiveTriggers(params?: ProactiveTriggersListParams) {
  return useQuery({
    queryKey: proactiveTriggerKeys.list(params),
    queryFn: () => listProactiveTriggers(params),
  });
}

/**
 * Hook to get a single proactive trigger
 */
export function useProactiveTrigger(triggerId: string) {
  return useQuery({
    queryKey: proactiveTriggerKeys.detail(triggerId),
    queryFn: () => getProactiveTrigger(triggerId),
    enabled: !!triggerId,
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to create a proactive trigger
 */
export function useCreateProactiveTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProactiveTriggerRequest) => createProactiveTrigger(data),
    onSuccess: (data) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: proactiveTriggerKeys.lists() });
      // Set detail query
      queryClient.setQueryData(proactiveTriggerKeys.detail(data.id), data);
      toast.success('Trigger created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create trigger: ${error.message}`);
    },
  });
}

/**
 * Hook to update a proactive trigger
 */
export function useUpdateProactiveTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ triggerId, data }: { triggerId: string; data: UpdateProactiveTriggerRequest }) =>
      updateProactiveTrigger(triggerId, data),
    onSuccess: (data) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: proactiveTriggerKeys.lists() });
      // Update detail query
      queryClient.setQueryData(proactiveTriggerKeys.detail(data.id), data);
      toast.success('Trigger updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update trigger: ${error.message}`);
    },
  });
}

/**
 * Hook to delete a proactive trigger
 */
export function useDeleteProactiveTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (triggerId: string) => deleteProactiveTrigger(triggerId),
    onSuccess: (_, triggerId) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: proactiveTriggerKeys.lists() });
      // Remove detail query
      queryClient.removeQueries({ queryKey: proactiveTriggerKeys.detail(triggerId) });
      toast.success('Trigger deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete trigger: ${error.message}`);
    },
  });
}

/**
 * Hook to seed default triggers
 */
export function useSeedDefaultTriggers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => seedDefaultTriggers(),
    onSuccess: (data) => {
      // Invalidate list queries to show newly seeded triggers
      queryClient.invalidateQueries({ queryKey: proactiveTriggerKeys.lists() });
      
      const { seeded, skipped, errors } = data.results;
      if (errors > 0) {
        toast.warning(
          `Seeded ${seeded} triggers, skipped ${skipped}, ${errors} errors occurred`
        );
      } else if (seeded > 0) {
        toast.success(`Successfully seeded ${seeded} default trigger${seeded !== 1 ? 's' : ''}`);
      } else {
        toast.info('All default triggers already exist');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to seed default triggers: ${error.message}`);
    },
  });
}


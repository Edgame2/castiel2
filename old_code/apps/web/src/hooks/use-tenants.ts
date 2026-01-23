/**
 * Tenant Management Hooks
 * React Query hooks for tenant/organization management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  activateTenant,
  type Tenant,
  type TenantListQuery,
  type TenantListResponse,
  type CreateTenantRequest,
  type UpdateTenantRequest,
} from '@/lib/api/tenants';

// Query keys
export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (query?: TenantListQuery) => [...tenantKeys.lists(), query] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
};

/**
 * Hook to fetch tenants list
 */
export function useTenants(query?: TenantListQuery) {
  return useQuery<TenantListResponse, Error>({
    queryKey: tenantKeys.list(query),
    queryFn: () => getTenants(query),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch single tenant
 */
export function useTenant(tenantId: string) {
  return useQuery<Tenant, Error>({
    queryKey: tenantKeys.detail(tenantId),
    queryFn: () => getTenant(tenantId),
    enabled: !!tenantId,
    staleTime: 30000,
  });
}

/**
 * Hook to create tenant
 */
export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTenantRequest) => createTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
      toast.success('Tenant created', {
        description: 'The tenant has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create tenant', {
        description: error.message || 'An error occurred while creating the tenant.',
      });
    },
  });
}

/**
 * Hook to update tenant
 */
export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantRequest }) =>
      updateTenant(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
      toast.success('Tenant updated', {
        description: 'The tenant settings have been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update tenant', {
        description: error.message || 'An error occurred while updating the tenant.',
      });
    },
  });
}

/**
 * Hook to delete tenant
 */
export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
      toast.success('Tenant deleted', {
        description: 'The tenant has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete tenant', {
        description: error.message || 'An error occurred while deleting the tenant.',
      });
    },
  });
}

/**
 * Hook to activate tenant
 */
export function useActivateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activateTenant(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
      toast.success('Tenant activated', {
        description: 'The tenant has been activated successfully.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to activate tenant', {
        description: error.message || 'An error occurred while activating the tenant.',
      });
    },
  });
}

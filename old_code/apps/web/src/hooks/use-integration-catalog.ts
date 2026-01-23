/**
 * Integration Catalog Custom Hooks
 * 
 * React Query hooks for integration catalog API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  IntegrationCatalogEntry,
  CatalogListResult,
  IntegrationVisibilityRule,
} from '@/types/integration.types';

// ============================================
// Catalog Entry Queries
// ============================================

export function useCatalogEntries(options?: {
  limit?: number;
  offset?: number;
  category?: string;
  status?: string;
  searchTerm?: string;
}) {
  return useQuery({
    queryKey: ['integration-catalog', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());
      if (options?.category) params.append('category', options.category);
      if (options?.status) params.append('status', options.status);
      if (options?.searchTerm) params.append('searchTerm', options.searchTerm);

      const response = await apiClient.get<CatalogListResult>(
        `/api/v1/super-admin/integration-catalog?${params.toString()}`
      );
      return response.data;
    },
  });
}

export function useCatalogEntry(integrationId: string) {
  return useQuery({
    queryKey: ['integration-catalog', integrationId],
    queryFn: async () => {
      const response = await apiClient.get<IntegrationCatalogEntry>(
        `/api/v1/super-admin/integration-catalog/${integrationId}`
      );
      return response.data;
    },
    enabled: !!integrationId,
  });
}

// ============================================
// Catalog Entry Mutations
// ============================================

export function useCreateCatalogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post<IntegrationCatalogEntry>(
        '/api/v1/super-admin/integration-catalog',
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-catalog'] });
    },
  });
}

export function useUpdateCatalogEntry(integrationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      return apiClient.patch<IntegrationCatalogEntry>(
        `/api/v1/super-admin/integration-catalog/${integrationId}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['integration-catalog', integrationId] });
    },
  });
}

export function useDeleteCatalogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integrationId: string) => {
      return apiClient.delete(`/api/v1/super-admin/integration-catalog/${integrationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-catalog'] });
    },
  });
}

export function useDeprecateCatalogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integrationId: string) => {
      return apiClient.post<IntegrationCatalogEntry>(
        `/api/v1/super-admin/integration-catalog/${integrationId}/deprecate`
      );
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['integration-catalog', variables] });
    },
  });
}

// ============================================
// Shard Mapping Queries
// ============================================

export function useShardMappings(integrationId: string) {
  return useQuery({
    queryKey: ['integration-catalog', integrationId, 'shard-mappings'],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/v1/super-admin/integration-catalog/${integrationId}/shard-mappings`
      );
      return response.data;
    },
    enabled: !!integrationId,
  });
}

export function useUpdateShardMappings(integrationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mappings: any[]) => {
      return apiClient.patch(
        `/api/v1/super-admin/integration-catalog/${integrationId}/shard-mappings`,
        { mappings }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['integration-catalog', integrationId, 'shard-mappings'],
      });
    },
  });
}

// ============================================
// Visibility Rules Queries
// ============================================

export function useVisibilityRulesForIntegration(integrationId: string) {
  return useQuery({
    queryKey: ['integration-catalog', integrationId, 'visibility'],
    queryFn: async () => {
      const response = await apiClient.get<IntegrationVisibilityRule[]>(
        `/api/v1/super-admin/integration-catalog/${integrationId}/visibility`
      );
      return response.data;
    },
    enabled: !!integrationId,
  });
}

export function useVisibilityRulesForTenant(tenantId: string) {
  return useQuery({
    queryKey: ['integration-visibility', tenantId],
    queryFn: async () => {
      const response = await apiClient.get<IntegrationVisibilityRule[]>(
        `/api/v1/super-admin/tenants/${tenantId}/integration-visibility`
      );
      return response.data;
    },
    enabled: !!tenantId,
  });
}

// ============================================
// Visibility Rules Mutations
// ============================================

export function useApproveIntegration(integrationId: string, tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient.post<IntegrationVisibilityRule>(
        `/api/v1/super-admin/integration-catalog/${integrationId}/approve/${tenantId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['integration-catalog', integrationId, 'visibility'],
      });
      queryClient.invalidateQueries({ queryKey: ['integration-visibility', tenantId] });
    },
  });
}

export function useDenyIntegration(integrationId: string, tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reason: string) => {
      return apiClient.post<IntegrationVisibilityRule>(
        `/api/v1/super-admin/integration-catalog/${integrationId}/deny/${tenantId}`,
        { reason }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['integration-catalog', integrationId, 'visibility'],
      });
      queryClient.invalidateQueries({ queryKey: ['integration-visibility', tenantId] });
    },
  });
}

export function useHideIntegration(integrationId: string, tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reason?: string) => {
      return apiClient.post<IntegrationVisibilityRule>(
        `/api/v1/super-admin/integration-catalog/${integrationId}/hide/${tenantId}`,
        { reason }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['integration-catalog', integrationId, 'visibility'],
      });
      queryClient.invalidateQueries({ queryKey: ['integration-visibility', tenantId] });
    },
  });
}

export function useShowIntegration(integrationId: string, tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient.post<IntegrationVisibilityRule>(
        `/api/v1/super-admin/integration-catalog/${integrationId}/show/${tenantId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['integration-catalog', integrationId, 'visibility'],
      });
      queryClient.invalidateQueries({ queryKey: ['integration-visibility', tenantId] });
    },
  });
}

// ============================================
// Whitelist Management Mutations
// ============================================

export function useAddTenantToWhitelist(integrationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      return apiClient.post<IntegrationCatalogEntry>(
        `/api/v1/super-admin/integration-catalog/${integrationId}/whitelist/${tenantId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-catalog', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['integration-catalog'] });
    },
  });
}

export function useRemoveTenantFromWhitelist(integrationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      return apiClient.delete(
        `/api/v1/super-admin/integration-catalog/${integrationId}/whitelist/${tenantId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-catalog', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['integration-catalog'] });
    },
  });
}

export function useBlockTenant(integrationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      return apiClient.post<IntegrationCatalogEntry>(
        `/api/v1/super-admin/integration-catalog/${integrationId}/block/${tenantId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-catalog', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['integration-catalog'] });
    },
  });
}

export function useUnblockTenant(integrationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      return apiClient.delete(
        `/api/v1/super-admin/integration-catalog/${integrationId}/block/${tenantId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-catalog', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['integration-catalog'] });
    },
  });
}

export function useMakePublic(integrationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient.post<IntegrationCatalogEntry>(
        `/api/v1/super-admin/integration-catalog/${integrationId}/make-public`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-catalog', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['integration-catalog'] });
    },
  });
}

export function useMakePrivate(integrationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allowedTenants: string[]) => {
      return apiClient.post<IntegrationCatalogEntry>(
        `/api/v1/super-admin/integration-catalog/${integrationId}/make-private`,
        { allowedTenants }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-catalog', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['integration-catalog'] });
    },
  });
}

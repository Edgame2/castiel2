/**
 * Widget Catalog Hooks
 * React Query hooks for widget catalog management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createWidgetCatalogEntry,
  getWidgetCatalogEntry,
  listWidgetCatalogEntries,
  updateWidgetCatalogEntry,
  deleteWidgetCatalogEntry,
  getTenantWidgetConfig,
  updateTenantWidgetConfig,
  updateTenantWidgetAccess,
  deleteTenantWidgetAccess,
  getUserWidgetCatalog,
} from '@/lib/api/widgets';
import type {
  WidgetCatalogEntry,
  TenantWidgetCatalogConfig,
  TenantWidgetCatalogOverride,
  WidgetCatalogListResult,
  WidgetCatalogUserListResult,
  CreateWidgetCatalogEntryInput,
  UpdateWidgetCatalogEntryInput,
  UpdateTenantWidgetAccessInput,
  UpdateTenantWidgetConfigInput,
} from '@/types/widget-catalog';

// ============================================================================
// Query Keys
// ============================================================================

const widgetCatalogKeys = {
  all: ['widget-catalog'] as const,
  entries: () => [...widgetCatalogKeys.all, 'entries'] as const,
  entry: (id: string) => [...widgetCatalogKeys.entries(), id] as const,
  list: (filters?: Record<string, unknown>) =>
    [...widgetCatalogKeys.entries(), { filters }] as const,
  userCatalog: () => [...widgetCatalogKeys.all, 'user-catalog'] as const,
  userList: (filters?: Record<string, unknown>) =>
    [...widgetCatalogKeys.userCatalog(), { filters }] as const,
  tenantConfig: (tenantId: string) =>
    [...widgetCatalogKeys.all, 'tenant-config', tenantId] as const,
};

// ============================================================================
// SuperAdmin: Widget Catalog Entry Hooks
// ============================================================================

/**
 * Hook to fetch widget catalog entry by ID
 */
export function useWidgetCatalogEntry(entryId: string) {
  return useQuery({
    queryKey: widgetCatalogKeys.entry(entryId),
    queryFn: () => getWidgetCatalogEntry(entryId),
    enabled: !!entryId,
  });
}

/**
 * Hook to fetch widget catalog entries with filtering
 */
export function useWidgetCatalogEntries(
  filters?: Record<string, unknown>,
  enabled = true
) {
  return useQuery({
    queryKey: widgetCatalogKeys.list(filters),
    queryFn: () => listWidgetCatalogEntries(filters),
    enabled,
  });
}

/**
 * Hook to create widget catalog entry
 */
export function useCreateWidgetCatalogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWidgetCatalogEntryInput) =>
      createWidgetCatalogEntry(data),
    onSuccess: (newEntry) => {
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: widgetCatalogKeys.entries(),
      });
      // Add to cache
      queryClient.setQueryData(widgetCatalogKeys.entry(newEntry.id), newEntry);
    },
  });
}

/**
 * Hook to update widget catalog entry
 */
export function useUpdateWidgetCatalogEntry(entryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateWidgetCatalogEntryInput) =>
      updateWidgetCatalogEntry(entryId, data),
    onSuccess: (updatedEntry) => {
      // Update cache
      queryClient.setQueryData(widgetCatalogKeys.entry(entryId), updatedEntry);
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: widgetCatalogKeys.entries(),
      });
    },
  });
}

/**
 * Hook to delete widget catalog entry
 */
export function useDeleteWidgetCatalogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => deleteWidgetCatalogEntry(entryId),
    onSuccess: () => {
      // Invalidate all catalog queries
      queryClient.invalidateQueries({
        queryKey: widgetCatalogKeys.all,
      });
    },
  });
}

// ============================================================================
// TenantAdmin: Widget Access & Config Hooks
// ============================================================================

/**
 * Hook to fetch tenant widget configuration
 */
export function useTenantWidgetConfig(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: widgetCatalogKeys.tenantConfig(tenantId),
    queryFn: () => getTenantWidgetConfig(tenantId),
    enabled: !!tenantId && enabled,
  });
}

/**
 * Hook to update tenant widget configuration
 */
export function useUpdateTenantWidgetConfig(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTenantWidgetConfigInput) =>
      updateTenantWidgetConfig(tenantId, data),
    onSuccess: (updatedConfig) => {
      // Update cache
      queryClient.setQueryData(
        widgetCatalogKeys.tenantConfig(tenantId),
        updatedConfig
      );
      // Invalidate user catalog (visibility changed)
      queryClient.invalidateQueries({
        queryKey: widgetCatalogKeys.userCatalog(),
      });
    },
  });
}

/**
 * Hook to update widget access for tenant
 */
export function useUpdateTenantWidgetAccess(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      widgetId,
      data,
    }: {
      widgetId: string;
      data: Omit<UpdateTenantWidgetAccessInput, 'widgetCatalogEntryId'>;
    }) => updateTenantWidgetAccess(tenantId, widgetId, data),
    onSuccess: () => {
      // Invalidate config and user catalog
      queryClient.invalidateQueries({
        queryKey: widgetCatalogKeys.tenantConfig(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: widgetCatalogKeys.userCatalog(),
      });
    },
  });
}

/**
 * Hook to delete widget access override
 */
export function useDeleteTenantWidgetAccess(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (widgetId: string) =>
      deleteTenantWidgetAccess(tenantId, widgetId),
    onSuccess: () => {
      // Invalidate config and user catalog
      queryClient.invalidateQueries({
        queryKey: widgetCatalogKeys.tenantConfig(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: widgetCatalogKeys.userCatalog(),
      });
    },
  });
}

// ============================================================================
// User: Get Available Widgets
// ============================================================================

/**
 * Hook to fetch available widgets for current user
 */
export function useUserWidgetCatalog(
  filters?: Record<string, unknown>,
  enabled = true
) {
  return useQuery({
    queryKey: widgetCatalogKeys.userList(filters),
    queryFn: () => getUserWidgetCatalog(filters),
    enabled,
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to search widget catalog entries
 */
export function useSearchWidgetCatalog(searchQuery: string, enabled = true) {
  return useWidgetCatalogEntries(
    {
      search: searchQuery,
      limit: 20,
    },
    enabled && !!searchQuery
  );
}

/**
 * Hook to filter widget catalog by category
 */
export function useWidgetCatalogByCategory(category: string, enabled = true) {
  return useWidgetCatalogEntries(
    {
      category,
      limit: 100,
      sort: 'name',
    },
    enabled && !!category
  );
}

/**
 * Hook to get featured widgets
 */
export function useFeaturedWidgets() {
  return useUserWidgetCatalog({
    sort: 'featured',
    limit: 10,
  });
}

/**
 * Hook to prefetch widget entry
 */
export function usePrefetchWidgetEntry() {
  const queryClient = useQueryClient();

  return (entryId: string) => {
    queryClient.prefetchQuery({
      queryKey: widgetCatalogKeys.entry(entryId),
      queryFn: () => getWidgetCatalogEntry(entryId),
    });
  };
}

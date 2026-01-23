'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TenantDocumentSettings, StorageStats } from '@/types/documents';
import { apiClient } from '@/lib/api/client';

/**
 * Hook for fetching and managing tenant document settings
 */
export function useTenantSettings() {
  const queryClient = useQueryClient();

  // Fetch tenant settings
  const {
    data: settings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      const { data } = await apiClient.get<TenantDocumentSettings>('/api/v1/documents/settings');
      return data;
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<TenantDocumentSettings>) => {
      const { data: responseData } = await apiClient.put('/api/v1/documents/settings', data);
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
    },
  });

  return {
    settings,
    isLoading,
    error,
    refetch,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending,
  };
}

/**
 * Hook for fetching storage statistics
 */
export function useStorageStats() {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['storage-stats'],
    queryFn: async () => {
      const response = await fetch('/api/v1/tenant/storage-stats', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch storage stats');
      }

      return response.json() as Promise<StorageStats>;
    },
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching available categories
 */
export function useCategories() {
  const {
    data: categories = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/v1/documents/categories', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      return response.json() as Promise<string[]>;
    },
  });

  return {
    categories,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching available tags
 */
export function useTags() {
  const {
    data: tags = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await fetch('/api/v1/documents/tags', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }

      return response.json() as Promise<string[]>;
    },
  });

  return {
    tags,
    isLoading,
    error,
    refetch,
  };
}

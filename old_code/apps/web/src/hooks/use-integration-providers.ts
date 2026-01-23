/**
 * use-integration-providers Hook
 * React hook for managing integration providers (Super Admin)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationApi } from '@/lib/api/integrations';
import type { IntegrationProviderDocument } from '@/types/integration';

export function useIntegrationProviders(params?: {
  category?: string;
  status?: string;
  audience?: string;
  supportsSearch?: boolean;
  supportsNotifications?: boolean;
  requiresUserScoping?: boolean;
}) {
  return useQuery({
    queryKey: ['integration-providers', params],
    queryFn: () => integrationApi.listProviders(params),
  });
}

export function useIntegrationProvider(category: string, id: string) {
  return useQuery({
    queryKey: ['integration-providers', category, id],
    queryFn: () => integrationApi.getProvider(category, id),
    enabled: !!category && !!id,
  });
}

export function useIntegrationProviderByName(providerName: string) {
  return useQuery({
    queryKey: ['integration-providers', 'by-name', providerName],
    queryFn: () => integrationApi.getProviderByName(providerName),
    enabled: !!providerName,
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => integrationApi.createProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-providers'] });
    },
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ category, id, data }: { category: string; id: string; data: any }) =>
      integrationApi.updateProvider(category, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration-providers'] });
      queryClient.invalidateQueries({ queryKey: ['integration-providers', variables.category, variables.id] });
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ category, id }: { category: string; id: string }) =>
      integrationApi.deleteProvider(category, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-providers'] });
    },
  });
}

export function useChangeProviderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      category,
      id,
      status,
    }: {
      category: string;
      id: string;
      status: 'active' | 'beta' | 'deprecated' | 'disabled';
    }) => integrationApi.changeProviderStatus(category, id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration-providers'] });
      queryClient.invalidateQueries({ queryKey: ['integration-providers', variables.category, variables.id] });
    },
  });
}

export function useChangeProviderAudience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      category,
      id,
      audience,
    }: {
      category: string;
      id: string;
      audience: 'system' | 'tenant';
    }) => integrationApi.changeProviderAudience(category, id, audience),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration-providers'] });
      queryClient.invalidateQueries({ queryKey: ['integration-providers', variables.category, variables.id] });
    },
  });
}








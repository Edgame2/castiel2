/**
 * use-integration-search Hook
 * React hook for integration search functionality
 */

import { useMutation } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { integrationApi } from '@/lib/api/integrations';
import type { IntegrationSearchResult } from '@/types/integration';

export function useIntegrationSearch() {
  return useMutation({
    mutationFn: (data: {
      query: string;
      entities?: string[];
      filters?: any;
      limit?: number;
      offset?: number;
      integrationIds?: string[];
    }) => integrationApi.search(data),
  });
}

export function useSearchIntegration() {
  return useMutation({
    mutationFn: ({
      id,
      query,
      params,
    }: {
      id: string;
      query: string;
      params?: {
        entities?: string[];
        filters?: any;
        limit?: number;
        offset?: number;
      };
    }) => integrationApi.searchIntegration(id, query, params),
  });
}

export function useSearchableIntegrations() {
  return useQuery({
    queryKey: ['integrations', 'searchable'],
    queryFn: () => integrationApi.getSearchableIntegrations(),
  });
}








/**
 * use-integrations Hook
 * React hook for managing integration instances
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationApi } from '@/lib/api/integrations';
import type { IntegrationDocument } from '@/types/integration';

export function useIntegrations(params?: {
  providerName?: string;
  status?: string;
  searchEnabled?: boolean;
  userScoped?: boolean;
}) {
  return useQuery({
    queryKey: ['integrations', params],
    queryFn: () => integrationApi.listIntegrations(params),
  });
}

export function useIntegration(id: string) {
  return useQuery({
    queryKey: ['integrations', id],
    queryFn: () => integrationApi.getIntegration(id),
    enabled: !!id,
  });
}

export function useCreateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => integrationApi.createIntegration(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      integrationApi.updateIntegration(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.id] });
    },
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => integrationApi.deleteIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

export function useActivateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => integrationApi.activateIntegration(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', id] });
    },
  });
}

export function useDeactivateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => integrationApi.deactivateIntegration(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', id] });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (id: string) => integrationApi.testConnection(id),
  });
}

export function useConnectionStatus(integrationId: string) {
  return useQuery<any>({
    queryKey: ['integrations', integrationId, 'connectionStatus'],
    queryFn: () => Promise.resolve({ 
      status: 'active' as const, 
      connected: true,
      displayName: undefined,
      lastValidatedAt: undefined,
      expiresAt: undefined,
      error: undefined,
      details: undefined,
    }), // Stub
    enabled: !!integrationId,
  });
}

export function useStartOAuthConnect() {
  return useMutation({
    mutationFn: async ({ integrationId, returnUrl }: { integrationId: string; returnUrl: string }) => {
      return Promise.resolve({ authorizationUrl: '#' }); // Stub
    },
  });
}

export function useSyncTasks(integrationId: string) {
  return useQuery({
    queryKey: ['syncTasks', integrationId],
    queryFn: () => Promise.resolve({ tasks: [], total: 0, hasMore: false }), // Stub
    enabled: !!integrationId,
  });
}

export function useUpdateDataAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, allowedShardTypes }: { id: string; allowedShardTypes: string[] }) =>
      integrationApi.updateDataAccess(id, allowedShardTypes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.id] });
    },
  });
}

export function useUpdateSearchConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      searchEnabled,
      searchableEntities,
      searchFilters,
    }: {
      id: string;
      searchEnabled: boolean;
      searchableEntities: string[];
      searchFilters?: any;
    }) =>
      integrationApi.updateSearchConfig(id, {
        searchEnabled,
        searchableEntities,
        searchFilters,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.id] });
    },
  });
}

// ============================================================================
// Tenant Integration Hooks
// ============================================================================

export function useTenantIntegration(integrationId: string) {
  return useQuery({
    queryKey: ['tenant-integrations', integrationId],
    queryFn: async () => {
      // TODO: Implement API endpoint
      return {
        id: integrationId,
        tenantId: 'mock-tenant-id',
        integrationId: 'mock-integration-id',
        status: 'connected' as const,
        enabledAt: new Date().toISOString(),
        enabledBy: 'mock-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {},
      };
    },
    enabled: !!integrationId,
  });
}

// ============================================================================
// Conversion Schema Hooks
// ============================================================================

export function useConversionSchemas(integrationId: string) {
  return useQuery({
    queryKey: ['conversion-schemas', integrationId],
    queryFn: async () => {
      // TODO: Implement API endpoint
      return { schemas: [], total: 0, hasMore: false };
    },
    enabled: !!integrationId,
  });
}

export function useConversionSchema(integrationId: string, schemaId: string) {
  return useQuery({
    queryKey: ['conversion-schemas', integrationId, schemaId],
    queryFn: async () => {
      // TODO: Implement API endpoint
      return {
        id: schemaId,
        tenantIntegrationId: integrationId,
        tenantId: 'mock-tenant-id',
        name: 'Mock Schema',
        description: '',
        source: {
          entity: 'mock-entity',
        },
        target: {
          shardTypeId: 'mock-shard-type-id',
          createIfMissing: true,
          updateIfExists: true,
          deleteIfRemoved: false,
        },
        fieldMappings: [],
        deduplication: {
          strategy: 'external_id',
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    enabled: !!integrationId && !!schemaId,
  });
}

export function useUpdateConversionSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, schemaId, data }: { integrationId: string; schemaId: string; data: any }) => {
      // TODO: Implement API endpoint
      throw new Error('useUpdateConversionSchema: API endpoint not yet implemented');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversion-schemas', variables.integrationId] });
    },
  });
}

export function useDeleteConversionSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, schemaId }: { integrationId: string; schemaId: string }) => {
      // TODO: Implement API endpoint
      throw new Error('useDeleteConversionSchema: API endpoint not yet implemented');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversion-schemas', variables.integrationId] });
    },
  });
}

export function useTestConversionSchema() {
  return useMutation({
    mutationFn: async ({ integrationId, schemaId, sampleData }: { integrationId: string; schemaId: string; sampleData?: Record<string, any> }) => {
      // TODO: Implement API endpoint
      return { success: true, transformedData: sampleData, fieldResults: [], errors: [] };
    },
  });
}

// ============================================================================
// Sync Task Hooks
// ============================================================================

export function useSyncTask(integrationId: string, taskId: string) {
  return useQuery({
    queryKey: ['sync-tasks', integrationId, taskId],
    queryFn: async () => {
      // TODO: Implement API endpoint
      return {
        id: taskId,
        tenantIntegrationId: integrationId,
        tenantId: 'mock-tenant-id',
        name: 'Mock Sync Task',
        description: '',
        conversionSchemaId: 'mock-schema-id',
        direction: 'pull' as const,
        schedule: {
          type: 'manual' as const,
          config: {
            type: 'manual' as const,
          },
        },
        config: {},
        status: 'active' as const,
        lastRunAt: undefined,
        lastRunStatus: undefined,
        nextRunAt: undefined,
        lastError: undefined,
        stats: {
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          recordsFailed: 0,
        },
        retryConfig: {
          maxRetries: 3,
          retryDelaySeconds: 60,
          exponentialBackoff: true,
        },
        notifications: {
          onSuccess: false,
          onFailure: false,
          onPartial: false,
          recipients: [],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    enabled: !!integrationId && !!taskId,
  });
}

export function useSyncExecutions(integrationId: string, params?: { taskId?: string; limit?: number }) {
  return useQuery<{ executions: any[]; total: number; hasMore: boolean }>({
    queryKey: ['syncExecutions', integrationId, params],
    queryFn: async () => {
      return Promise.resolve({ executions: [], total: 0, hasMore: false }); // Stub
    },
    enabled: !!integrationId,
  });
}

export function useUpdateSyncTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, taskId, data }: { integrationId: string; taskId: string; data: any }) => {
      // TODO: Implement API endpoint
      throw new Error('useUpdateSyncTask: API endpoint not yet implemented');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sync-tasks', variables.integrationId] });
    },
  });
}

export function useDeleteSyncTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, taskId }: { integrationId: string; taskId: string }) => {
      // TODO: Implement API endpoint
      throw new Error('useDeleteSyncTask: API endpoint not yet implemented');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sync-tasks', variables.integrationId] });
    },
  });
}

export function useTriggerSyncTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, taskId }: { integrationId: string; taskId: string }) => {
      // TODO: Implement API endpoint
      throw new Error('useTriggerSyncTask: API endpoint not yet implemented');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sync-tasks', variables.integrationId] });
      queryClient.invalidateQueries({ queryKey: ['sync-executions', variables.integrationId] });
    },
  });
}

export function usePauseSyncTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, taskId }: { integrationId: string; taskId: string }) => {
      // TODO: Implement API endpoint
      throw new Error('usePauseSyncTask: API endpoint not yet implemented');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sync-tasks', variables.integrationId] });
    },
  });
}

export function useResumeSyncTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, taskId }: { integrationId: string; taskId: string }) => {
      // TODO: Implement API endpoint
      throw new Error('useResumeSyncTask: API endpoint not yet implemented');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sync-tasks', variables.integrationId] });
    },
  });
}

export function useCreateSyncTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, data }: { integrationId: string; data: any }) => {
      return integrationApi.createSyncTask(integrationId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sync-tasks', variables.integrationId] });
    },
  });
}

export function useCreateConversionSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, data }: { integrationId: string; data: any }) => {
      return integrationApi.createConversionSchema(integrationId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversion-schemas', variables.integrationId] });
    },
  });
}

export function useTenantIntegrations() {
  return useQuery({
    queryKey: ['tenant-integrations'],
    queryFn: async (): Promise<{ integrations: any[]; total: number; hasMore: boolean }> => {
      // TODO: Implement API endpoint
      return { integrations: [], total: 0, hasMore: false };
    },
  });
}

export function useConnectWithApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, apiKey }: { integrationId: string; apiKey: string }) => {
      return Promise.resolve({ success: true }); // Stub
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-integrations', variables.integrationId] });
    },
  });
}

export function useDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId }: { integrationId: string }) => {
      return Promise.resolve({ success: true }); // Stub
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-integrations', variables.integrationId] });
    },
  });
}

export function useCancelSyncExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, executionId }: { integrationId: string; executionId: string }) => {
      // TODO: Implement API endpoint
      throw new Error('useCancelSyncExecution: API endpoint not yet implemented');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sync-executions', variables.integrationId] });
    },
  });
}

export function useRetrySyncExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, executionId }: { integrationId: string; executionId: string }) => {
      // TODO: Implement API endpoint
      throw new Error('useRetrySyncExecution: API endpoint not yet implemented');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sync-executions', variables.integrationId] });
    },
  });
}

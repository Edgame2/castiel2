/**
 * use-integration-connections Hook
 * React hook for managing integration connections
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, handleApiError, isRateLimitError, type RateLimitError } from '../lib/api/client';
import { ensureAuth } from '../lib/api/client';

export interface UserConnection {
  id: string;
  integrationId: string;
  displayName: string;
  status: string;
  scope: string;
  authType: string;
  lastValidatedAt?: string;
  validationError?: string;
  oauthExpiresAt?: string; // OAuth token expiration timestamp
  lastUsedAt?: string; // Last time connection was used
  usageCount?: number; // Number of times connection has been used
  createdAt: string;
  updatedAt: string;
}

export interface UserConnectionsResponse {
  connections: UserConnection[];
}

export interface CreateUserConnectionRequest {
  credentials?: any;
  displayName?: string;
}

export interface UpdateUserConnectionRequest {
  displayName?: string;
  credentials?: any;
}

export interface TestConnectionResponse {
  success: boolean;
  error?: string;
  details?: any;
}

export interface ConnectionUsageStats {
  totalConnections: number;
  activeConnections: number;
  inactiveConnections: number;
  totalUsageCount: number;
  connectionsByStatus?: {
    active: number;
    expired: number;
    error: number;
    revoked: number;
    archived: number;
  };
  mostUsedConnections: Array<{
    connectionId: string;
    integrationId: string;
    displayName?: string;
    usageCount: number;
    lastUsedAt?: string;
  }>;
  recentlyUsedConnections: Array<{
    connectionId: string;
    integrationId: string;
    displayName?: string;
    lastUsedAt: string;
  }>;
  unusedConnections: Array<{
    connectionId: string;
    integrationId: string;
    displayName?: string;
    createdAt: string;
  }>;
}

export interface BulkDeleteConnectionsRequest {
  connectionIds: string[];
}

export interface BulkDeleteConnectionsResponse {
  successCount: number;
  failureCount: number;
  results: Array<{
    connectionId: string;
    success: boolean;
    error?: string;
  }>;
}

export interface BulkTestConnectionsRequest {
  connectionIds: string[];
}

export interface BulkTestConnectionsResponse {
  successCount: number;
  failureCount: number;
  results: Array<{
    connectionId: string;
    success: boolean;
    error?: string;
    details?: any;
  }>;
}

/**
 * Get user connections for an integration
 */
async function getUserConnections(integrationId: string): Promise<UserConnection[]> {
  await ensureAuth();
  try {
    const { data } = await apiClient.get<UserConnectionsResponse>(
      `/api/integrations/${integrationId}/connections`
    );
    return data.connections;
  } catch (error) {
    const errorMessage = handleApiError(error);
    if (isRateLimitError(errorMessage)) {
      throw errorMessage;
    }
    throw new Error(typeof errorMessage === 'string' ? errorMessage : (errorMessage as any).message || 'An error occurred');
  }
}

/**
 * Create a user connection for an integration
 */
async function createUserConnection(
  integrationId: string,
  request: CreateUserConnectionRequest
): Promise<UserConnection> {
  await ensureAuth();
  try {
    const { data } = await apiClient.post<{ connection: UserConnection }>(
      `/api/integrations/${integrationId}/connections`,
      request
    );
    return data.connection;
  } catch (error) {
    const errorMessage = handleApiError(error);
    if (isRateLimitError(errorMessage)) {
      throw errorMessage;
    }
    throw new Error(typeof errorMessage === 'string' ? errorMessage : (errorMessage as any).message || 'An error occurred');
  }
}

/**
 * Update a user connection
 */
async function updateUserConnection(
  integrationId: string,
  connectionId: string,
  request: UpdateUserConnectionRequest
): Promise<UserConnection> {
  await ensureAuth();
  try {
    const { data } = await apiClient.patch<{ connection: UserConnection }>(
      `/api/integrations/${integrationId}/connections/${connectionId}`,
      request
    );
    return data.connection;
  } catch (error) {
    const errorMessage = handleApiError(error);
    if (isRateLimitError(errorMessage)) {
      throw errorMessage;
    }
    throw new Error(typeof errorMessage === 'string' ? errorMessage : (errorMessage as any).message || 'An error occurred');
  }
}

/**
 * Delete a user connection
 */
async function deleteUserConnection(integrationId: string, connectionId: string): Promise<void> {
  await ensureAuth();
  try {
    await apiClient.delete(`/api/integrations/${integrationId}/connections/${connectionId}`);
  } catch (error) {
    const errorMessage = handleApiError(error);
    if (isRateLimitError(errorMessage)) {
      throw errorMessage;
    }
    throw new Error(typeof errorMessage === 'string' ? errorMessage : (errorMessage as any).message || 'An error occurred');
  }
}

/**
 * Test a user connection
 */
async function testUserConnection(
  integrationId: string,
  connectionId: string
): Promise<TestConnectionResponse> {
  await ensureAuth();
  try {
    const { data } = await apiClient.post<TestConnectionResponse>(
      `/api/integrations/${integrationId}/connections/${connectionId}/test`
    );
    return data;
  } catch (error) {
    const errorMessage = handleApiError(error);
    if (isRateLimitError(errorMessage)) {
      throw errorMessage;
    }
    throw new Error(typeof errorMessage === 'string' ? errorMessage : (errorMessage as any).message || 'An error occurred');
  }
}

/**
 * Get connection usage statistics
 */
async function getConnectionUsageStats(integrationId: string): Promise<ConnectionUsageStats> {
  await ensureAuth();
  try {
    const { data } = await apiClient.get<ConnectionUsageStats>(
      `/api/integrations/${integrationId}/connections/stats`
    );
    return data;
  } catch (error) {
    const errorMessage = handleApiError(error);
    if (isRateLimitError(errorMessage)) {
      throw errorMessage;
    }
    throw new Error(typeof errorMessage === 'string' ? errorMessage : (errorMessage as any).message || 'An error occurred');
  }
}

/**
 * Bulk delete user connections
 */
async function bulkDeleteUserConnections(
  integrationId: string,
  request: BulkDeleteConnectionsRequest
): Promise<BulkDeleteConnectionsResponse> {
  await ensureAuth();
  try {
    const { data } = await apiClient.post<BulkDeleteConnectionsResponse>(
      `/api/integrations/${integrationId}/connections/bulk/delete`,
      request
    );
    return data;
  } catch (error) {
    const errorMessage = handleApiError(error);
    if (isRateLimitError(errorMessage)) {
      throw errorMessage;
    }
    throw new Error(typeof errorMessage === 'string' ? errorMessage : (errorMessage as any).message || 'An error occurred');
  }
}

/**
 * Bulk test user connections
 */
async function bulkTestUserConnections(
  integrationId: string,
  request: BulkTestConnectionsRequest
): Promise<BulkTestConnectionsResponse> {
  await ensureAuth();
  try {
    const { data } = await apiClient.post<BulkTestConnectionsResponse>(
      `/api/integrations/${integrationId}/connections/bulk/test`,
      request
    );
    return data;
  } catch (error) {
    const errorMessage = handleApiError(error);
    if (isRateLimitError(errorMessage)) {
      throw errorMessage;
    }
    throw new Error(typeof errorMessage === 'string' ? errorMessage : (errorMessage as any).message || 'An error occurred');
  }
}

export function useUserConnections(
  integrationId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['integration-connections', integrationId],
    queryFn: () => getUserConnections(integrationId),
    enabled: options?.enabled !== false && !!integrationId,
  });
}

export function useCreateUserConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, data }: { integrationId: string; data: CreateUserConnectionRequest }) => {
      return createUserConnection(integrationId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration-connections', variables.integrationId] });
    },
  });
}

export function useUpdateUserConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integrationId,
      connectionId,
      data,
    }: {
      integrationId: string;
      connectionId: string;
      data: UpdateUserConnectionRequest;
    }) => {
      return updateUserConnection(integrationId, connectionId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration-connections', variables.integrationId] });
    },
  });
}

export function useDeleteUserConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, connectionId }: { integrationId: string; connectionId: string }) => {
      return deleteUserConnection(integrationId, connectionId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration-connections', variables.integrationId] });
    },
  });
}

export function useTestUserConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, connectionId }: { integrationId: string; connectionId: string }) => {
      return testUserConnection(integrationId, connectionId);
    },
    onSuccess: (_, variables) => {
      // Invalidate connections list to refresh status and validationError after test
      queryClient.invalidateQueries({ queryKey: ['integration-connections', variables.integrationId] });
    },
  });
}

export function useConnectionUsageStats(
  integrationId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['integration-connection-stats', integrationId],
    queryFn: () => getConnectionUsageStats(integrationId),
    enabled: options?.enabled !== false && !!integrationId,
  });
}

export function useBulkDeleteUserConnections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integrationId,
      connectionIds,
    }: {
      integrationId: string;
      connectionIds: string[];
    }) => {
      return bulkDeleteUserConnections(integrationId, { connectionIds });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration-connections', variables.integrationId] });
      queryClient.invalidateQueries({ queryKey: ['integration-connection-stats', variables.integrationId] });
    },
  });
}

export function useBulkTestUserConnections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integrationId,
      connectionIds,
    }: {
      integrationId: string;
      connectionIds: string[];
    }) => {
      return bulkTestUserConnections(integrationId, { connectionIds });
    },
    onSuccess: (_, variables) => {
      // Invalidate connections list to refresh status and validationError after test
      queryClient.invalidateQueries({ queryKey: ['integration-connections', variables.integrationId] });
    },
  });
}








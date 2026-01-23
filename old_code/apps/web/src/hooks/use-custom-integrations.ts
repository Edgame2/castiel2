'use client';

/**
 * React Query hooks for Custom Integrations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listCustomIntegrations,
  getCustomIntegration,
  createCustomIntegration,
  updateCustomIntegration,
  deleteCustomIntegration,
  testIntegrationConnection,
  testEndpoint,
  executeEndpoint,
  getWebhookUrl,
  regenerateWebhookSecret,
  CustomIntegration,
  CreateCustomIntegrationRequest,
  UpdateCustomIntegrationRequest,
  TestResult,
  ExecuteResult,
} from '@/lib/api/custom-integrations';

// ============================================
// Query Keys
// ============================================

export const customIntegrationKeys = {
  all: ['custom-integrations'] as const,
  lists: () => [...customIntegrationKeys.all, 'list'] as const,
  list: (filters: { status?: string; type?: string }) =>
    [...customIntegrationKeys.lists(), filters] as const,
  details: () => [...customIntegrationKeys.all, 'detail'] as const,
  detail: (id: string) => [...customIntegrationKeys.details(), id] as const,
  webhookUrl: (id: string) => [...customIntegrationKeys.detail(id), 'webhook-url'] as const,
};

// ============================================
// Queries
// ============================================

/**
 * List custom integrations
 */
export function useCustomIntegrations(filters?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: customIntegrationKeys.list(filters || {}),
    queryFn: () => listCustomIntegrations(filters),
  });
}

/**
 * Get single custom integration
 */
export function useCustomIntegration(id: string | undefined) {
  return useQuery({
    queryKey: customIntegrationKeys.detail(id!),
    queryFn: () => getCustomIntegration(id!),
    enabled: !!id,
  });
}

/**
 * Get webhook URL for integration
 */
export function useWebhookUrl(id: string | undefined) {
  return useQuery({
    queryKey: customIntegrationKeys.webhookUrl(id!),
    queryFn: () => getWebhookUrl(id!),
    enabled: !!id,
  });
}

// ============================================
// Mutations
// ============================================

/**
 * Create custom integration
 */
export function useCreateCustomIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomIntegrationRequest) => createCustomIntegration(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customIntegrationKeys.lists() });
    },
  });
}

/**
 * Update custom integration
 */
export function useUpdateCustomIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomIntegrationRequest }) =>
      updateCustomIntegration(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: customIntegrationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customIntegrationKeys.detail(id) });
    },
  });
}

/**
 * Delete custom integration
 */
export function useDeleteCustomIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCustomIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customIntegrationKeys.lists() });
    },
  });
}

/**
 * Test integration connection
 */
export function useTestConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => testIntegrationConnection(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: customIntegrationKeys.detail(id) });
    },
  });
}

/**
 * Test specific endpoint
 */
export function useTestEndpoint() {
  return useMutation({
    mutationFn: ({
      integrationId,
      endpointId,
      params,
      body,
    }: {
      integrationId: string;
      endpointId: string;
      params?: Record<string, unknown>;
      body?: unknown;
    }) => testEndpoint(integrationId, endpointId, params, body),
  });
}

/**
 * Execute endpoint
 */
export function useExecuteEndpoint() {
  return useMutation({
    mutationFn: ({
      integrationId,
      endpointId,
      params,
      body,
      createShards,
    }: {
      integrationId: string;
      endpointId: string;
      params?: Record<string, unknown>;
      body?: unknown;
      createShards?: boolean;
    }) => executeEndpoint(integrationId, endpointId, { params, body, createShards }),
  });
}

/**
 * Regenerate webhook secret
 */
export function useRegenerateWebhookSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => regenerateWebhookSecret(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: customIntegrationKeys.webhookUrl(id) });
      queryClient.invalidateQueries({ queryKey: customIntegrationKeys.detail(id) });
    },
  });
}

// ============================================
// Helper Types
// ============================================

export type { CustomIntegration, TestResult, ExecuteResult };












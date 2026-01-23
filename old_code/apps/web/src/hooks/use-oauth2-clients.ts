/**
 * React Query hooks for OAuth2 client management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listOAuth2Clients,
  getOAuth2Client,
  createOAuth2Client,
  updateOAuth2Client,
  deleteOAuth2Client,
  rotateOAuth2ClientSecret,
  listOAuth2Scopes,
  type OAuth2Client,
  type OAuth2ClientWithSecret,
  type CreateOAuth2ClientRequest,
  type UpdateOAuth2ClientRequest,
  type OAuth2Scope,
} from '@/lib/api/oauth2-clients'

// ============================================
// Query Keys
// ============================================

export const oauth2ClientKeys = {
  all: ['oauth2-clients'] as const,
  lists: () => [...oauth2ClientKeys.all, 'list'] as const,
  list: (tenantId: string) => [...oauth2ClientKeys.lists(), tenantId] as const,
  details: () => [...oauth2ClientKeys.all, 'detail'] as const,
  detail: (tenantId: string, clientId: string) =>
    [...oauth2ClientKeys.details(), tenantId, clientId] as const,
  scopes: () => [...oauth2ClientKeys.all, 'scopes'] as const,
}

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to list OAuth2 clients for a tenant
 */
export function useOAuth2Clients(tenantId: string, limit?: number) {
  return useQuery({
    queryKey: oauth2ClientKeys.list(tenantId),
    queryFn: () => listOAuth2Clients(tenantId, limit),
    enabled: !!tenantId,
  })
}

/**
 * Hook to get a single OAuth2 client
 */
export function useOAuth2Client(tenantId: string, clientId: string | undefined) {
  return useQuery({
    queryKey: oauth2ClientKeys.detail(tenantId, clientId!),
    queryFn: () => getOAuth2Client(tenantId, clientId!),
    enabled: !!tenantId && !!clientId,
  })
}

/**
 * Hook to list available OAuth2 scopes
 */
export function useOAuth2Scopes() {
  return useQuery({
    queryKey: oauth2ClientKeys.scopes(),
    queryFn: () => listOAuth2Scopes(),
  })
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to create an OAuth2 client
 */
export function useCreateOAuth2Client(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateOAuth2ClientRequest) => createOAuth2Client(tenantId, data),
    onSuccess: (data) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: oauth2ClientKeys.lists() })
      // Set detail query
      queryClient.setQueryData(oauth2ClientKeys.detail(tenantId, data.id), data)
      toast.success('OAuth2 client created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create OAuth2 client: ${error.message}`)
    },
  })
}

/**
 * Hook to update an OAuth2 client
 */
export function useUpdateOAuth2Client(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ clientId, data }: { clientId: string; data: UpdateOAuth2ClientRequest }) =>
      updateOAuth2Client(tenantId, clientId, data),
    onSuccess: (data, variables) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: oauth2ClientKeys.lists() })
      // Update detail query
      queryClient.setQueryData(oauth2ClientKeys.detail(tenantId, variables.clientId), data)
      toast.success('OAuth2 client updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update OAuth2 client: ${error.message}`)
    },
  })
}

/**
 * Hook to delete an OAuth2 client
 */
export function useDeleteOAuth2Client(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (clientId: string) => deleteOAuth2Client(tenantId, clientId),
    onSuccess: (_, clientId) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: oauth2ClientKeys.lists() })
      // Remove detail query
      queryClient.removeQueries({ queryKey: oauth2ClientKeys.detail(tenantId, clientId) })
      toast.success('OAuth2 client deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete OAuth2 client: ${error.message}`)
    },
  })
}

/**
 * Hook to rotate OAuth2 client secret
 */
export function useRotateOAuth2ClientSecret(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (clientId: string) => rotateOAuth2ClientSecret(tenantId, clientId),
    onSuccess: (data, clientId) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: oauth2ClientKeys.lists() })
      // Update detail query
      queryClient.setQueryData(oauth2ClientKeys.detail(tenantId, clientId), data)
      toast.success('Client secret rotated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to rotate client secret: ${error.message}`)
    },
  })
}









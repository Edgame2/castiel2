'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

/**
 * Permission levels for ACL
 */
export type PermissionLevel = 'read' | 'write' | 'delete' | 'admin';

/**
 * Grant permission request
 */
export interface GrantPermissionRequest {
  shardId: string;
  userId?: string;
  roleId?: string;
  permissions: PermissionLevel[];
}

/**
 * Revoke permission request
 */
export interface RevokePermissionRequest {
  shardId: string;
  userId?: string;
  roleId?: string;
  permissions?: PermissionLevel[]; // If not specified, revoke all
}

/**
 * Hook for ACL operations
 */
export function useACL() {
  const queryClient = useQueryClient();

  // Grant permissions mutation
  const grantPermissionMutation = useMutation({
    mutationFn: async (request: GrantPermissionRequest) => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        '/api/v1/acl/grant',
        request
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['document', variables.shardId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Permissions granted successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to grant permissions';
      toast.error(message);
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Grant permission error', 3, {
        errorMessage: errorObj.message,
        shardId: error.config?.data ? JSON.parse(error.config.data)?.shardId : undefined,
      })
    },
  });

  // Revoke permissions mutation
  const revokePermissionMutation = useMutation({
    mutationFn: async (request: RevokePermissionRequest) => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        '/api/v1/acl/revoke',
        request
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['document', variables.shardId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Permissions revoked successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to revoke permissions';
      toast.error(message);
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Revoke permission error', 3, {
        errorMessage: errorObj.message,
        shardId: error.config?.data ? JSON.parse(error.config.data)?.shardId : undefined,
      })
    },
  });

  return {
    grantPermission: grantPermissionMutation.mutateAsync,
    revokePermission: revokePermissionMutation.mutateAsync,
    isGranting: grantPermissionMutation.isPending,
    isRevoking: revokePermissionMutation.isPending,
  };
}






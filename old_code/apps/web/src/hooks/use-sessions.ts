/**
 * Session Management Hooks
 * React Query hooks for managing user sessions
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSessions,
  getUserSessions,
  getSessionDetails,
  revokeSession,
  revokeAllSessions,
  adminRevokeAllSessions,
  type Session,
  type SessionDetails,
  type ListSessionsResponse,
} from '@/lib/api/sessions';

// Query keys
export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (tenantId: string, userId: string) =>
    [...sessionKeys.lists(), tenantId, userId] as const,
  details: () => [...sessionKeys.all, 'detail'] as const,
  detail: (sessionId: string) => [...sessionKeys.details(), sessionId] as const,
};

/**
 * Hook to fetch current user's sessions
 */
export function useSessions(tenantId: string, userId: string, sessionId?: string) {
  return useQuery<ListSessionsResponse, Error>({
    queryKey: sessionKeys.list(tenantId, userId),
    queryFn: () => getSessions(tenantId, userId, sessionId),
    enabled: !!tenantId && !!userId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch a specific user's sessions (admin)
 */
export function useUserSessions(tenantId: string, userId: string) {
  return useQuery<ListSessionsResponse, Error>({
    queryKey: sessionKeys.list(tenantId, userId),
    queryFn: () => getUserSessions(tenantId, userId),
    enabled: !!tenantId && !!userId,
    staleTime: 30000,
  });
}

/**
 * Hook to fetch session details
 */
export function useSessionDetails(
  sessionId: string,
  tenantId: string,
  userId: string
) {
  return useQuery<SessionDetails, Error>({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: () => getSessionDetails(sessionId, tenantId, userId),
    enabled: !!sessionId && !!tenantId && !!userId,
  });
}

/**
 * Hook to revoke a single session
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      tenantId,
      userId,
    }: {
      sessionId: string;
      tenantId: string;
      userId: string;
    }) => revokeSession(sessionId, tenantId, userId),
    onSuccess: (data, variables) => {
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      
      toast.success('Session revoked', {
        description: 'The session has been successfully revoked.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to revoke session', {
        description: error.message || 'An error occurred while revoking the session.',
      });
    },
  });
}

/**
 * Hook to revoke all sessions except current
 */
export function useRevokeAllSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      userId,
      currentSessionId,
    }: {
      tenantId: string;
      userId: string;
      currentSessionId?: string;
    }) => revokeAllSessions(tenantId, userId, currentSessionId),
    onSuccess: (data) => {
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      
      toast.success('All sessions revoked', {
        description: `${data.revokedCount} session(s) have been revoked.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to revoke sessions', {
        description: error.message || 'An error occurred while revoking sessions.',
      });
    },
  });
}

/**
 * Hook for admin to revoke all user sessions
 */
export function useAdminRevokeAllSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      userId,
    }: {
      tenantId: string;
      userId: string;
    }) => adminRevokeAllSessions(tenantId, userId),
    onSuccess: (data, variables) => {
      // Invalidate sessions list
      queryClient.invalidateQueries({
        queryKey: sessionKeys.list(variables.tenantId, variables.userId),
      });
      
      toast.success('All user sessions revoked', {
        description: `${data.revokedCount} session(s) have been force-revoked.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to revoke user sessions', {
        description: error.message || 'An error occurred while revoking user sessions.',
      });
    },
  });
}

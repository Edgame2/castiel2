/**
 * User Security Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userSecurityApi } from '@/lib/api/user-security'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'

// Query keys
export const userSecurityKeys = {
  all: ['user-security'] as const,
  status: (userId: string) => [...userSecurityKeys.all, 'status', userId] as const,
}

/**
 * Hook to fetch user security status
 */
export function useUserSecurity(userId: string) {
  return useQuery({
    queryKey: userSecurityKeys.status(userId),
    queryFn: () => userSecurityApi.getStatus(userId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!userId,
  })
}

/**
 * Hook to force password reset
 */
export function useForcePasswordReset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, sendEmail }: { userId: string; sendEmail?: boolean }) =>
      userSecurityApi.forcePasswordReset(userId, sendEmail),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userSecurityKeys.status(userId) })
      toast.success('Password reset initiated')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to reset password: ${message}`)
    },
  })
}

/**
 * Hook to revoke user sessions
 */
export function useRevokeSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => userSecurityApi.revokeSessions(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: userSecurityKeys.status(userId) })
      toast.success('All sessions revoked')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to revoke sessions: ${message}`)
    },
  })
}

/**
 * Hook to disable MFA
 */
export function useDisableMFA() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, method }: { userId: string; method?: string }) =>
      userSecurityApi.disableMFA(userId, method),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userSecurityKeys.status(userId) })
      toast.success('MFA disabled')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to disable MFA: ${message}`)
    },
  })
}

/**
 * Hook to lock user account
 */
export function useLockAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      userSecurityApi.lockAccount(userId, reason),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userSecurityKeys.status(userId) })
      toast.success('Account locked')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to lock account: ${message}`)
    },
  })
}

/**
 * Hook to unlock user account
 */
export function useUnlockAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => userSecurityApi.unlockAccount(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: userSecurityKeys.status(userId) })
      toast.success('Account unlocked')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to unlock account: ${message}`)
    },
  })
}


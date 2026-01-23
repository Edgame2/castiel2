import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '@/lib/api/users'
import { CreateUserDto, UpdateUserDto, InviteUserDto, AdminPasswordResetRequest } from '@/types/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  activity: (id: string) => [...userKeys.all, 'activity', id] as const,
}

/**
 * Hook to fetch paginated users with filters
 */
export function useUsers(params?: {
  page?: number
  limit?: number
  search?: string
  role?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userApi.getUsers(params),
  })
}

/**
 * Hook to fetch a single user
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userApi.getUser(id),
    enabled: !!id,
  })
}

/**
 * Hook to fetch user activity log
 */
export function useUserActivity(id: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: userKeys.activity(id),
    queryFn: () => userApi.getUserActivity(id, params),
    enabled: !!id,
  })
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserDto) => userApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      toast.success('User created successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to update a user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      userApi.updateUser(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) })
      toast.success('User updated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => userApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      toast.success('User deleted successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to activate a user
 */
export function useActivateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => userApi.activateUser(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) })
      toast.success('User activated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to deactivate a user
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => userApi.deactivateUser(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) })
      toast.success('User deactivated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to reset user password (admin)
 */
export function useAdminPasswordReset() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: AdminPasswordResetRequest }) =>
      userApi.adminPasswordReset(id, data),
    onSuccess: () => {
      toast.success('Password reset email sent successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to invite a user
 */
export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: InviteUserDto) => userApi.inviteUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      toast.success('Invitation sent successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

/**
 * Hook to toggle user status (kept for backward compatibility)
 * @deprecated Use useActivateUser or useDeactivateUser instead
 */
export function useToggleUserStatus() {
  const queryClient = useQueryClient()
  const activate = useActivateUser()
  const deactivate = useDeactivateUser()

  return useMutation({
    mutationFn: async (id: string) => {
      // Get current user to determine action
      const user = await userApi.getUser(id)
      if (user.status === 'active') {
        return deactivate.mutateAsync(id)
      } else {
        return activate.mutateAsync(id)
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) })
    },
  })
}

/**
 * Hook to bulk delete users
 */
/**
 * Hook for bulk user operations
 */
export function useBulkUserOperation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      action,
      userIds,
      role
    }: {
      action: 'activate' | 'deactivate' | 'delete' | 'add-role' | 'remove-role' | 'send-password-reset',
      userIds: string[],
      role?: string
    }) => userApi.bulkOperation(action, userIds, role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      toast.success(`Operation completed: ${data.successCount} succeeded, ${data.failureCount} failed`)
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(typeof message === 'string' ? message : message.message || 'An error occurred')
    },
  })
}

import apiClient from './client'
import {
  User,
  UserListResponse,
  CreateUserDto,
  UpdateUserDto,
  InviteUserDto,
  InviteUserResponse,
  AdminPasswordResetRequest,
  AdminPasswordResetResponse,
  UserActivityResponse,
} from '@/types/api'

/**
 * Get tenant ID from local storage
 */
function getTenantId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('tenantId') || ''
}

// User API endpoints
export const userApi = {
  /**
   * Get paginated list of users with filters
   */
  getUsers: async (params?: {
    page?: number
    limit?: number
    search?: string
    role?: string
    status?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<UserListResponse> => {
    const tenantId = getTenantId()
    const response = await apiClient.get<UserListResponse>(
      `/api/tenants/${tenantId}/users`,
      { params }
    )
    return response.data
  },

  /**
   * Get a single user by ID
   */
  getUser: async (id: string): Promise<User> => {
    const tenantId = getTenantId()
    const response = await apiClient.get<User>(`/api/tenants/${tenantId}/users/${id}`)
    return response.data
  },

  /**
   * Create a new user
   */
  createUser: async (data: CreateUserDto): Promise<User> => {
    const tenantId = getTenantId()
    const response = await apiClient.post<User>(`/api/tenants/${tenantId}/users`, data)
    return response.data
  },

  /**
   * Update an existing user
   */
  updateUser: async (id: string, data: UpdateUserDto): Promise<User> => {
    const tenantId = getTenantId()
    const response = await apiClient.patch<User>(
      `/api/tenants/${tenantId}/users/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete a user (soft delete)
   */
  deleteUser: async (id: string): Promise<void> => {
    const tenantId = getTenantId()
    await apiClient.delete(`/api/tenants/${tenantId}/users/${id}`)
  },

  /**
   * Activate a user account
   */
  activateUser: async (id: string): Promise<User> => {
    const tenantId = getTenantId()
    const response = await apiClient.post<User>(
      `/api/tenants/${tenantId}/users/${id}/activate`
    )
    return response.data
  },

  /**
   * Deactivate a user account (suspend)
   */
  deactivateUser: async (id: string): Promise<User> => {
    const tenantId = getTenantId()
    const response = await apiClient.post<User>(
      `/api/tenants/${tenantId}/users/${id}/deactivate`
    )
    return response.data
  },

  /**
   * Admin password reset - generate reset token
   */
  adminPasswordReset: async (
    id: string,
    data?: AdminPasswordResetRequest
  ): Promise<AdminPasswordResetResponse> => {
    const tenantId = getTenantId()
    const response = await apiClient.post<AdminPasswordResetResponse>(
      `/api/tenants/${tenantId}/users/${id}/reset-password`,
      data || { sendEmail: true }
    )
    return response.data
  },

  /**
   * Get user activity log
   */
  getUserActivity: async (
    id: string,
    params?: { page?: number; limit?: number }
  ): Promise<UserActivityResponse> => {
    const tenantId = getTenantId()
    const response = await apiClient.get<UserActivityResponse>(
      `/api/tenants/${tenantId}/users/${id}/activity`,
      { params }
    )
    return response.data
  },

  /**
   * Invite a user
   */
  inviteUser: async (data: InviteUserDto): Promise<InviteUserResponse> => {
    const tenantId = getTenantId()
    const response = await apiClient.post<InviteUserResponse>(
      `/api/tenants/${tenantId}/invitations`,
      data
    )
    return response.data
  },

  /**
   * Bulk operations
   */
  bulkOperation: async (
    action: 'activate' | 'deactivate' | 'delete' | 'add-role' | 'remove-role' | 'send-password-reset',
    userIds: string[],
    role?: string
  ): Promise<{ successCount: number; failureCount: number; results: any[] }> => {
    const tenantId = getTenantId()
    const response = await apiClient.post(
      `/api/tenants/${tenantId}/users/bulk`,
      { action, userIds, role }
    )
    return response.data
  },

  /**
   * Import users from CSV
   */
  importUsers: async (file: File): Promise<{ message: string; added: number; failed: number; errors: any[] }> => {
    const tenantId = getTenantId()

    // Convert file to base64
    const fileContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await apiClient.post(
      `/api/tenants/${tenantId}/users/import`,
      { fileContent }
    )
    return response.data
  },
}

export default userApi

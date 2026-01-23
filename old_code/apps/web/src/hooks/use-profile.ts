/**
 * Profile Hooks
 * React Query hooks for user profile management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getProfile,
  updateProfile,
  type UserProfile,
  type ProfileUpdateData,
} from '@/lib/api/profile'

// Query keys
export const profileKeys = {
  all: ['profile'] as const,
  current: () => [...profileKeys.all, 'current'] as const,
  activity: () => [...profileKeys.all, 'activity'] as const,
  notifications: () => [...profileKeys.all, 'notifications'] as const,
}

/**
 * Hook to fetch current user's profile
 */
export function useProfile() {
  return useQuery<UserProfile, Error>({
    queryKey: profileKeys.current(),
    queryFn: getProfile,
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  })
}

/**
 * Hook to update profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProfileUpdateData) => updateProfile(data),
    onSuccess: (updatedProfile) => {
      // Update cache with new data
      queryClient.setQueryData(profileKeys.current(), updatedProfile)
      toast.success('Profile updated', {
        description: 'Your profile has been updated successfully.',
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to update profile', {
        description: error.message || 'An error occurred while updating your profile.',
      })
    },
  })
}

/**
 * Password change data
 */
export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

/**
 * Hook to change password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to change password' }))
        throw new Error(error.message || 'Failed to change password')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Password changed', {
        description: 'Your password has been changed successfully.',
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to change password', {
        description: error.message || 'An error occurred while changing your password.',
      })
    },
  })
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  emailNotifications: boolean
  securityAlerts: boolean
  productUpdates: boolean
  weeklyDigest: boolean
  mentionNotifications: boolean
}

/**
 * Hook to fetch notification preferences
 */
export function useNotificationPreferences() {
  return useQuery<NotificationPreferences, Error>({
    queryKey: profileKeys.notifications(),
    queryFn: async () => {
      const response = await fetch('/api/profile/notifications', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch preferences' }))
        throw new Error(error.message || 'Failed to fetch notification preferences')
      }
      return response.json()
    },
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<NotificationPreferences>) => {
      const response = await fetch('/api/profile/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update preferences' }))
        throw new Error(error.message || 'Failed to update notification preferences')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.notifications(), data)
      toast.success('Preferences updated', {
        description: 'Your notification preferences have been saved.',
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to update preferences', {
        description: error.message || 'An error occurred while saving preferences.',
      })
    },
  })
}

/**
 * Activity log entry
 */
export interface ProfileActivityEntry {
  id: string
  action: string
  description: string
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

/**
 * Hook to fetch user activity
 */
export function useProfileActivity(limit = 10) {
  return useQuery<ProfileActivityEntry[], Error>({
    queryKey: [...profileKeys.activity(), limit],
    queryFn: async () => {
      const response = await fetch(`/api/profile/activity?limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch activity' }))
        throw new Error(error.message || 'Failed to fetch activity log')
      }
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Re-export types
export type { UserProfile, ProfileUpdateData }

/**
 * Magic Link Hooks
 * 
 * React Query hooks for passwordless authentication via magic links
 */

import { useMutation } from '@tanstack/react-query'
import { magicLinkApi } from '@/lib/api/magic-link'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'
import type { RequestMagicLinkRequest } from '@/types/magic-link'

/**
 * Hook to request a magic link
 */
export function useRequestMagicLink() {
  return useMutation({
    mutationFn: (data: RequestMagicLinkRequest) => magicLinkApi.requestMagicLink(data),
    onSuccess: (data) => {
      toast.success(data.message || 'Check your email for the login link')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to send magic link: ${message}`)
    },
  })
}

/**
 * Hook to verify a magic link token
 */
export function useVerifyMagicLink() {
  return useMutation({
    mutationFn: (token: string) => magicLinkApi.verifyMagicLink(token),
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Magic link verification failed: ${message}`)
    },
  })
}


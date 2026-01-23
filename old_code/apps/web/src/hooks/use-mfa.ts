/**
 * MFA Hooks
 * 
 * React Query hooks for Multi-Factor Authentication
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mfaApi } from '@/lib/api/mfa'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'
import type {
  VerifyTOTPRequest,
  EnrollSMSRequest,
  VerifySMSRequest,
  VerifyEmailRequest,
  DisableMFAMethodRequest,
  GenerateRecoveryCodesRequest,
  MFAChallengeRequest,
  UpdateMFAPolicyRequest,
} from '@/types/mfa'

// Query keys
export const mfaKeys = {
  all: ['mfa'] as const,
  methods: () => [...mfaKeys.all, 'methods'] as const,
  policy: () => [...mfaKeys.all, 'policy'] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch user's MFA methods
 */
export function useMFAMethods() {
  return useQuery({
    queryKey: mfaKeys.methods(),
    queryFn: () => mfaApi.listMFAMethods(),
  })
}

/**
 * Hook to fetch tenant MFA policy
 */
export function useMFAPolicy() {
  return useQuery({
    queryKey: mfaKeys.policy(),
    queryFn: () => mfaApi.getMFAPolicy(),
  })
}

// ============================================================================
// TOTP (Authenticator App) Hooks
// ============================================================================

/**
 * Hook to enroll TOTP
 */
export function useEnrollTOTP() {
  return useMutation({
    mutationFn: () => mfaApi.enrollTOTP(),
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to start TOTP enrollment: ${message}`)
    },
  })
}

/**
 * Hook to verify TOTP enrollment
 */
export function useVerifyTOTP() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: VerifyTOTPRequest) => mfaApi.verifyTOTP(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mfaKeys.methods() })
      toast.success('Authenticator app enrolled successfully')
      
      // Return recovery codes for display
      return data
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`TOTP verification failed: ${message}`)
    },
  })
}

// ============================================================================
// SMS Hooks
// ============================================================================

/**
 * Hook to enroll SMS
 */
export function useEnrollSMS() {
  return useMutation({
    mutationFn: (data: EnrollSMSRequest) => mfaApi.enrollSMS(data),
    onSuccess: () => {
      toast.success('SMS code sent')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to send SMS code: ${message}`)
    },
  })
}

/**
 * Hook to verify SMS enrollment
 */
export function useVerifySMS() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: VerifySMSRequest) => mfaApi.verifySMS(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mfaKeys.methods() })
      toast.success('SMS authentication enrolled successfully')
      
      return data
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`SMS verification failed: ${message}`)
    },
  })
}

// ============================================================================
// Email Hooks
// ============================================================================

/**
 * Hook to enroll Email
 */
export function useEnrollEmail() {
  return useMutation({
    mutationFn: () => mfaApi.enrollEmail(),
    onSuccess: () => {
      toast.success('Email code sent')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to send email code: ${message}`)
    },
  })
}

/**
 * Hook to verify Email enrollment
 */
export function useVerifyEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: VerifyEmailRequest) => mfaApi.verifyEmail(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mfaKeys.methods() })
      toast.success('Email authentication enrolled successfully')
      
      return data
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Email verification failed: ${message}`)
    },
  })
}

// ============================================================================
// Methods Management Hooks
// ============================================================================

/**
 * Hook to disable an MFA method
 */
export function useDisableMFAMethod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: DisableMFAMethodRequest) => mfaApi.disableMFAMethod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mfaKeys.methods() })
      toast.success('MFA method disabled successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to disable MFA method: ${message}`)
    },
  })
}

// ============================================================================
// Recovery Codes Hooks
// ============================================================================

/**
 * Hook to generate new recovery codes
 */
export function useGenerateRecoveryCodes() {
  return useMutation({
    mutationFn: (data: GenerateRecoveryCodesRequest) => mfaApi.generateRecoveryCodes(data),
    onSuccess: () => {
      toast.success('Recovery codes generated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to generate recovery codes: ${message}`)
    },
  })
}

// ============================================================================
// MFA Challenge (Login Flow) Hooks
// ============================================================================

/**
 * Hook to complete MFA challenge during login
 */
export function useCompleteMFAChallenge() {
  return useMutation({
    mutationFn: (data: MFAChallengeRequest) => mfaApi.completeMFAChallenge(data),
    onSuccess: (data) => {
      // Store tokens and redirect handled by login page
      return data
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`MFA verification failed: ${message}`)
    },
  })
}

/**
 * Hook to send MFA code during login challenge (for SMS/Email methods)
 */
export function useSendMFACode() {
  return useMutation({
    mutationFn: (data: { challengeToken: string; method: 'sms' | 'email' }) =>
      mfaApi.sendMFACode(data),
    onSuccess: (data) => {
      toast.success(data.message || 'Verification code sent')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to send code: ${message}`)
    },
  })
}

// ============================================================================
// Policy Management Hooks (Admin)
// ============================================================================

/**
 * Hook to update tenant MFA policy
 */
export function useUpdateMFAPolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateMFAPolicyRequest) => mfaApi.updateMFAPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mfaKeys.policy() })
      toast.success('MFA policy updated successfully')
    },
    onError: (error) => {
      const message = handleApiError(error)
      toast.error(`Failed to update MFA policy: ${message}`)
    },
  })
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to check if user has active MFA
 */
export function useHasActiveMFA() {
  const { data } = useMFAMethods()
  return data?.hasActiveMFA ?? false
}

/**
 * Hook to get available MFA methods for enrollment
 */
export function useAvailableMFAMethods() {
  const { data } = useMFAMethods()
  const enrolledTypes = data?.methods.map((m) => m.type) ?? []
  
  const allMethods = ['totp', 'sms', 'email'] as const
  return allMethods.filter((type) => !enrolledTypes.includes(type))
}

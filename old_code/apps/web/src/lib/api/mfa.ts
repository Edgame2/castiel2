/**
 * MFA API Client
 * 
 * API methods for Multi-Factor Authentication operations
 */

import apiClient from './client'
import type {
  EnrollTOTPResponse,
  VerifyTOTPRequest,
  VerifyTOTPResponse,
  EnrollSMSRequest,
  EnrollSMSResponse,
  VerifySMSRequest,
  VerifySMSResponse,
  EnrollEmailResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ListMFAMethodsResponse,
  DisableMFAMethodRequest,
  DisableMFAMethodResponse,
  GenerateRecoveryCodesRequest,
  GenerateRecoveryCodesResponse,
  MFAChallengeRequest,
  MFAChallengeResponse,
  GetMFAPolicyResponse,
  UpdateMFAPolicyRequest,
  UpdateMFAPolicyResponse,
} from '@/types/mfa'

/**
 * MFA API
 */
export const mfaApi = {
  // ============================================================================
  // TOTP (Authenticator App)
  // ============================================================================

  /**
   * Enroll TOTP - Generate secret and QR code
   */
  async enrollTOTP(): Promise<EnrollTOTPResponse> {
  const response = await apiClient.post('/api/auth/mfa/enroll/totp' as any)
    return response.data
  },

  /**
   * Verify TOTP enrollment with code
   */
  async verifyTOTP(data: VerifyTOTPRequest): Promise<VerifyTOTPResponse> {
  const response = await apiClient.post('/api/auth/mfa/verify/totp', data)
    return response.data
  },

  // ============================================================================
  // SMS
  // ============================================================================

  /**
   * Enroll SMS - Send OTP to phone number
   */
  async enrollSMS(data: EnrollSMSRequest): Promise<EnrollSMSResponse> {
  const response = await apiClient.post('/api/auth/mfa/enroll/sms', data)
    return response.data
  },

  /**
   * Verify SMS enrollment with code
   */
  async verifySMS(data: VerifySMSRequest): Promise<VerifySMSResponse> {
  const response = await apiClient.post('/api/auth/mfa/verify/sms', data)
    return response.data
  },

  // ============================================================================
  // Email
  // ============================================================================

  /**
   * Enroll Email - Send OTP to email
   */
  async enrollEmail(): Promise<EnrollEmailResponse> {
  const response = await apiClient.post('/api/auth/mfa/enroll/email' as any)
    return response.data
  },

  /**
   * Verify Email enrollment with code
   */
  async verifyEmail(data: VerifyEmailRequest): Promise<VerifyEmailResponse> {
  const response = await apiClient.post('/api/auth/mfa/verify/email', data)
    return response.data
  },

  // ============================================================================
  // Methods Management
  // ============================================================================

  /**
   * List user's MFA methods
   */
  async listMFAMethods(): Promise<ListMFAMethodsResponse> {
  const response = await apiClient.get('/api/v1/auth/mfa/methods' as any)
    return response.data
  },

  /**
   * Disable an MFA method
   */
  async disableMFAMethod(data: DisableMFAMethodRequest): Promise<DisableMFAMethodResponse> {
  const response = await apiClient.post('/api/auth/mfa/disable', data)
    return response.data
  },

  // ============================================================================
  // Recovery Codes
  // ============================================================================

  /**
   * Generate new recovery codes
   */
  async generateRecoveryCodes(data: GenerateRecoveryCodesRequest): Promise<GenerateRecoveryCodesResponse> {
  const response = await apiClient.post('/api/auth/mfa/recovery-codes', data)
    return response.data
  },

  // ============================================================================
  // MFA Challenge (Login Flow)
  // ============================================================================

  /**
   * Complete MFA challenge during login
   */
  async completeMFAChallenge(data: MFAChallengeRequest): Promise<MFAChallengeResponse> {
    const response = await apiClient.post('/api/auth/mfa/challenge', data)
    return response.data
  },

  /**
   * Send OTP code for SMS or Email during MFA challenge
   */
  async sendMFACode(data: { challengeToken: string; method: 'sms' | 'email' }): Promise<{
    success: boolean;
    method: string;
    message: string;
    expiresInSeconds: number;
  }> {
    const response = await apiClient.post('/api/auth/mfa/send-code', data)
    return response.data
  },

  // ============================================================================
  // Policy Management (Admin)
  // ============================================================================

  /**
   * Get tenant MFA policy
   */
  async getMFAPolicy(): Promise<GetMFAPolicyResponse> {
  const response = await apiClient.get('/api/auth/mfa/policy' as any)
    return response.data
  },

  /**
   * Update tenant MFA policy
   */
  async updateMFAPolicy(data: UpdateMFAPolicyRequest): Promise<UpdateMFAPolicyResponse> {
  const response = await apiClient.put('/api/auth/mfa/policy', data)
    return response.data
  },
}

export default mfaApi

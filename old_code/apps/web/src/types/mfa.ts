/**
 * MFA (Multi-Factor Authentication) Types for Frontend
 */

export type MFAMethodType = 'totp' | 'sms' | 'email'
export type MFAMethodStatus = 'active' | 'pending' | 'disabled'
export type MFAEnforcementLevel = 'off' | 'optional' | 'required'

/**
 * MFA Method
 */
export interface MFAMethod {
  type: MFAMethodType
  status: MFAMethodStatus
  enrolledAt: string
  lastUsedAt?: string
  phoneNumber?: string // For SMS (masked)
  email?: string // For email (masked)
}

/**
 * Recovery Code
 */
export interface MFARecoveryCode {
  code: string
  used: boolean
  usedAt?: string
}

/**
 * Trusted Device
 */
export interface TrustedDevice {
  id: string
  deviceFingerprint: string
  userAgent: string
  ipAddress?: string
  addedAt: string
  expiresAt: string
  lastUsedAt?: string
}

/**
 * MFA Policy (Tenant-level)
 */
export interface MFAPolicy {
  enforcement: MFAEnforcementLevel
  gracePeriodDays: number
  allowedMethods: MFAMethodType[]
  updatedBy?: string
  updatedAt?: string
}

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * Enroll TOTP Response
 */
export interface EnrollTOTPResponse {
  enrollmentToken: string
  secret: string
  qrCode: string
  manualEntryCode: string
}

/**
 * Verify TOTP Request
 */
export interface VerifyTOTPRequest {
  enrollmentToken: string
  code: string
}

/**
 * Verify TOTP Response
 */
export interface VerifyTOTPResponse {
  success: boolean
  recoveryCodes: string[]
  message: string
}

/**
 * Enroll SMS Request
 */
export interface EnrollSMSRequest {
  phoneNumber: string
}

/**
 * Enroll SMS Response
 */
export interface EnrollSMSResponse {
  enrollmentToken: string
  maskedPhone: string
  message: string
}

/**
 * Verify SMS Request
 */
export interface VerifySMSRequest {
  enrollmentToken: string
  code: string
}

/**
 * Verify SMS Response
 */
export interface VerifySMSResponse {
  success: boolean
  recoveryCodes: string[]
  message: string
}

/**
 * Enroll Email Response
 */
export interface EnrollEmailResponse {
  enrollmentToken: string
  maskedEmail: string
  message: string
}

/**
 * Verify Email Request
 */
export interface VerifyEmailRequest {
  enrollmentToken: string
  code: string
}

/**
 * Verify Email Response
 */
export interface VerifyEmailResponse {
  success: boolean
  recoveryCodes: string[]
  message: string
}

/**
 * List MFA Methods Response
 */
export interface ListMFAMethodsResponse {
  methods: MFAMethod[]
  hasActiveMFA: boolean
  trustedDevices: TrustedDevice[]
}

/**
 * Disable MFA Method Request
 */
export interface DisableMFAMethodRequest {
  methodType: MFAMethodType
  password?: string
  mfaCode?: string
}

/**
 * Disable MFA Method Response
 */
export interface DisableMFAMethodResponse {
  success: boolean
  message: string
}

/**
 * Generate Recovery Codes Request
 */
export interface GenerateRecoveryCodesRequest {
  password?: string
  mfaCode?: string
}

/**
 * Generate Recovery Codes Response
 */
export interface GenerateRecoveryCodesResponse {
  recoveryCodes: string[]
  message: string
}

/**
 * MFA Challenge Request (during login)
 */
export interface MFAChallengeRequest {
  challengeToken: string
  code: string
  method: MFAMethodType | 'recovery'
}

/**
 * MFA Challenge Response (during login)
 */
export interface MFAChallengeResponse {
  accessToken: string
  refreshToken: string
  expiresIn: string
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    tenantId: string
  }
}

/**
 * Get MFA Policy Response
 */
export interface GetMFAPolicyResponse {
  policy: MFAPolicy
}

/**
 * Update MFA Policy Request
 */
export interface UpdateMFAPolicyRequest {
  enforcement: MFAEnforcementLevel
  gracePeriodDays?: number
  allowedMethods?: MFAMethodType[]
}

/**
 * Update MFA Policy Response
 */
export interface UpdateMFAPolicyResponse {
  policy: MFAPolicy
  message: string
}

/**
 * Login Response with MFA Challenge
 */
export interface LoginResponseWithMFA {
  requiresMFA: boolean
  challengeToken?: string
  availableMethods?: MFAMethodType[]
  message?: string
  // Normal login fields (if no MFA)
  accessToken?: string
  refreshToken?: string
  expiresIn?: string
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    tenantId: string
  }
}

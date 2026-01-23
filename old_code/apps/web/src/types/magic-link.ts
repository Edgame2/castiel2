/**
 * Magic Link Authentication Types for Frontend
 */

/**
 * Request magic link request body
 */
export interface RequestMagicLinkRequest {
  email: string
  tenantId?: string
  returnUrl?: string
}

/**
 * Request magic link response
 */
export interface RequestMagicLinkResponse {
  success: boolean
  message: string
  expiresInSeconds: number
}

/**
 * Verify magic link response
 */
export interface VerifyMagicLinkResponse {
  accessToken: string
  refreshToken: string
  expiresIn: string
  returnUrl?: string
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    tenantId: string
    isDefaultTenant?: boolean
  }
}


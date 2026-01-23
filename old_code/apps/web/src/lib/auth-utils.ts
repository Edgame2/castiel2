/**
 * Authentication Utility Functions
 * 
 * DEPRECATED: These functions use localStorage which is vulnerable to XSS attacks.
 * Tokens are now stored in httpOnly cookies for security.
 * 
 * Migration: Use the API client (`apiClient` from '@/lib/api/client') which
 * automatically handles cookie-based authentication via `credentials: include`.
 * 
 * For direct token access (e.g., SSE/WebSocket), use `/api/auth/token` endpoint
 * which safely reads from httpOnly cookies.
 */

import { trackTrace, trackException } from '@/lib/monitoring/app-insights'

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

/**
 * Store authentication tokens
 * @deprecated Use `/api/auth/set-tokens` endpoint instead to set httpOnly cookies
 */
export function setAuthToken(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return
  
  trackTrace('[DEPRECATED] setAuthToken: Use /api/auth/set-tokens endpoint instead for secure cookie storage', 2, {
    function: 'setAuthToken',
  })
  // No-op: Tokens should be set via /api/auth/set-tokens endpoint
  // Keeping for backward compatibility during migration
}

/**
 * Get the access token
 * @deprecated Use `/api/auth/token` endpoint or apiClient which reads from httpOnly cookies
 */
export async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  
  trackTrace('[DEPRECATED] getAccessToken: Use /api/auth/token endpoint or apiClient instead', 2, {
    function: 'getAccessToken',
  })
  
  // Try to get from httpOnly cookies via API endpoint
  try {
    const response = await fetch('/api/auth/token', { credentials: 'include' })
    if (response.ok) {
      const data = await response.json()
      return data.token || null
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('Failed to get token from cookies', 3, {
      errorMessage: errorObj.message,
    })
  }
  
  return null
}

/**
 * Get the refresh token
 * @deprecated Refresh tokens are stored in httpOnly cookies and cannot be accessed from JavaScript
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  
  trackTrace('[DEPRECATED] getRefreshToken: Refresh tokens are in httpOnly cookies and cannot be accessed from JavaScript', 2, {
    function: 'getRefreshToken',
  })
  // Refresh tokens are in httpOnly cookies - cannot be accessed from JavaScript
  return null
}

/**
 * Clear authentication tokens
 * @deprecated Tokens are cleared via logout endpoint which clears httpOnly cookies
 */
export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return
  
  trackTrace('[DEPRECATED] clearAuthTokens: Use logout endpoint which clears httpOnly cookies', 2, {
    function: 'clearAuthTokens',
  })
  // Tokens are in httpOnly cookies - cleared via logout endpoint
  // Clear any legacy localStorage entries if they exist
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Check if user is authenticated (has tokens)
 * @deprecated Use AuthContext or check /api/auth/me endpoint
 */
export async function isAuthenticated(): Promise<boolean> {
  trackTrace('[DEPRECATED] isAuthenticated: Use AuthContext.isAuthenticated or check /api/auth/me endpoint', 2, {
    function: 'isAuthenticated',
  })
  
  try {
    const response = await fetch('/api/auth/me', { credentials: 'include' })
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Get authentication token for API requests
 * This function safely retrieves the token from httpOnly cookies via the API endpoint
 * Use this instead of localStorage.getItem('token')
 */
export async function getAuthTokenForRequest(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/token', { credentials: 'include' })
    if (response.ok) {
      const data = await response.json()
      return data.token || null
    }
    return null
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('Failed to get auth token', 3, {
      errorMessage: errorObj.message,
    })
    return null
  }
}


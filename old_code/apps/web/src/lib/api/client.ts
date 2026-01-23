import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { env } from '@/lib/env'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

// Token state
let cachedToken: string | null = null
let tokenPromise: Promise<string | null> | null = null
let authInitialized = false
let authInitializedPromise: Promise<void> | null = null

// Fetch and cache token
async function fetchToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/token')
    if (response.ok) {
      const data = await response.json()
      cachedToken = data.token || null
      return cachedToken
    }
  } catch {
    // Token fetch failed
  }
  return null
}

// Get token with deduplication
export async function getAuthToken(): Promise<string | null> {
  if (cachedToken) {
    return cachedToken
  }

  if (!tokenPromise) {
    tokenPromise = fetchToken().finally(() => {
      tokenPromise = null
    })
  }

  return tokenPromise
}

// Initialize token on app load
export async function initializeAuth(): Promise<void> {
  if (typeof window !== 'undefined' && !authInitialized) {
    if (!authInitializedPromise) {
      authInitializedPromise = (async () => {
        if (!cachedToken) {
          await getAuthToken()
        }
        authInitialized = true
      })()
    }
    await authInitializedPromise
  }
}

// Clear token cache (call on logout or token refresh)
export function clearTokenCache() {
  cachedToken = null
  tokenPromise = null
  authInitialized = false
  authInitializedPromise = null
}

// Check if auth has been initialized
export function isAuthInitialized(): boolean {
  return authInitialized
}

// Get current cached token synchronously
export function getCachedToken(): string | null {
  return cachedToken
}

// Create axios instance with default config
const apiBaseUrl =
  env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE_URL : undefined) ||
  'http://localhost:3001'

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// CSRF token cache
let csrfToken: string | null = null

// Helper to get CSRF token from cookie
function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf-token') {
      return decodeURIComponent(value)
    }
  }
  return null
}

// Request interceptor - add tenant context, Authorization header, CSRF token, and prevent caching
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      // Add Authorization header with token from httpOnly cookies
      const token = await getAuthToken()
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`
      }

      // Add CSRF token for state-changing operations
      const method = config.method?.toUpperCase()
      const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
      if (method && stateChangingMethods.includes(method)) {
        // Try to get CSRF token from cookie first
        const cookieToken = getCsrfTokenFromCookie()
        if (cookieToken) {
          csrfToken = cookieToken
        }
        
        // Include CSRF token in header if available
        if (csrfToken && config.headers) {
          config.headers['X-CSRF-Token'] = csrfToken
        }
      }

      // Add tenant context if available (optional header for multi-tenant routing)
      const tenantId = localStorage.getItem('tenantId')
      if (tenantId && config.headers) {
        config.headers['X-Tenant-ID'] = tenantId
      }

      // Prevent caching
      if (config.headers) {
        config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        config.headers['Pragma'] = 'no-cache'
      }

      // Log request for debugging (development only)
      if (process.env.NODE_ENV === 'development') {
        trackTrace(
          `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
          1, // Information level
          {
            method: config.method?.toUpperCase(),
            url: config.url,
            hasTenantId: !!tenantId,
            hasAuth: !!token,
            hasCsrfToken: !!csrfToken,
          }
        )
      }
    }
    return config
  },
  (error) => {
    // Track request interceptor errors
    if (error instanceof Error) {
      trackException(error, 3) // Error severity
      trackTrace('[API Request Error] Request interceptor failed', 3, {
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 500),
      })
    }
    return Promise.reject(error)
  }
)

// Set auth token directly
// DEPRECATED: With cookie-based authentication, this is no longer needed.
// Use the /api/auth/set-tokens endpoint instead to set httpOnly cookies.
export function setAuthToken(token: string | null) {
  // Kept for backward compatibility during migration
  cachedToken = token
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common['Authorization']
  }
}

// Ensure token is loaded before making requests
// DEPRECATED: With cookie-based authentication, this is no longer needed.
// Tokens are automatically sent via httpOnly cookies with credentials: include
export async function ensureAuth(): Promise<boolean> {
  // Initialize auth on app load if needed
  await initializeAuth()
  return true
}

// Response interceptor - handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Extract CSRF token from response header if present
    const csrfTokenHeader = response.headers['x-csrf-token']
    if (csrfTokenHeader && typeof csrfTokenHeader === 'string') {
      csrfToken = csrfTokenHeader
    }

    // Log successful responses (development only)
    if (process.env.NODE_ENV === 'development') {
      trackTrace(
        `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        1, // Information level
        {
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          dataSize: JSON.stringify(response.data).length,
        }
      )
    }
    
    // Validate response contract in development (optional, can be enabled via env var)
    // Note: Using dynamic import to avoid circular dependencies and reduce bundle size
    if (process.env.NEXT_PUBLIC_ENABLE_API_VALIDATION === 'true' || process.env.NODE_ENV === 'development') {
      // Use setTimeout to avoid blocking the response
      setTimeout(() => {
        import('./response-validator')
          .then(({ validateResponse }) => {
            const endpoint = response.config.url || 'unknown';
            const method = response.config.method?.toUpperCase() || 'GET';
            
            // Basic validation - check response structure
            const validation = validateResponse(
              response.data,
              response.data === null ? 'null' : (Array.isArray(response.data) ? 'array' : typeof response.data),
              endpoint
            );
            
            if (!validation.valid && validation.errors.length > 0) {
              trackTrace(
                '[API Contract Validation] Response validation failed',
                2, // Warning level
                {
                  endpoint,
                  method,
                  errors: validation.errors,
                }
              )
            }
          })
          .catch((validationError) => {
            // Don't fail requests if validation fails
            trackTrace(
              '[API Validation Error] Validation check failed',
              2, // Warning level
              {
                error: validationError instanceof Error ? validationError.message : String(validationError),
              }
            )
          });
      }, 0);
    }
    
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Extract response data safely
    let responseDataStr = 'no response data';
    if (error.response?.data) {
      try {
        responseDataStr = typeof error.response.data === 'string' 
          ? error.response.data 
          : JSON.stringify(error.response.data);
      } catch (e) {
        responseDataStr = String(error.response.data);
      }
    }

    // Log error responses with more details - build object with guaranteed values
    const errorInfo: any = {
      status: error.response?.status ?? null,
      statusText: error.response?.statusText ?? null,
      message: error.message || 'no message',
      responseData: responseDataStr,
      isRetry: originalRequest?._retry ?? false,
      code: error.code || 'no code',
      isAxiosError: error.isAxiosError ?? false,
      requestUrl: error.config?.url || error.request?.responseURL || 'no url',
      requestMethod: error.config?.method?.toUpperCase() || 'no method',
    };
    
    // Add request headers if available
    if (error.config?.headers) {
      try {
        errorInfo.requestHeaders = Object.fromEntries(
          Object.entries(error.config.headers).map(([key, value]) => [
            key, 
            Array.isArray(value) ? value.join(', ') : String(value)
          ])
        );
      } catch (e) {
        errorInfo.requestHeaders = 'failed to serialize headers';
      }
    } else {
      errorInfo.requestHeaders = 'no headers';
    }
    
    // Add response headers if available
    if (error.response?.headers) {
      try {
        errorInfo.responseHeaders = Object.fromEntries(
          Object.entries(error.response.headers).map(([key, value]) => [
            key, 
            Array.isArray(value) ? value.join(', ') : String(value)
          ])
        );
      } catch (e) {
        errorInfo.responseHeaders = 'failed to serialize headers';
      }
    } else {
      errorInfo.responseHeaders = 'no response headers';
    }
    
    // Log the error with structured logging
    const method = error.config?.method?.toUpperCase() || error.request?.method || 'UNKNOWN';
    const url = error.config?.url || error.request?.responseURL || 'UNKNOWN';
    
    // Track error with Application Insights
    const errorMessage = error.message || 'no message';
    trackTrace(
      `[API Error] ${method} ${url}: ${errorMessage}`,
      3, // Error severity
      {
        method,
        url,
        ...errorInfo,
        errorType: error.constructor?.name || 'Unknown',
        errorCode: error.code || 'no code',
        isAxiosError: error.isAxiosError ?? false,
        errorStack: error.stack?.substring(0, 500),
      }
    )

    // Handle 401 - token expired, try to refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Clear cached token
        clearTokenCache()

        trackTrace('[Auth] Attempting token refresh...', 1)

        // Attempt to refresh token
        await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/refresh`, { method: 'POST' })

        // Retry original request (will fetch new token)
        trackTrace('[Auth] Token refreshed, retrying request...', 1)
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed - redirect to login
        const refreshErrorObj = refreshError instanceof Error ? refreshError : new Error(String(refreshError))
        trackException(refreshErrorObj, 3)
        trackTrace('[Auth] Token refresh failed, redirecting to login', 3, {
          errorMessage: refreshErrorObj.message,
        })
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        }
        return Promise.reject(refreshError)
      }
    }

    // Track error in Application Insights
    if (error instanceof Error) {
      trackException(error, 3) // Severity level 3 = Error
    }

    return Promise.reject(error)
  }
)

/**
 * Rate limit error information
 */
export interface RateLimitError {
  message: string;
  retryAfter?: number;
  resetAt?: string;
}

/**
 * Helper function to handle API errors
 * Returns error message string, or RateLimitError for 429 responses
 */
export function handleApiError(error: unknown): string | RateLimitError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ 
      message?: string; 
      error?: string;
      retryAfter?: number;
      resetAt?: string;
    }>

    // Handle rate limit errors (429) with retry information
    if (axiosError.response?.status === 429) {
      const retryAfter = axiosError.response.data?.retryAfter;
      const resetAt = axiosError.response.data?.resetAt;
      const message = axiosError.response.data?.message || 
                     axiosError.response.data?.error || 
                     'Too many requests. Please try again later.';

      // If we have retryAfter, format a more helpful message
      if (retryAfter !== undefined) {
        const minutes = Math.floor(retryAfter / 60);
        const seconds = retryAfter % 60;
        let timeMessage = '';
        
        if (minutes > 0) {
          timeMessage = `${minutes} minute${minutes > 1 ? 's' : ''}`;
          if (seconds > 0) {
            timeMessage += ` and ${seconds} second${seconds > 1 ? 's' : ''}`;
          }
        } else {
          timeMessage = `${seconds} second${seconds > 1 ? 's' : ''}`;
        }

        return {
          message: `Too many requests. Please try again in ${timeMessage}.`,
          retryAfter,
          resetAt,
        };
      }

      return {
        message,
        retryAfter,
        resetAt,
      };
    }

    // Extract error message from response
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }

    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error
    }

    // Default error messages based on status code
    switch (axiosError.response?.status) {
      case 400:
        return 'Invalid request. Please check your input.'
      case 401:
        return 'Authentication required. Please log in.'
      case 403:
        return 'You do not have permission to perform this action.'
      case 404:
        return 'The requested resource was not found.'
      case 409:
        return 'A conflict occurred. The resource may already exist.'
      case 422:
        return 'Validation error. Please check your input.'
      case 500:
        return 'An internal server error occurred. Please try again later.'
      case 503:
        return 'Service temporarily unavailable. Please try again later.'
      default:
        return axiosError.message || 'An unexpected error occurred.'
    }
  }

  return 'An unexpected error occurred.'
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return typeof error === 'object' && error !== null && 'retryAfter' in error;
}

export default apiClient

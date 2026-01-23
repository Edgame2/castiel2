'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types/auth'
import { ensureAuth, clearTokenCache } from '@/lib/api/client'
import { env } from '@/lib/env'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function fetchUser() {
      if (process.env.NODE_ENV === 'development') {
        trackTrace('AuthContext: Fetching user from /api/auth/me', 0, {})
      }
      try {
        const response = await fetch('/api/auth/me')
        if (process.env.NODE_ENV === 'development') {
          trackTrace('AuthContext: Response status', 0, { status: response.status })
        }
        if (response.ok && mounted) {
          const userData = await response.json()
          if (process.env.NODE_ENV === 'development') {
            trackTrace('AuthContext: User authenticated', 0, { email: userData.email })
          }
          // Normalize user data - ensure name is set
          const normalizedUser = {
            ...userData,
            name: userData.name || userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
            role: userData.role || userData.roles?.[0] || 'user',
          }
          setUser(normalizedUser)

          // Initialize API client auth token
          await ensureAuth()
          if (process.env.NODE_ENV === 'development') {
            trackTrace('AuthContext: API token initialized', 0, {})
          }
        } else if (mounted) {
          if (process.env.NODE_ENV === 'development') {
            trackTrace('AuthContext: User not authenticated', 0, {})
          }
          setUser(null)
          clearTokenCache()

          // If we are getting a 401/403, and we are not on a public route, redirect to login
          const isPublicRoute = ['/login', '/register', '/forgot-password', '/reset-password'].some(path => window.location.pathname.startsWith(path))
          if (!isPublicRoute) {
            window.location.href = '/login?returnUrl=' + encodeURIComponent(window.location.pathname + window.location.search)
          }
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('AuthContext: Failed to fetch user', 3, {
          errorMessage: errorObj.message,
        })
        if (mounted) {
          setUser(null)
          clearTokenCache()
        }
      } finally {
        if (mounted) {
          if (process.env.NODE_ENV === 'development') {
            trackTrace('AuthContext: Setting isLoading to false', 0, {})
          }
          setIsLoading(false)
        }
      }
    }

    fetchUser()

    return () => {
      mounted = false
    }
  }, [])

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        // Normalize user data - ensure name is set
        const normalizedUser = {
          ...userData,
          name: userData.name || userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
          role: userData.role || userData.roles?.[0] || 'user',
        }
        setUser(normalizedUser)
      } else {
        setUser(null)
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to fetch user', 3, {
        errorMessage: errorObj.message,
      })
      setUser(null)
    }
  }

  const logout = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        trackTrace('Logout: Starting logout process', 0, {})
      }

      // Fire API logout (non-blocking, don't wait for response)
      const apiBaseUrl = env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
      fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(2000), // 2 second timeout
      }).catch(error => {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 2)
        trackTrace('Logout: API call error (non-blocking)', 2, {
          errorMessage: errorObj.message,
        })
      })

      // Clear local state immediately
      setUser(null)
      clearTokenCache()

      // Clear all cookies
      document.cookie = 'access_token=; Max-Age=-1; path=/'
      document.cookie = 'refresh_token=; Max-Age=-1; path=/'

      if (process.env.NODE_ENV === 'development') {
        trackTrace('Logout: User state cleared, redirecting', 0, {})
      }

      // Force a hard redirect to login page
      window.location.href = '/login'
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Logout: Exception occurred', 3, {
        errorMessage: errorObj.message,
      })
      // On error, still try to clear and redirect
      setUser(null)
      clearTokenCache()
      document.cookie = 'access_token=; Max-Age=-1; path=/'
      document.cookie = 'refresh_token=; Max-Age=-1; path=/'
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackTrace, trackException } from '@/lib/monitoring/app-insights'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token' as any)?.value

    // Log in development only
    if (process.env.NODE_ENV === 'development') {
      trackTrace('Logout API: Starting logout process', 1)
    }

    // Try to call main API logout endpoint (but don't wait for it or let it block)
    // This is fire-and-forget - we'll complete logout regardless
    if (accessToken) {
      // Fire and forget - don't await
      fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'default',
        },
        signal: AbortSignal.timeout(2000), // 2 second timeout
      }).catch(error => {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackTrace('Main API logout failed (non-blocking)', 2, {
          errorMessage: errorObj.message,
        })
      })
    }

    // Delete auth cookies immediately without waiting for API response
    // Log in development only
    if (process.env.NODE_ENV === 'development') {
      trackTrace('Logout API: Deleting cookies', 1)
    }
    cookieStore.delete('access_token')
    cookieStore.delete('refresh_token')

    const response = NextResponse.json({ success: true })

    // Explicitly set cookies to expire
    response.cookies.set('access_token', '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    })
    response.cookies.set('refresh_token', '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    })

    // Log in development only
    if (process.env.NODE_ENV === 'development') {
      trackTrace('Logout API: Logout complete', 1)
    }
    return response
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('Logout error', 3, {
      errorMessage: errorObj.message,
    })
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}

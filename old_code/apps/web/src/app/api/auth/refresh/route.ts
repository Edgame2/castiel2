import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { refreshAccessToken } from '@/lib/auth/oauth'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh_token' as any)

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
    }

    // Refresh the access token
    const tokens = await refreshAccessToken(refreshToken.value)

    // Update cookies with new tokens
    // SameSite=Strict for CSRF protection
    cookieStore.set('access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokens.expires_in || 9 * 60 * 60, // 9 hours default
      path: '/',
    })

    if (tokens.refresh_token) {
      cookieStore.set('refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days (matching backend)
        path: '/',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('Token refresh error', 3, {
      errorMessage: errorObj.message,
    })
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 })
  }
}

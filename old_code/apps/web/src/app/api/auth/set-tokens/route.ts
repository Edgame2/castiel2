import { NextResponse } from 'next/server'
import { trackTrace, trackException } from '@/lib/monitoring/app-insights'

interface SetTokensRequest {
  accessToken: string
  refreshToken?: string
}

/**
 * Set authentication tokens as httpOnly cookies
 * This endpoint is called after login/token refresh to securely store tokens
 * Tokens are stored as httpOnly cookies to prevent XSS attacks
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as SetTokensRequest
    const { accessToken, refreshToken } = body

    // Log in development only
    if (process.env.NODE_ENV === 'development') {
      trackTrace('[/api/auth/set-tokens] Received request', 1, {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenLength: accessToken?.length,
      })
    }

    if (!accessToken) {
      trackTrace('[/api/auth/set-tokens] Access token is missing', 3)
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 400 }
      )
    }

    const response = NextResponse.json({ 
      success: true,
      message: 'Tokens set successfully',
    })

    // Set access token as httpOnly cookie
    // httpOnly: JavaScript cannot access via document.cookie
    // Secure: Only sent over HTTPS in production
    // SameSite=Strict: Not sent on cross-site requests (CSRF protection)
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 9 * 60 * 60, // 9 hours, matching backend expiry
      path: '/',
    })

    // Set refresh token if provided
    if (refreshToken) {
      response.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      })
    }

    // Log in development only
    if (process.env.NODE_ENV === 'development') {
      trackTrace('[/api/auth/set-tokens] Tokens set in response cookies', 1)
    }
    return response
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('[/api/auth/set-tokens] Error', 3, {
      errorMessage: errorObj.message,
    })
    return NextResponse.json(
      { error: 'Failed to set tokens', message: errorObj.message },
      { status: 500 }
    )
  }
}

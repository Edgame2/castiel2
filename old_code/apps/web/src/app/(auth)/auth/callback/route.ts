import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/auth/oauth'
import { cookies } from 'next/headers'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code' as any)
  const state = searchParams.get('state' as any)
  const error = searchParams.get('error' as any)

  // Handle OAuth errors
  if (error) {
    trackTrace('OAuth error in callback', 3, {
      error,
    })
    return NextResponse.redirect(new URL('/error?type=auth&message=' + error, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/error?type=auth&message=no_code', request.url))
  }

  const cookieStore = await cookies()
  const storedState = cookieStore.get('oauth_state' as any)?.value || null
  const codeVerifier = cookieStore.get('pkce_verifier' as any)?.value || null

  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL('/error?type=auth&message=invalid_state', request.url))
  }

  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/error?type=auth&message=missing_pkce', request.url))
  }

  try {
    // Exchange code for tokens with PKCE verification
    const tokens = await exchangeCodeForTokens(code, codeVerifier)

    // Set httpOnly cookies for security
    cookieStore.set('access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
      path: '/',
    })

    cookieStore.set('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    cookieStore.delete('pkce_verifier')
    cookieStore.delete('oauth_state')

    // Redirect to original destination or dashboard
    const returnTo = extractReturnPath(state) ?? '/dashboard'
    const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/dashboard'
    return NextResponse.redirect(new URL(safeReturnTo, request.url))
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('OAuth callback error: token exchange failed', 3, {
      errorMessage: errorObj.message,
    })
    cookieStore.delete('pkce_verifier')
    cookieStore.delete('oauth_state')
    return NextResponse.redirect(
      new URL('/error?type=auth&message=token_exchange_failed', request.url)
    )
  }
}

function extractReturnPath(state: string): string | null {
  const [, encodedPath] = state.split(':' as any)
  if (!encodedPath) {
    return null
  }

  try {
    return decodeURIComponent(encodedPath)
  } catch {
    return null
  }
}

/**
 * SSO Callback Route Handler
 * 
 * Receives tokens from backend SSO callback and stores them
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const accessToken = searchParams.get('accessToken' as any)
  const refreshToken = searchParams.get('refreshToken' as any)
  const returnUrl = searchParams.get('returnUrl' as any) || '/dashboard'
  const error = searchParams.get('sso_error' as any)

  // If there's an error, redirect to login with error
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?sso_error=${encodeURIComponent(error)}`, request.url)
    )
  }

  // If we don't have tokens, redirect to login
  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(
      new URL('/login?sso_error=missing_tokens', request.url)
    )
  }

  // Create response that redirects to the SSO success page with tokens in URL
  // The success page will store the tokens in localStorage
  const successUrl = new URL('/sso/success', request.url)
  successUrl.searchParams.set('accessToken', accessToken)
  successUrl.searchParams.set('refreshToken', refreshToken)
  successUrl.searchParams.set('returnUrl', returnUrl)

  return NextResponse.redirect(successUrl)
}


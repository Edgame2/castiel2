import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const accessToken = searchParams.get('accessToken' as any);
  const refreshToken = searchParams.get('refreshToken' as any);
  const isNewUser = searchParams.get('isNewUser' as any);
  const error = searchParams.get('error' as any);
  const errorMessage = searchParams.get('message' as any);

  // Handle OAuth errors
  if (error) {
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', errorMessage || error);
    return NextResponse.redirect(errorUrl);
  }

  // Validate tokens are present
  if (!accessToken || !refreshToken) {
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'OAuth authentication failed. Please try again.');
    return NextResponse.redirect(errorUrl);
  }

  // Set the tokens in cookies
  const cookieStore = await cookies();
  
  // Set access token cookie
  // SameSite=Strict for CSRF protection
  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 9 * 60 * 60, // 9 hours (matching backend)
    path: '/',
  });

  // Set refresh token cookie
  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days (matching backend)
    path: '/',
  });

  // Determine redirect URL
  const returnUrl = cookieStore.get('oauth_return_url' as any)?.value || '/dashboard';
  
  // Clear the return URL cookie
  cookieStore.delete('oauth_return_url');

  // Build the redirect URL
  const redirectUrl = new URL(returnUrl.startsWith('/') ? returnUrl : '/dashboard', request.url);
  
  // Add a success indicator for new users
  if (isNewUser === 'true') {
    redirectUrl.searchParams.set('welcome', 'true');
  }

  return NextResponse.redirect(redirectUrl);
}


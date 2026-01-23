import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = [
  '/accessibility',
  '/cookies',
  '/privacy',
  '/terms',
  '/auth/callback',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/mfa/challenge',
]

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')
  const { pathname } = request.nextUrl

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // Check if it's an API route or static file
  const isApiOrStatic = pathname.startsWith('/api') || 
                        pathname.startsWith('/_next') || 
                        pathname.includes('.')

  // Skip middleware for API routes and static files
  if (isApiOrStatic) {
    return NextResponse.next()
  }

  // Root path - redirect based on auth status
  if (pathname === '/') {
    if (accessToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Public routes - allow access
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Protected routes - require authentication
  if (!accessToken) {
    return redirectToLogin(request, `${pathname}${request.nextUrl.search}`)
  }

  // Authenticated - allow access
  return NextResponse.next()
}

function redirectToLogin(request: NextRequest, rawReturnPath?: string) {
  const loginUrl = new URL('/login', request.url)
  const safeReturnPath = normalizeReturnPath(rawReturnPath)

  if (safeReturnPath && safeReturnPath !== '/dashboard') {
    loginUrl.searchParams.set('returnUrl', safeReturnPath)
  }

  return NextResponse.redirect(loginUrl)
}

function normalizeReturnPath(returnPath?: string) {
  if (!returnPath) {
    return '/dashboard'
  }

  if (!returnPath.startsWith('/')) {
    return '/dashboard'
  }

  if (returnPath === '/' || returnPath === '/login') {
    return '/dashboard'
  }

  return returnPath
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)' 
  ],
}

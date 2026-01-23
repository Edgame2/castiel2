import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackTrace, trackException } from '@/lib/monitoring/app-insights'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token' as any)

    // Log in development only
    if (process.env.NODE_ENV === 'development') {
      trackTrace('[/api/auth/me] Access token check', 1, {
        hasAccessToken: !!accessToken,
      })
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Decode JWT token (base64 decode the payload)
    try {
      const parts = accessToken.value.split('.' as any)
      if (parts.length !== 3) {
        trackTrace('[/api/auth/me] Invalid token format', 3, {
          partsCount: parts.length,
        })
        throw new Error('Invalid token format')
      }

      // Decode the payload (second part)
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      )

      // Log in development only
      if (process.env.NODE_ENV === 'development') {
        trackTrace('[/api/auth/me] Token payload decoded', 1, {
          sub: payload.sub,
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          tenantId: payload.tenantId,
        })
      }

      // Map JWT payload to User type
      const user = {
        id: payload.sub || payload.userId,
        email: payload.email || 'user@example.com',
        name: payload.firstName && payload.lastName 
          ? `${payload.firstName} ${payload.lastName}` 
          : payload.name || payload.displayName || 'User',
        firstName: payload.firstName,
        lastName: payload.lastName,
        tenantId: payload.tenantId || 'default',
        isDefaultTenant: !!payload.isDefaultTenant,
        role: payload.role || 'user',
        status: payload.status || 'active',
        createdAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Log in development only
      if (process.env.NODE_ENV === 'development') {
        trackTrace('[/api/auth/me] Returning user', 1, {
          name: user.name,
          email: user.email,
        })
      }

      return NextResponse.json(user)
    } catch (decodeError) {
      const errorObj = decodeError instanceof Error ? decodeError : new Error(String(decodeError))
      trackException(errorObj, 3)
      trackTrace('[/api/auth/me] Failed to decode token', 3, {
        errorMessage: errorObj.message,
      })
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('[/api/auth/me] Failed to get user info', 3, {
      errorMessage: errorObj.message,
    })
    return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 })
  }
}

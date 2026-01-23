import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token' as any)

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json().catch(() => null) as { tenantId?: string } | null

    if (!body?.tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/switch-tenant`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenantId: body.tenantId }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || 'Failed to switch tenant' },
        { status: response.status }
      )
    }

    // Set the new tokens in cookies
    const res = NextResponse.json(data)
    
    res.cookies.set('access_token', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15, // 15 minutes
    })

    if (data.refreshToken) {
      res.cookies.set('refresh_token', data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    return res
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('[/api/auth/switch-tenant] Failed to switch tenant', 3, {
      errorMessage: errorObj.message,
    })
    return NextResponse.json(
      { error: 'Failed to switch tenant' },
      { status: 500 }
    )
  }
}


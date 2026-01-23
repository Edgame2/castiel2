import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

export async function PATCH(request: Request) {
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

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/default-tenant`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenantId: body.tenantId }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || 'Failed to update default tenant' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('[/api/auth/default-tenant] Failed to update default tenant', 3, {
      errorMessage: errorObj.message,
    })
    return NextResponse.json(
      { error: 'Failed to update default tenant' },
      { status: 500 }
    )
  }
}

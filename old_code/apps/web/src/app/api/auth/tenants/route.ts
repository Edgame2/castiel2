import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token' as any)

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/tenants`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken.value}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || 'Failed to fetch tenant memberships' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('[/api/auth/tenants] Failed to fetch memberships', 3, {
      errorMessage: errorObj.message,
      errorCode: error?.code,
    })
    
    // Handle connection errors more gracefully
    if (error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { 
          error: 'API server is not available',
          message: `Cannot connect to API server at ${API_BASE_URL}. Please ensure the API server is running.`
        },
        { status: 503 } // Service Unavailable
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch tenant memberships' },
      { status: 500 }
    )
  }
}

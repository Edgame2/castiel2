import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

/**
 * GET /api/profile/activity
 * Get user's activity log
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token' as any)

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit' as any) || '20'

    // Call backend API
    const response = await fetch(`${API_BASE_URL}/api/profile/activity?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch activity log' }))
      return NextResponse.json(
        { error: error.message || 'Failed to fetch activity log' },
        { status: response.status }
      )
    }

    const activity = await response.json()
    return NextResponse.json(activity)
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('[/api/profile/activity GET] Failed to fetch activity', 3, {
      errorMessage: errorObj.message,
      operation: 'GET',
    })
    return NextResponse.json(
      { error: 'Failed to fetch activity log' },
      { status: 500 }
    )
  }
}



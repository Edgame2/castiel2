import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

/**
 * GET /api/profile/notifications
 * Get user's notification preferences
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token' as any)

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Call backend API
    const response = await fetch(`${API_BASE_URL}/api/profile/notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch notification preferences' }))
      return NextResponse.json(
        { error: error.message || 'Failed to fetch notification preferences' },
        { status: response.status }
      )
    }

    const preferences = await response.json()
    return NextResponse.json(preferences)
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('[/api/profile/notifications GET] Failed to fetch preferences', 3, {
      errorMessage: errorObj.message,
      operation: 'GET',
    })
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/profile/notifications
 * Update user's notification preferences
 */
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token' as any)

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()

    // Call backend API
    const response = await fetch(`${API_BASE_URL}/api/profile/notifications`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update notification preferences' }))
      return NextResponse.json(
        { error: error.message || 'Failed to update notification preferences' },
        { status: response.status }
      )
    }

    const preferences = await response.json()
    return NextResponse.json(preferences)
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('[/api/profile/notifications PATCH] Failed to update preferences', 3, {
      errorMessage: errorObj.message,
      operation: 'PATCH',
    })
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}



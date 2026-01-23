import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

/**
 * GET /api/profile
 * Get current user's full profile from main API
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token' as any)

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Call main API /auth/me endpoint with the access token
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch profile' }))
      return NextResponse.json(
        { error: error.message || 'Failed to fetch profile' },
        { status: response.status }
      )
    }

    const profile = await response.json()
    return NextResponse.json(profile)
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('[/api/profile GET] Failed to fetch profile', 3, {
      errorMessage: errorObj.message,
      operation: 'GET',
    })
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/profile
 * Update current user's profile (firstName, lastName)
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

    // Call main API /auth/me endpoint with the access token
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update profile' }))
      return NextResponse.json(
        { error: error.message || 'Failed to update profile' },
        { status: response.status }
      )
    }

    const profile = await response.json()
    return NextResponse.json(profile)
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('[/api/profile PATCH] Failed to update profile', 3, {
      errorMessage: errorObj.message,
      operation: 'PATCH',
    })
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

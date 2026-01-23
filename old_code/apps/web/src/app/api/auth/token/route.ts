import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

/**
 * Get access token for client-side use (SSE/WebSocket)
 * Note: This is a controlled way to expose the token to the client
 * for real-time connections. The token is still validated on the server.
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token' as any)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      token: accessToken.value
    })
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    trackException(errorObj, 3)
    trackTrace('Error getting access token', 3, {
      errorMessage: errorObj.message,
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

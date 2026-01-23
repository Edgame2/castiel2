import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// PATCH - Update user status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token' as any)?.value;
    const { userId } = await params;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update user status' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    trackException(errorObj, 3);
    trackTrace('Error updating user status', 3, {
      errorMessage: errorObj.message,
      operation: 'PATCH',
      userId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


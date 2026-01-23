import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token' as any)?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days' as any) || '30';

    const response = await fetch(`${API_BASE_URL}/api/v1/audit-logs/stats?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch audit stats' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    trackException(errorObj, 3);
    trackTrace('Error fetching audit stats', 3, {
      errorMessage: errorObj.message,
      operation: 'GET',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


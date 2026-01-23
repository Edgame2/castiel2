import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// GET - List invitations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token' as any)?.value;
    const { tenantId } = await params;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/api/tenants/${tenantId}/invitations${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch invitations' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    trackException(errorObj, 3);
    trackTrace('Error fetching invitations', 3, {
      errorMessage: errorObj.message,
      operation: 'GET',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token' as any)?.value;
    const { tenantId } = await params;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}/invitations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create invitation' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    trackException(errorObj, 3);
    trackTrace('Error creating invitation', 3, {
      errorMessage: errorObj.message,
      operation: 'POST',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


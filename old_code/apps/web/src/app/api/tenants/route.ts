import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

async function getAuthHeader(): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token' as any);
  return accessToken ? `Bearer ${accessToken.value}` : null;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/api/tenants${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    trackException(errorObj, 3);
    trackTrace('Tenant API error: Failed to fetch tenants', 3, {
      errorMessage: errorObj.message,
      operation: 'GET',
    });
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}/api/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    trackException(errorObj, 3);
    trackTrace('Tenant API error: Failed to create tenant', 3, {
      errorMessage: errorObj.message,
      operation: 'POST',
    });
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}

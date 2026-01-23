import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

type TenantRouteParams = { params: Promise<{ tenantId: string }> };

async function getAuthHeader(): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token' as any);
  return accessToken ? `Bearer ${accessToken.value}` : null;
}

export async function GET(request: NextRequest, context: TenantRouteParams) {
  try {
    const authHeader = await getAuthHeader();
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tenantId } = await context.params;
    const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}`, {
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
    trackTrace('Tenant API error: Failed to fetch tenant', 3, {
      errorMessage: errorObj.message,
      operation: 'GET',
    });
    return NextResponse.json(
      { error: 'Failed to fetch tenant' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: TenantRouteParams) {
  try {
    const authHeader = await getAuthHeader();
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tenantId } = await context.params;
    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}`, {
      method: 'PATCH',
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
    trackTrace('Tenant API error: Failed to update tenant', 3, {
      errorMessage: errorObj.message,
      operation: 'PATCH',
    });
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: TenantRouteParams) {
  try {
    const authHeader = await getAuthHeader();
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tenantId } = await context.params;
    const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    trackException(errorObj, 3);
    trackTrace('Tenant API error: Failed to delete tenant', 3, {
      errorMessage: errorObj.message,
      operation: 'DELETE',
    });
    return NextResponse.json(
      { error: 'Failed to delete tenant' },
      { status: 500 }
    );
  }
}

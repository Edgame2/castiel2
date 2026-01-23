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

export async function POST(request: NextRequest, context: TenantRouteParams) {
  try {
    const authHeader = await getAuthHeader();
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tenantId } = await context.params;
    const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}/activate`, {
      method: 'POST',
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
    trackTrace('Tenant API error: Failed to activate tenant', 3, {
      errorMessage: errorObj.message,
      operation: 'POST',
    });
    return NextResponse.json(
      { error: 'Failed to activate tenant' },
      { status: 500 }
    );
  }
}

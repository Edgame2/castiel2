import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// DELETE - Revoke invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; invitationId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token' as any)?.value;
    const { tenantId, invitationId } = await params;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(
      `${API_BASE_URL}/api/tenants/${tenantId}/invitations/${invitationId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to revoke invitation' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    trackException(errorObj, 3);
    trackTrace('Error revoking invitation', 3, {
      errorMessage: errorObj.message,
      operation: 'DELETE',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


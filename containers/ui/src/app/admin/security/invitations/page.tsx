/**
 * Admin: Pending invitations — GET /api/v1/organizations/:orgId/invitations (list),
 * POST .../:invitationId/resend, DELETE .../:invitationId (cancel).
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type InvitationRow = {
  id: string;
  email?: string | null;
  status?: string;
  expiresAt?: string;
  createdAt?: string;
};

type ListResponse = { data?: InvitationRow[] };

export default function AdminSecurityInvitationsPage() {
  const [orgId, setOrgId] = useState('');
  const [items, setItems] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchInvitations = useCallback(() => {
    if (!apiBase || !orgId.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('status', 'pending');
    fetch(
      `${apiBase}/api/v1/organizations/${encodeURIComponent(orgId.trim())}/invitations?${params}`,
      { credentials: 'include' }
    )
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load invitations');
        return r.json();
      })
      .then((data: ListResponse) => setItems(Array.isArray(data?.data) ? data.data : []))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    if (orgId.trim()) fetchInvitations();
    else setItems([]);
  }, [orgId, fetchInvitations]);

  const resend = (invitationId: string) => {
    if (!apiBase || !orgId.trim() || actionId) return;
    setActionId(invitationId);
    fetch(
      `${apiBase}/api/v1/organizations/${encodeURIComponent(orgId.trim())}/invitations/${encodeURIComponent(invitationId)}/resend`,
      { method: 'POST', credentials: 'include' }
    )
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Resend failed');
        fetchInvitations();
      })
      .catch(() => setError('Resend failed'))
      .finally(() => setActionId(null));
  };

  const cancel = (invitationId: string) => {
    if (!apiBase || !orgId.trim() || actionId) return;
    if (!confirm('Cancel this invitation?')) return;
    setActionId(invitationId);
    fetch(
      `${apiBase}/api/v1/organizations/${encodeURIComponent(orgId.trim())}/invitations/${encodeURIComponent(invitationId)}`,
      { method: 'DELETE', credentials: 'include' }
    )
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Cancel failed');
        fetchInvitations();
      })
      .catch(() => setError('Cancel failed'))
      .finally(() => setActionId(null));
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin" className="hover:underline">Admin</Link>
          <span>/</span>
          <Link href="/admin/security" className="hover:underline">Security</Link>
          <span>/</span>
          <span className="text-foreground">Invitations</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Pending invitations</h1>

        <div className="rounded-lg border bg-white dark:bg-gray-900 p-4 mb-4">
          <label className="block text-sm font-medium mb-2">Organization ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="e.g. org-123"
              className="flex-1 max-w-xs px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
            <button
              type="button"
              onClick={() => fetchInvitations()}
              disabled={!orgId.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load'}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}

        {items.length === 0 && !loading && orgId.trim() && !error && (
          <p className="text-sm text-gray-500">No pending invitations for this organization.</p>
        )}

        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((inv) => (
              <li key={inv.id} className="border rounded-lg p-3 flex items-center justify-between dark:border-gray-700">
                <div>
                  <span className="font-medium">{inv.email ?? inv.id}</span>
                  {inv.expiresAt && (
                    <span className="text-sm text-gray-500 ml-2">Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => resend(inv.id)}
                    disabled={actionId !== null}
                    className="text-sm px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    Resend
                  </button>
                  <button
                    type="button"
                    onClick={() => cancel(inv.id)}
                    disabled={actionId !== null}
                    className="text-sm px-2 py-1 border rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4">
          <Link href="/admin/security/users/invite" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Invite user
          </Link>
          {' · '}
          <Link href="/admin/security/users" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Back to Users
          </Link>
        </p>
      </div>
    </div>
  );
}

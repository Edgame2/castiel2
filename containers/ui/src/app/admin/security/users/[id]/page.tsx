/**
 * Admin: User detail — GET /api/users/:id (gateway → user_management GET /api/v1/users/:id).
 * Shows profile; sessions view/revoke only for current user (link to Settings → Security).
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

type UserProfile = {
  id?: string;
  email?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ProfileResponse = { data?: UserProfile };

export default function AdminSecurityUserDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(() => {
    if (!apiBase || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/users/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) throw new Error('User not found');
        if (r.status === 403) throw new Error('Permission denied');
        if (!r.ok) throw new Error(r.statusText || 'Failed to load user');
        return r.json();
      })
      .then((data: ProfileResponse) => setUser(data?.data ?? null))
      .catch((e) => {
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
        setError(GENERIC_ERROR_MESSAGE);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin" className="hover:underline">Admin</Link>
          <span>/</span>
          <Link href="/admin/security" className="hover:underline">Security</Link>
          <span>/</span>
          <Link href="/admin/security/users" className="hover:underline">Users</Link>
          <span>/</span>
          <span className="text-foreground">User detail</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && user && (
          <div className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
            <h1 className="text-xl font-semibold">
              {user.name ?? ([user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || user.id)}
            </h1>
            <dl className="text-sm space-y-2">
              <div><dt className="font-medium text-gray-500">ID</dt><dd>{user.id ?? id}</dd></div>
              {user.email != null && <div><dt className="font-medium text-gray-500">Email</dt><dd>{user.email}</dd></div>}
              {user.status != null && <div><dt className="font-medium text-gray-500">Status</dt><dd>{user.status}</dd></div>}
              {user.createdAt != null && <div><dt className="font-medium text-gray-500">Created</dt><dd>{new Date(user.createdAt).toLocaleString()}</dd></div>}
            </dl>
            <section>
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sessions</h2>
              <p className="text-sm text-gray-500">
                View and revoke sessions in <Link href="/settings/security" className="text-blue-600 dark:text-blue-400 hover:underline">Settings → Security</Link> (for your own account). Admin session management for other users may be added later.
              </p>
            </section>
          </div>
        )}
        <p className="mt-4">
          <Link href="/admin/security/users" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Back to Users
          </Link>
        </p>
      </div>
    </div>
  );
}

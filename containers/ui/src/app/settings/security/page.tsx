/**
 * Account security — sessions (list, revoke, revoke all others) and MFA entry.
 * GET/DELETE/POST /api/users/me/sessions via gateway. MFA links to enroll/verify (backend P2).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '';

interface SessionItem {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  isRememberMe: boolean | null;
  expiresAt: string;
  lastActivityAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

export default function SecurityPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeAllOthers, setRevokeAllOthers] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = apiBaseUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/users/me/sessions`, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setSessions(json?.data?.sessions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    setError(null);
    try {
      const base = apiBaseUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/users/me/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error as string) || `HTTP ${res.status}`);
      }
      await fetchSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!confirm('Revoke all other sessions? You will stay signed in on this device.')) return;
    setRevokeAllOthers(true);
    setError(null);
    try {
      const base = apiBaseUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/users/me/sessions/revoke-all-others`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: '{}',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error as string) || `HTTP ${res.status}`);
      }
      await fetchSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke sessions');
    } finally {
      setRevokeAllOthers(false);
    }
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString();
    } catch {
      return s;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-semibold mb-4">Security</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manage your account security and active sessions.
          </p>
        </div>

        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-medium mb-2">Multi-factor authentication</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Add an extra layer of security with an authenticator app or backup codes.
          </p>
          <Link
            href="/settings/mfa/enroll"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 underline"
          >
            Set up MFA
          </Link>
        </section>

        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-medium mb-2">Active sessions</h2>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm p-3 mb-4">
              {error}
            </div>
          )}
          {loading ? (
            <p className="text-sm text-gray-500">Loading sessions…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-500">No active sessions.</p>
          ) : (
            <>
              <ul className="space-y-3 mb-4">
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 dark:border-gray-600 p-3 text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {s.deviceName || s.deviceType || 'Unknown device'}
                        {s.isCurrent && (
                          <span className="ml-2 text-gray-500">(this session)</span>
                        )}
                      </span>
                      <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                        {[s.city, s.country].filter(Boolean).join(', ') || s.ipAddress || '—'} · Last active {formatDate(s.lastActivityAt)}
                      </p>
                    </div>
                    {!s.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(s.id)}
                        disabled={revoking === s.id}
                        className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                      >
                        {revoking === s.id ? 'Revoking…' : 'Revoke'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {sessions.filter((s) => !s.isCurrent).length > 0 && (
                <button
                  type="button"
                  onClick={handleRevokeAllOthers}
                  disabled={revokeAllOthers}
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {revokeAllOthers ? 'Revoking…' : 'Revoke all other sessions'}
                </button>
              )}
            </>
          )}
        </section>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          <Link href="/settings/profile" className="underline hover:no-underline">
            Back to profile
          </Link>
        </p>
      </div>
    </div>
  );
}

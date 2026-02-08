/**
 * Accept invitation — token from query (?token=...). POST /api/invitations/:token/accept via gateway.
 * If requiresRegistration, show message and link to register. Otherwise success and link to login.
 */

'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const apiBaseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message?: string; requiresRegistration?: boolean } | null>(null);

  const handleAccept = async () => {
    if (!tokenFromUrl) {
      setError('Missing invitation token. Use the link from your email.');
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const base = apiBaseUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/invitations/${encodeURIComponent(tokenFromUrl)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? data?.message ?? `Request failed (${res.status})`);
        return;
      }
      setResult({
        message: data?.message,
        requiresRegistration: data?.requiresRegistration === true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenFromUrl) {
    return (
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-4">Accept invitation</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Invalid or missing invitation link. Use the link from your invitation email.
        </p>
        <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700 underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (result) {
    return (
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-4">Invitation</h1>
        {result.requiresRegistration ? (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Create an account to join the organization. After registering, you can sign in.
            </p>
            <Link href="/register" className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 underline">
              Create account
            </Link>
            {' · '}
            <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700 underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              {result.message ?? 'Invitation accepted successfully.'}
            </p>
            <Link href="/login" className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 underline">
              Sign in
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Accept invitation</h1>
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm p-3 mb-4">
          {error}
        </div>
      )}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        You have been invited to join an organization. Accept to continue.
      </p>
      <button
        type="button"
        onClick={handleAccept}
        disabled={loading}
        className="w-full rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 text-sm"
      >
        {loading ? 'Accepting…' : 'Accept invitation'}
      </button>
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <Link href="/login" className="underline hover:no-underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-sm text-gray-500">Loading…</div>}>
        <AcceptInvitationContent />
      </Suspense>
    </div>
  );
}

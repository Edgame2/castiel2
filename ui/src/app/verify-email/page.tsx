/**
 * Verify email — token from query (?token=...). Calls GET /api/auth/verify-email?token= via gateway.
 * On success or error, shows message and link to login.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch, GENERIC_ERROR_MESSAGE } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenFromUrl) {
      setStatus('error');
      setMessage('Missing verification token. Use the link from your email.');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setMessage(null);
    apiFetch(`/api/auth/verify-email?token=${encodeURIComponent(tokenFromUrl)}`, { skip401Redirect: true })
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus('success');
          setMessage(data?.message ?? 'Email verified successfully.');
        } else {
          setStatus('error');
          setMessage(data?.error ?? data?.message ?? `Verification failed (${res.status}).`);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setStatus('error');
          if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
          setMessage(GENERIC_ERROR_MESSAGE);
        }
      });
    return () => { cancelled = true; };
  }, [tokenFromUrl]);

  return (
    <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Verify email</h1>
      {status === 'loading' && <p className="text-sm text-gray-600 dark:text-gray-400">Verifying…</p>}
      {status === 'success' && message && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
          <Link href="/login" className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 underline">
            Sign in
          </Link>
        </div>
      )}
      {status === 'error' && message && (
        <div className="space-y-4">
          <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
          <Link href="/login" className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 underline">
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-sm text-gray-500">Loading…</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}

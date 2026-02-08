/**
 * Reset password — token from query (?token=...); form: new password + confirm.
 * POST /api/auth/reset-password via gateway. On success, show message and link to login.
 */

'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const apiBaseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!tokenFromUrl) {
      setError('Missing reset token. Use the link from your email.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: tokenFromUrl, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || data?.details || `HTTP ${res.status}`;
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        return;
      }
      setSuccessMessage(data?.message ?? 'Password has been reset successfully. Please log in with your new password.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenFromUrl) {
    return (
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-4">Reset password</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Invalid or missing reset link. Please request a new link from the forgot password page.
        </p>
        <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 underline">
          Request reset link
        </Link>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-4">Password reset</h1>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{successMessage}</p>
        <Link href="/login" className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Set new password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm p-3">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="reset-newPassword" className="block text-sm font-medium mb-1">
            New password
          </label>
          <input
            id="reset-newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="reset-confirmPassword" className="block text-sm font-medium mb-1">
            Confirm password
          </label>
          <input
            id="reset-confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 text-sm"
        >
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <Link href="/login" className="underline hover:no-underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-sm text-gray-500">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

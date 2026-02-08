/**
 * Forgot password — request reset link; POST /api/auth/forgot-password via gateway.
 * On success, shows generic message (no email enumeration). No redirect.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

const apiBaseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || `HTTP ${res.status}`;
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        return;
      }
      setSuccessMessage(data?.message ?? 'If an account with that email exists, a password reset link has been sent.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-4">Reset password</h1>
        {successMessage ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">{successMessage}</p>
            <Link href="/login" className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm p-3">
                {error}
              </div>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 text-sm"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <Link href="/login" className="underline hover:no-underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

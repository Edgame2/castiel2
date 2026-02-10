/**
 * MFA enrollment — calls POST /api/auth/mfa/enroll and POST /api/auth/mfa/verify via gateway.
 * When FEATURE_MFA is enabled, user can set up TOTP (authenticator app).
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

const apiBaseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '';

export default function MfaEnrollPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'enrolled' | 'verified'>('idle');
  const [secret, setSecret] = useState<string | null>(null);
  const [provisioningUri, setProvisioningUri] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const startEnroll = async () => {
    setError(null);
    setVerifyError(null);
    setLoading(true);
    try {
      const base = apiBaseUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/auth/mfa/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setError('Multi-factor authentication is not enabled for this environment.');
        return;
      }
      if (res.status === 409) {
        setError('You have already set up MFA. Go to Security to manage your authenticator.');
        return;
      }
      if (!res.ok) {
        setError((data?.error as string) || `Enrollment failed (${res.status}).`);
        return;
      }
      setSecret(data.secret ?? null);
      setProvisioningUri(data.provisioningUri ?? null);
      setLabel(data.label ?? null);
      setStep('enrolled');
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  const submitVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.replace(/\s/g, '');
    if (trimmed.length < 6) {
      setVerifyError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setVerifyError(null);
    setLoading(true);
    try {
      const base = apiBaseUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/auth/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setVerifyError('MFA is not enabled.');
        return;
      }
      if (res.status === 401) {
        setVerifyError('Invalid or expired code. Try again.');
        return;
      }
      if (!res.ok) {
        setVerifyError((data?.error as string) || 'Verification failed.');
        return;
      }
      setStep('verified');
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setVerifyError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verified') {
    return (
      <div className="p-6">
        <div className="max-w-lg rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h1 className="text-xl font-semibold mb-4">MFA enabled</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Your authenticator app is now linked. You may be asked for a code when signing in.
          </p>
          <Link href="/settings/security" className="text-sm font-medium text-blue-600 hover:text-blue-700 underline">
            Back to Security
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'enrolled' && (secret || provisioningUri)) {
    return (
      <div className="p-6">
        <div className="max-w-lg rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h1 className="text-xl font-semibold mb-4">Add to authenticator app</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Scan the QR code in your app, or enter this secret manually:
          </p>
          {secret && (
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground">Secret key</Label>
              <code className="block p-2 rounded bg-gray-100 dark:bg-gray-800 text-sm break-all select-all">{secret}</code>
            </div>
          )}
          {label && <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Account label: {label}</p>}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Then enter the 6-digit code from your app below to confirm.
          </p>
          <form onSubmit={submitVerify} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="mfa-enroll-code">Verification code</Label>
              <Input
                id="mfa-enroll-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            {verifyError && <p className="text-sm text-destructive">{verifyError}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={loading || code.length < 6}>
                {loading ? 'Verifying…' : 'Verify and enable'}
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/settings/security">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-lg rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h1 className="text-xl font-semibold mb-4">Set up multi-factor authentication</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Use an authenticator app (e.g. Google Authenticator, Microsoft Authenticator) to get a 6-digit code when signing in.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
        {!apiBaseUrl && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">NEXT_PUBLIC_API_BASE_URL is not set. Cannot call the API.</p>
        )}
        <div className="flex gap-3">
          <Button type="button" onClick={startEnroll} disabled={loading || !apiBaseUrl}>
            {loading ? 'Starting…' : 'Start setup'}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/settings/security">Back to Security</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

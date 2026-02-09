/**
 * MFA verification — calls POST /api/auth/mfa/verify via gateway.
 * Use when already signed in to verify your authenticator app code (e.g. from Security).
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const apiBaseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '';

export default function MfaVerifyPage() {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.replace(/\s/g, '').toUpperCase();
    if (useBackupCode) {
      if (trimmed.length < 8) {
        setError('Enter your 8-character backup code.');
        return;
      }
    } else {
      if (trimmed.length < 6) {
        setError('Enter the 6-digit code from your authenticator app.');
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      const base = apiBaseUrl.replace(/\/$/, '');
      const url = useBackupCode ? `${base}/api/auth/mfa/verify-backup` : `${base}/api/auth/mfa/verify`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setError('Multi-factor authentication is not enabled.');
        return;
      }
      if (res.status === 401) {
        setError(useBackupCode ? 'Invalid or already used backup code.' : 'Invalid or expired code. Try again.');
        return;
      }
      if (!res.ok) {
        setError((data?.error as string) || 'Verification failed.');
        return;
      }
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6">
        <div className="max-w-lg rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h1 className="text-xl font-semibold mb-4">Code verified</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Your code was accepted.
          </p>
          <Link href="/settings/security" className="text-sm font-medium text-blue-600 hover:text-blue-700 underline">
            Back to Security
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-lg rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h1 className="text-xl font-semibold mb-4">Verify your identity</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {useBackupCode ? 'Enter your 8-character backup code.' : 'Enter the 6-digit code from your authenticator app.'}
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
        {!apiBaseUrl && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">NEXT_PUBLIC_API_BASE_URL is not set.</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="mfa-verify-backup"
              checked={useBackupCode}
              onCheckedChange={(checked) => { setUseBackupCode(checked === true); setCode(''); setError(null); }}
            />
            <Label htmlFor="mfa-verify-backup" className="text-sm font-normal cursor-pointer">
              Use a backup code instead
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mfa-verify-code">Code</Label>
            <Input
              id="mfa-verify-code"
              type="text"
              inputMode={useBackupCode ? 'text' : 'numeric'}
              autoComplete="one-time-code"
              maxLength={8}
              placeholder={useBackupCode ? 'ABCD1234' : '000000'}
              value={code}
              onChange={(e) => setCode(useBackupCode ? e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : e.target.value.replace(/\D/g, ''))}
              className="font-mono"
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading || !apiBaseUrl || (useBackupCode ? code.replace(/\s/g, '').length < 8 : code.replace(/\s/g, '').length < 6)}
            >
              {loading ? 'Verifying…' : 'Verify'}
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/settings/security">Cancel</Link>
            </Button>
          </div>
        </form>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          <Link href="/login" className="underline">Sign in</Link>
          {' · '}
          <Link href="/settings/security" className="underline">Security settings</Link>
        </p>
      </div>
    </div>
  );
}

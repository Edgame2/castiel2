/**
 * Forgot password — request reset link; POST /api/auth/forgot-password via gateway.
 * On success, shows generic message (no email enumeration). No redirect.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

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
      const base = getApiBaseUrl();
      const res = await fetch(`${base ? `${base.replace(/\/$/, '')}` : ''}/api/auth/forgot-password`, {
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
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            {successMessage
              ? undefined
              : "Enter your email and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{successMessage}</p>
              <Button asChild variant="link" className="p-0 h-auto">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3 border border-destructive/20">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="forgot-email">
                  Email <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}
        </CardContent>
        {!successMessage && (
          <CardFooter className="text-sm text-muted-foreground">
            <Button asChild variant="link" className="p-0 h-auto text-muted-foreground">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

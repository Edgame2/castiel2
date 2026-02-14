/**
 * Forgot password — request reset link; POST /api/v1/auth/forgot-password via gateway.
 * On success, shows generic message (no email enumeration). No redirect.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { apiFetch, GENERIC_ERROR_MESSAGE } from '@/lib/api';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
        skip401Redirect: true,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error || json?.message || `HTTP ${res.status}`;
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        return;
      }
      setSuccessMessage(json?.message ?? 'If an account with that email exists, a password reset link has been sent.');
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  placeholder="you@example.com"
                  className="w-full"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive" role="alert">{errors.email.message}</p>
                )}
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

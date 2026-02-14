/**
 * Reset password — token from query (?token=...); form: new password + confirm.
 * POST /api/v1/auth/reset-password via gateway. On success, show message and link to login.
 */

'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError(null);
    if (!tokenFromUrl) {
      setError('Missing reset token. Use the link from your email.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenFromUrl, newPassword: data.newPassword }),
        skip401Redirect: true,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error || json?.message || json?.details || `HTTP ${res.status}`;
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        return;
      }
      setSuccessMessage(json?.message ?? 'Password has been reset successfully. Please log in with your new password.');
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  if (!tokenFromUrl) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Invalid or missing reset link. Please request a new link from the forgot password page.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="link" className="p-0 h-auto">
            <Link href="/forgot-password">Request reset link</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (successMessage) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Password reset</CardTitle>
          <CardDescription>{successMessage}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>Enter and confirm your new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3 border border-destructive/20">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reset-newPassword">
              New password <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="reset-newPassword"
              type="password"
              autoComplete="new-password"
              className="w-full"
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive" role="alert">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-confirmPassword">
              Confirm password <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="reset-confirmPassword"
              type="password"
              autoComplete="new-password"
              className="w-full"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive" role="alert">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <Button asChild variant="link" className="p-0 h-auto text-muted-foreground">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

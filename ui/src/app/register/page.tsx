/**
 * Registration page — email, password, optional name; calls POST /api/auth/register via gateway.
 * On success, cookies are set and user is redirected to /dashboard.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName?.trim() || undefined,
          lastName: data.lastName?.trim() || undefined,
        }),
        skip401Redirect: true,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error || json?.message || `HTTP ${res.status}`;
        const details = Array.isArray(json?.errors) ? json.errors.join('. ') : null;
        setError(typeof msg === 'string' ? (details ? `${msg}: ${details}` : msg) : JSON.stringify(msg));
        return;
      }
      router.push('/dashboard');
      router.refresh();
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
          <CardTitle>Create account</CardTitle>
          <CardDescription>Enter your details to register.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3 border border-destructive/20">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="register-email">
                Email <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="register-email"
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="register-firstName">First name</Label>
                <Input
                  id="register-firstName"
                  type="text"
                  autoComplete="given-name"
                  className="w-full"
                  {...register('firstName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-lastName">Last name</Label>
                <Input
                  id="register-lastName"
                  type="text"
                  autoComplete="family-name"
                  className="w-full"
                  {...register('lastName')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">
                Password <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                className="w-full"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive" role="alert">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="underline hover:no-underline hover:text-foreground">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

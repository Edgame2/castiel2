/**
 * Logout — POST /api/v1/auth/logout via gateway (clears session cookies), then redirect to /login.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function LogoutPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      skip401Redirect: true,
    })
      .then(() => {
        if (!cancelled) setDone(true);
      })
      .catch(() => {
        if (!cancelled) setDone(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!done) return;
    router.replace('/login');
    router.refresh();
  }, [done, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Signing out…</p>
        <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700 underline">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}

/**
 * Logout — POST /api/auth/logout via gateway (clears session cookies), then redirect to /login.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const apiBaseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '';

export default function LogoutPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const base = apiBaseUrl.replace(/\/$/, '');
    fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
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

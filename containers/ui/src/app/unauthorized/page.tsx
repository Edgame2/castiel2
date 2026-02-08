/**
 * Unauthorized (401) — Shown when access is denied or session is required. Plan §2.10.
 * Redirect here when API returns 401 or when auth middleware requires login.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Unauthorized | Castiel',
  description: 'Sign in or check permissions to access this page.',
};

export default function UnauthorizedPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full border rounded-lg p-8 dark:border-gray-700 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Unauthorized</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          You must be signed in to view this page, or you do not have permission to access it.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/login" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Sign in
          </Link>
          <Link href="/" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

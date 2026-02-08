/**
 * 404 — Not found. Plan §2.10.
 * Rendered when a route does not match or when notFound() is called from next/navigation.
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full border rounded-lg p-8 dark:border-gray-700 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Page not found</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Home
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Dashboard
          </Link>
          <Link href="/login" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

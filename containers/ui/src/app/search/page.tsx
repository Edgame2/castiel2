/**
 * Search — placeholder until search-service is exposed via gateway (plan §1.3: backend-only by default).
 * UI inventory §3.9: "Global or scoped search".
 */

import Link from 'next/link';

export default function SearchPage() {
  return (
    <div className="p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-semibold mb-2">Search</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Global search will be available here once the search API is exposed to the client. You can use the links below to find opportunities, dashboards, and admin areas.
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/opportunities" className="text-blue-600 dark:text-blue-400 hover:underline">
              Opportunities
            </Link>
          </li>
          <li>
            <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline">
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/admin" className="text-blue-600 dark:text-blue-400 hover:underline">
              Admin
            </Link>
          </li>
          <li>
            <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:underline">
              Settings
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

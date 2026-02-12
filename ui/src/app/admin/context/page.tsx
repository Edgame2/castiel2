/**
 * Admin: Context config — Super Admin: platform context; Tenant Admin: tenant context (Plan §2.9).
 * View and update context; API from context-service when exposed via gateway.
 */

'use client';

import Link from 'next/link';

export default function AdminContextPage() {
  return (
    <div className="p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin" className="hover:underline">Admin</Link>
          <span>/</span>
          <span className="text-foreground">Context</span>
        </div>
        <h1 className="text-xl font-semibold mb-2">Context</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Super Admin: platform-level context. Tenant Admin: tenant-level context. View and update context configuration when the context API is exposed via the gateway.
        </p>
        <div className="border rounded-lg p-6 dark:border-gray-700">
          <p className="text-sm text-gray-500">
            Context configuration will appear here once the context-service is exposed to the client and this page is wired to it.
          </p>
        </div>
        <p className="mt-4">
          <Link href="/admin" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Admin</Link>
        </p>
      </div>
    </div>
  );
}

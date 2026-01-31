/**
 * Super Admin: Security & Access Control (W11)
 * Section 10 – roles, users, API keys, audit.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function SecurityPage() {
  useEffect(() => {
    document.title = 'Security & Access Control | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">
          Admin
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Security & Access Control</h1>
          <p className="text-muted-foreground">
            Roles, users, API keys, and audit log (Super Admin §10).
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
          title="Reload page (§10)"
        >
          Refresh
        </button>
      </div>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Overview
        </span>
        <Link
          href="/admin/security/roles"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Roles
        </Link>
        <Link
          href="/admin/security/users"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Users
        </Link>
        <Link
          href="/admin/security/api-keys"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          API Keys
        </Link>
        <Link
          href="/admin/security/audit"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Audit Log
        </Link>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/security/roles"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Roles</h2>
          <p className="text-sm text-gray-500">
            View and create roles; permissions and scope (global/tenant)
          </p>
        </Link>
        <Link
          href="/admin/security/users"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Users</h2>
          <p className="text-sm text-gray-500">
            View and manage users; role and tenant assignment
          </p>
        </Link>
        <Link
          href="/admin/security/api-keys"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">API Keys</h2>
          <p className="text-sm text-gray-500">
            Create and manage API keys; scope, expiration, rate limits
          </p>
        </Link>
        <Link
          href="/admin/security/audit"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Audit Log</h2>
          <p className="text-sm text-gray-500">
            Searchable audit log; filters and export for compliance
          </p>
        </Link>
      </div>
    </div>
  );
}

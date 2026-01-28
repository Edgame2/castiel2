/**
 * Super Admin Dashboard
 * Overview page for Super Admin features
 */

import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Super Admin</h1>
      <p className="text-muted-foreground mb-6">
        System administration and configuration (Super Admin only)
      </p>

      <div className="grid grid-cols-2 gap-6">
        <Link
          href="/admin/integrations/catalog"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Integration Catalog</h2>
          <p className="text-sm text-gray-500">
            Manage integration catalog entries and types
          </p>
        </Link>

        <Link
          href="/admin/shard-types"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Shard Types</h2>
          <p className="text-sm text-gray-500">
            Manage shard type definitions and schemas
          </p>
        </Link>

        <Link
          href="/admin/settings"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">System Settings</h2>
          <p className="text-sm text-gray-500">
            Configure rate limits, capacity, queues, and feature flags
          </p>
        </Link>

        <Link
          href="/admin/monitoring"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">System Monitoring</h2>
          <p className="text-sm text-gray-500">
            Monitor system health, queues, processors, and performance
          </p>
        </Link>
      </div>
    </div>
  );
}

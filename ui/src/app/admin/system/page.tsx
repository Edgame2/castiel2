/**
 * Super Admin: System Configuration (W11 §8)
 * Area 8 – performance, Data Lake, logging, API security; links to Settings and Monitoring.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SystemPage() {
  useEffect(() => {
    document.title = 'System Configuration | Admin | Castiel';
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
          <h1 className="text-2xl font-bold mb-2">System Configuration</h1>
          <p className="text-muted-foreground">
            Performance targets, Data Lake, logging, and API security (Super Admin §8).
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.location.reload()} title="Reload page (§8)">
          Refresh
        </Button>
      </div>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Overview
        </span>
        <Link
          href="/admin/system/performance"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Performance
        </Link>
        <Link
          href="/admin/system/data-lake"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Data Lake
        </Link>
        <Link
          href="/admin/system/logging"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Logging
        </Link>
        <Link
          href="/admin/system/api-security"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          API Security
        </Link>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/system/performance"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Performance</h2>
          <p className="text-sm text-gray-500">
            Latency and throughput targets; caching (Redis, TTL, invalidation)
          </p>
        </Link>
        <Link
          href="/admin/system/data-lake"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Data Lake</h2>
          <p className="text-sm text-gray-500">
            Data Lake paths, retention, sync configuration
          </p>
        </Link>
        <Link
          href="/admin/system/logging"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Logging</h2>
          <p className="text-sm text-gray-500">
            Log levels, retention, SIEM integration
          </p>
        </Link>
        <Link
          href="/admin/system/api-security"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">API Security</h2>
          <p className="text-sm text-gray-500">
            Rate limits, CORS, API auth (distinct from Roles/Users under Security)
          </p>
        </Link>
        <Link
          href="/admin/settings"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Settings</h2>
          <p className="text-sm text-gray-500">
            Rate limits, capacity, queues, feature flags (integration manager)
          </p>
        </Link>
        <Link
          href="/admin/monitoring"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Monitoring</h2>
          <p className="text-sm text-gray-500">
            System health, queues, processors, performance (integration processors)
          </p>
        </Link>
      </div>
    </div>
  );
}

/**
 * Super Admin: Logging configuration (W11 §8.3)
 * Log levels and sinks are per-service via env/config; no central admin API yet.
 */

'use client';

import Link from 'next/link';

export default function SystemLoggingPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">Admin</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/system" className="text-sm font-medium hover:underline">System Configuration</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Logging Configuration</h1>
      <p className="text-muted-foreground mb-4">
        Log levels and sinks are configured per service via environment variables and config (§8.3).
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/system" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/system/performance" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Performance</Link>
        <Link href="/admin/system/data-lake" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Data Lake</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Logging</span>
        <Link href="/admin/system/api-security" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">API Security</Link>
      </nav>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <section>
          <h2 className="text-sm font-semibold mb-2">Log levels</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Each container (e.g. logging, user-management, auth, ml-service) uses <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">LOG_LEVEL</code> (or <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">config</code> <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">level</code>) to set verbosity (e.g. info, debug). Override per deployment via env.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-semibold mb-2">Sinks and retention</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            The <strong>logging</strong> service writes events to Data Lake (Parquet) and can use Application Insights (<code className="rounded bg-gray-100 dark:bg-gray-800 px-1">APPLICATIONINSIGHTS_CONNECTION_STRING</code>). Retention is governed by storage (Blob/Cosmos) and deployment policies; no central retention API yet.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-semibold mb-2">SIEM</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            SIEM integration is not yet implemented. Use deployment and monitoring docs for Prometheus scrape config and runbooks.
          </p>
        </section>
        <Link href="/admin/system" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to System Configuration
        </Link>
      </div>
    </div>
  );
}

/**
 * Super Admin: Data Lake configuration (W11 §8.2)
 * Data Lake is configured per service via YAML and env; no central admin API yet.
 */

'use client';

import Link from 'next/link';

export default function SystemDataLakePage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">Admin</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/system" className="text-sm font-medium hover:underline">System Configuration</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Data Lake Configuration</h1>
      <p className="text-muted-foreground mb-4">
        Paths, retention, and sync are configured per service via config and environment variables (§8.2).
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/system" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/system/performance" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Performance</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Data Lake</span>
        <Link href="/admin/system/logging" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Logging</Link>
        <Link href="/admin/system/api-security" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">API Security</Link>
      </nav>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <section>
          <h2 className="text-sm font-semibold mb-2">Where it is configured</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Data Lake (Azure Blob) is used by: <strong>logging</strong> (Parquet writers, DataLakeCollector), <strong>ml-service</strong> (inference logs, drift), and <strong>risk-analytics</strong> (backfill, outcome sync). Each service reads its own <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">config/default.yaml</code> and env (e.g. <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">DATA_LAKE_CONNECTION_STRING</code>, <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">DATA_LAKE_CONTAINER</code>, path prefixes).
          </p>
        </section>
        <section>
          <h2 className="text-sm font-semibold mb-2">Paths</h2>
          <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
            <li>Risk evaluations, ML predictions, recommendation feedback → path prefixes per service (e.g. risk_evaluations, feedback, ml_inference_logs).</li>
            <li>Partitioning: year=…/month=…/day=… per BI_SALES_RISK_DATA_LAKE_LAYOUT.</li>
          </ul>
        </section>
        <p className="text-sm text-gray-500">
          A central admin API for paths, retention, and sync is not yet implemented; use deployment and monitoring docs for runbooks and scrape config.
        </p>
        <Link href="/admin/system" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to System Configuration
        </Link>
      </div>
    </div>
  );
}

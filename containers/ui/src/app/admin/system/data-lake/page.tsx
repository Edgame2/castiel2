/**
 * Super Admin: Data Lake configuration (W11 §8.2)
 * Data Lake is configured per service via YAML and env; no central admin API yet.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function SystemDataLakePage() {
  useEffect(() => {
    document.title = 'Data Lake | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

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
        Paths, retention, and sync are configured per service via config and environment variables (§8.2). There is no central admin API; configuration remains per-service (YAML/env). Full-stack infrastructure (Data Lake, Cosmos, Redis, RabbitMQ) is documented in infrastructure/terraform/README.md under Assumed resources.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/system" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/system/performance" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Performance</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Data Lake</span>
        <Link href="/admin/system/logging" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Logging</Link>
        <Link href="/admin/system/api-security" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">API Security</Link>
      </nav>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold">Data Lake (§8.2)</h2>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            aria-label="Refresh page"
          >
            Refresh
          </button>
        </div>
        <section>
          <h3 className="text-sm font-semibold mb-2">Known path prefixes (§8.2)</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Data Lake path prefixes are defined per service in config; partitioning is <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">year=…/month=…/day=…</code> per BI_SALES_RISK_DATA_LAKE_LAYOUT.
          </p>
          <ul className="list-none space-y-2" aria-label="Known Data Lake path prefixes">
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">risk_evaluations</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Risk evaluation events (logging service, DataLakeCollector)</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">ml_predictions</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">ML prediction events (logging service, DataLakeCollector)</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">feedback</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Recommendation feedback events (logging service, DataLakeCollector)</span>
            </li>
          </ul>
        </section>
        <section>
          <h3 className="text-sm font-semibold mb-2">Where it is configured</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Data Lake (Azure Blob) is used by: <strong>logging</strong> (Parquet writers, DataLakeCollector), <strong>ml-service</strong> (inference logs, drift), and <strong>risk-analytics</strong> (backfill, outcome sync). Each service reads its own <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">config/default.yaml</code> and env (e.g. <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">DATA_LAKE_CONNECTION_STRING</code>, <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">DATA_LAKE_CONTAINER</code>, path prefixes).
          </p>
        </section>
        <section>
          <h3 className="text-sm font-semibold mb-2">Paths</h3>
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

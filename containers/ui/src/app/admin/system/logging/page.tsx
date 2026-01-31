/**
 * Super Admin: Logging configuration (W11 §8.3)
 * Log levels and sinks are per-service via env/config; no central admin API yet.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function SystemLoggingPage() {
  useEffect(() => {
    document.title = 'Logging | Admin | Castiel';
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
      <h1 className="text-2xl font-bold mb-2">Logging Configuration</h1>
      <p className="text-muted-foreground mb-4">
        Log levels and sinks are configured per service via environment variables and config (§8.3). There is no central admin API; configuration remains per-service (YAML/env). See deployment/monitoring for runbooks.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/system" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/system/performance" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Performance</Link>
        <Link href="/admin/system/data-lake" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Data Lake</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Logging</span>
        <Link href="/admin/system/api-security" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">API Security</Link>
      </nav>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold">Logging (§8.3)</h2>
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
          <h3 className="text-sm font-semibold mb-2">Services with logging (§8.3)</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Each container uses <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">LOG_LEVEL</code> (or config <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">level</code>). Sinks and retention are per-service; no central admin API yet.
          </p>
          <ul className="list-none space-y-2" aria-label="Services with logging">
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">logging</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Data Lake (Parquet), Application Insights; consumes risk.evaluated, ml.prediction.completed, recommendation.feedback.received</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">ml-service</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">App logs, inference logs, drift; optional App Insights</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">risk-analytics</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">App logs, risk evaluation flow; optional App Insights</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">recommendations</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">App logs, feedback recording; optional App Insights</span>
            </li>
          </ul>
        </section>
        <section>
          <h3 className="text-sm font-semibold mb-2">Log levels</h3>
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
          <h3 className="text-sm font-semibold mb-2">SIEM</h3>
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

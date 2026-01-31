/**
 * Super Admin: Data export configuration (W11 §9.3)
 * Data Lake writes are per-service; central export config not yet implemented.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AnalyticsExportPage() {
  useEffect(() => {
    document.title = 'Data Export | Admin | Castiel';
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
        <Link href="/admin/analytics" className="text-sm font-medium hover:underline">Analytics & Reporting</Link>
      </div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Data Export Configuration</h1>
          <p className="text-muted-foreground">
            Data Lake and event-to-Parquet writes are per-service; central export config is not yet implemented.
          </p>
        </div>
        <button type="button" onClick={() => window.location.reload()} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0" aria-label="Refresh data export page">Refresh</button>
      </div>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/analytics" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/analytics/dashboards" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Dashboards</Link>
        <Link href="/admin/analytics/reports" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Reports</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Data Export</span>
      </nav>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <section>
          <h2 className="text-sm font-semibold mb-2">Predefined export data sources (§9.3)</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            §9.3: Central export configuration is not implemented. Data Lake and event-to-Parquet writes are per-service (logging, risk-analytics). When §9.3.1 is implemented, this page will offer exports array (name, dataSource, format, schedule, destination, retention) backed by an admin API. Until then, configuration remains per-service.
          </p>
          <ul className="list-none space-y-2" aria-label="Predefined export data sources">
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Risk evaluations</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Opportunity risk scores and evaluations (Data Lake path per logging config)</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">ML predictions</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Model predictions and metadata (Data Lake path per logging config)</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Recommendation feedback</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Feedback events and aggregation (Data Lake path per logging config)</span>
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-sm font-semibold mb-2">Current behavior</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            The logging service (DataLakeCollector) writes risk evaluations, ML predictions, and recommendation feedback to Data Lake (Parquet) per config. Paths and retention are per-service; see Admin → System → Data Lake.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-semibold mb-2">Planned scope</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Per plan §9.3: configure exports (CSV, JSON, Parquet), schedule, and destination (e.g. Azure Blob, SFTP). Central admin API and UI for export config are not yet implemented.
          </p>
        </section>
        <Link href="/admin/analytics" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Analytics & Reporting (Overview)
        </Link>
      </div>
    </div>
  );
}

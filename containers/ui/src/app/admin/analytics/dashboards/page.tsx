/**
 * Super Admin: Dashboard configuration (W11 §9.1)
 * Predefined Grafana dashboards exist; custom dashboard builder not yet implemented.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AnalyticsDashboardsPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId') ?? '';

  useEffect(() => {
    document.title = 'Dashboards | Admin | Castiel';
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
      {tenantId && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 mb-4 text-sm">
          <span className="text-gray-700 dark:text-gray-300">Filtering by tenant: </span>
          <code className="font-mono text-gray-800 dark:text-gray-200">{tenantId}</code>
          <Link href={`/admin/tenants/${encodeURIComponent(tenantId)}`} className="ml-2 font-medium text-blue-600 dark:text-blue-400 hover:underline">
            View tenant →
          </Link>
        </div>
      )}
      <h1 className="text-2xl font-bold mb-2">Dashboard Configuration</h1>
      <p className="text-muted-foreground mb-4">
        Predefined Grafana dashboards exist for BI/risk (§9.1). A custom dashboard builder (drag-and-drop widgets, data sources, filters, share/schedule) is deferred; configuration is not central. Use deployment/monitoring Grafana dashboards until a central builder is implemented.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/analytics" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Dashboards</span>
        <Link href="/admin/analytics/reports" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Reports</Link>
        <Link href="/admin/analytics/export" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Data Export</Link>
      </nav>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <section>
          <h2 className="text-sm font-semibold mb-2">Predefined dashboards (§9.1)</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Deployment/monitoring includes Grafana dashboards in <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">deployment/monitoring/grafana/dashboards/</code>. Prometheus scrape config and targets are in deployment/monitoring README. Deploy and connect Grafana to Prometheus per environment.
          </p>
          <ul className="list-none space-y-2" aria-label="Predefined Grafana dashboards">
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">BI Risk Overview</span>
              <code className="text-xs text-gray-500 dark:text-gray-400">bi-risk-overview.json</code>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Risk and BI metrics overview</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">ML Service</span>
              <code className="text-xs text-gray-500 dark:text-gray-400">ml-service.json</code>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Model health, predictions, drift</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Batch Jobs</span>
              <code className="text-xs text-gray-500 dark:text-gray-400">batch-jobs.json</code>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Batch job duration and status</span>
            </li>
          </ul>
        </section>
        <p className="text-sm text-gray-500">
          §9.1.1–9.1.2: Custom dashboard builder and share/schedule are deferred. No central admin API; when implemented, this page will offer widget library, data source selector, and schedule (frequency, recipients).
        </p>
        <Link href="/admin/analytics" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Analytics & Reporting (Overview)
        </Link>
      </div>
    </div>
  );
}

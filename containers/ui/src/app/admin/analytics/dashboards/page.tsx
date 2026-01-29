/**
 * Super Admin: Dashboard configuration (W11 §9.1)
 * Predefined Grafana dashboards exist; custom dashboard builder not yet implemented.
 */

'use client';

import Link from 'next/link';

export default function AnalyticsDashboardsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">Admin</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/analytics" className="text-sm font-medium hover:underline">Analytics & Reporting</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Dashboard Configuration</h1>
      <p className="text-muted-foreground mb-4">
        Predefined Grafana dashboards exist for BI/risk; a custom dashboard builder is not yet implemented.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/analytics" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Dashboards</span>
        <Link href="/admin/analytics/reports" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Reports</Link>
        <Link href="/admin/analytics/export" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Data Export</Link>
      </nav>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <section>
          <h2 className="text-sm font-semibold mb-2">Predefined dashboards</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Deployment/monitoring includes Grafana dashboards: <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">bi-risk-overview.json</code>, <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">ml-service.json</code>, <code className="rounded bg-gray-100 dark:bg-gray-800 px-1">batch-jobs.json</code>. Prometheus scrape config and targets are documented in deployment/monitoring README. Deploy and connect Grafana to Prometheus per environment.
          </p>
        </section>
        <p className="text-sm text-gray-500">
          A Super Admin UI to create or edit custom dashboards (widgets, filters, refresh) is not yet implemented.
        </p>
        <Link href="/admin/analytics" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Analytics & Reporting (Overview)
        </Link>
      </div>
    </div>
  );
}

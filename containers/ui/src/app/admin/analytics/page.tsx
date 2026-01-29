/**
 * Super Admin: Analytics & Reporting (W11)
 * Section 9 – dashboards, reports, export.
 */

'use client';

import Link from 'next/link';

export default function AnalyticsPage() {
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
      <h1 className="text-2xl font-bold mb-2">Analytics & Reporting</h1>
      <p className="text-muted-foreground mb-4">
        Configure dashboards, reports, and data exports (Super Admin §9).
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Overview
        </span>
        <Link
          href="/admin/analytics/dashboards"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Dashboards
        </Link>
        <Link
          href="/admin/analytics/reports"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Reports
        </Link>
        <Link
          href="/admin/analytics/export"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Data Export
        </Link>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/analytics/dashboards"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Dashboards</h2>
          <p className="text-sm text-gray-500">
            Create and share custom dashboards (widgets, filters, refresh)
          </p>
        </Link>
        <Link
          href="/admin/analytics/reports"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Reports</h2>
          <p className="text-sm text-gray-500">
            Create reports, metrics, filters; schedule delivery
          </p>
        </Link>
        <Link
          href="/admin/analytics/export"
          className="rounded-lg border p-6 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-lg font-semibold mb-2">Data Export</h2>
          <p className="text-sm text-gray-500">
            Configure exports (CSV, JSON, Parquet); schedule and destination
          </p>
        </Link>
      </div>
    </div>
  );
}

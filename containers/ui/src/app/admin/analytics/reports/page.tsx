/**
 * Super Admin: Report configuration (W11 §9.2)
 * Report builder and scheduling not yet implemented.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AnalyticsReportsPage() {
  useEffect(() => {
    document.title = 'Reports | Admin | Castiel';
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
      <h1 className="text-2xl font-bold mb-2">Report Configuration</h1>
      <p className="text-muted-foreground mb-4">
        Report builder (data sources, metrics, filters) and scheduled delivery are not yet implemented.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/analytics" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/analytics/dashboards" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Dashboards</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Reports</span>
        <Link href="/admin/analytics/export" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Data Export</Link>
      </nav>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <section>
          <h2 className="text-sm font-semibold mb-2">Planned scope</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Per plan §9.2: create reports (data sources, metrics, filters), schedule (daily, weekly, monthly), and delivery. Backend APIs and Super Admin UI for report builder and schedule are not yet implemented.
          </p>
        </section>
        <Link href="/admin/analytics" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Analytics & Reporting (Overview)
        </Link>
      </div>
    </div>
  );
}

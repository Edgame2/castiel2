/**
 * Super Admin: Report configuration (W11 §9.2)
 * Report builder and scheduling not yet implemented.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AnalyticsReportsPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId') ?? '';

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
      {tenantId && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 mb-4 text-sm">
          <span className="text-gray-700 dark:text-gray-300">Filtering by tenant: </span>
          <code className="font-mono text-gray-800 dark:text-gray-200">{tenantId}</code>
          <Link href={`/admin/tenants/${encodeURIComponent(tenantId)}`} className="ml-2 font-medium text-blue-600 dark:text-blue-400 hover:underline">
            View tenant →
          </Link>
        </div>
      )}
      <h1 className="text-2xl font-bold mb-2">Report Configuration</h1>
      <p className="text-muted-foreground mb-4">
        §9.2: Report builder (data sources, metrics, filters, output format) and scheduled delivery (frequency, recipients) are deferred; no central admin API. When implemented, this page will offer create report and schedule (§9.2.1–9.2.2).
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/analytics" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/analytics/dashboards" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Dashboards</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Reports</span>
        <Link href="/admin/analytics/export" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Data Export</Link>
      </nav>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <section>
          <h2 className="text-sm font-semibold mb-2">Predefined report types (§9.2)</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            The following report types will be configurable once the report builder (§9.2.1) and scheduling (§9.2.2) are implemented. Data sources, metrics, filters, and delivery are not yet configurable.
          </p>
          <ul className="list-none space-y-2" aria-label="Predefined report types">
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Risk Summary</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Opportunity risk scores, stage distribution, trends</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Feedback Summary</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Recommendation feedback volume, sentiment, per-type stats</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">ML Performance</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Model accuracy, latency, drift, endpoint health</span>
            </li>
            <li className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Tenant Usage</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Evaluations, predictions, feedback counts per tenant</span>
            </li>
          </ul>
        </section>
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

/**
 * Super Admin: Sales Methodology — Overview (§3)
 * §3.1.1 View All Methodologies card grid; links to Current tenant config, MEDDIC mapper.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { MethodologyCardGrid } from './MethodologyCardGrid';

export const metadata: Metadata = {
  title: 'Sales Methodology',
};

export default function SalesMethodologyOverviewPage() {
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
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Sales Methodology</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Sales Methodology</h1>
      <p className="text-muted-foreground mb-4">
        Methodology type, stages, requirements, risks, MEDDIC mapping. Per-tenant config via risk-analytics (§3).
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Overview
        </span>
        <Link
          href="/admin/sales-methodology/config"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Current tenant config
        </Link>
        <Link
          href="/admin/sales-methodology/meddic"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          MEDDIC mapper
        </Link>
      </nav>

      <div className="space-y-6">
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-semibold mb-4">Methodologies (§3.1.1)</h2>
          <MethodologyCardGrid />
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Current tenant config</h2>
            <Link
              href="/admin/sales-methodology/config"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Configure →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Set methodology type (MEDDIC, MEDDPICC, Challenger, Sandler, SPIN, Custom), stages (JSON), required fields, and methodology-specific risks for the current tenant. Used by risk-analytics for methodology-based decisions.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">MEDDIC mapper</h2>
            <Link
              href="/admin/sales-methodology/meddic"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Open mapper →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Map opportunity fields to MEDDIC components (Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion, Competition). Available when backend supports MEDDIC field mapping.
          </p>
        </section>
        <p className="text-sm text-gray-500">
          Per-tenant methodology assignment: use Tenant Management to select a tenant, then configure methodology here (current tenant) or from the tenant detail page when linked.
        </p>
      </div>
    </div>
  );
}

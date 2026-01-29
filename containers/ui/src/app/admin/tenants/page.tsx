/**
 * Super Admin: Tenant Management — Overview (§7)
 * Links to Tenants list, Templates; per-tenant config via tenant detail.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tenant Management',
};

export default function TenantManagementOverviewPage() {
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
        <span className="text-sm font-medium">Tenant Management</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Tenant Management</h1>
      <p className="text-muted-foreground mb-4">
        View tenants, per-tenant feedback config, methodology, limits; templates (§7).
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Overview
        </span>
        <Link
          href="/admin/tenants/list"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Tenants
        </Link>
        <Link
          href="/admin/tenants/templates"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Templates
        </Link>
      </nav>

      <div className="space-y-6">
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Tenants</h2>
            <Link
              href="/admin/tenants/list"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View tenants →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            List all tenants (GET /api/v1/admin/tenants). Open a tenant to configure feedback, methodology, limits (§7.1). Links to Feedback System and Sales Methodology.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Templates</h2>
            <Link
              href="/admin/tenants/templates"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View templates →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create and apply tenant templates (methodology, feedback config, limits). Apply template to overwrite tenant config (§7.2).
          </p>
        </section>
      </div>
    </div>
  );
}

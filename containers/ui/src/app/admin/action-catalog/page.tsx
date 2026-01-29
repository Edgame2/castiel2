/**
 * Super Admin: Action Catalog — Overview (§2)
 * Links to Entries, Categories, Relationships (Risks + Recommendations).
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Action Catalog',
};

export default function ActionCatalogOverviewPage() {
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
        <span className="text-sm font-medium">Action Catalog</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Action Catalog</h1>
      <p className="text-muted-foreground mb-4">
        Manage risks and recommendations (catalog entries), categories, and risk–recommendation relationships. Super Admin §2.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Overview
        </span>
        <Link
          href="/admin/action-catalog/entries"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Entries
        </Link>
        <Link
          href="/admin/action-catalog/categories"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Categories
        </Link>
        <Link
          href="/admin/action-catalog/relationships"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Relationships
        </Link>
      </nav>

      <div className="space-y-6">
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Catalog entries</h2>
            <Link
              href="/admin/action-catalog/entries"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Manage entries →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create and edit risk and recommendation entries. Filter by type, category, status; configure applicability and decision rules.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Categories</h2>
            <Link
              href="/admin/action-catalog/categories"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Manage categories →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View and manage catalog categories (risk/recommendation/both). Reorder, edit display name, icon, color.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Relationships</h2>
            <Link
              href="/admin/action-catalog/relationships"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View relationships →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Visual graph and editor for risk–recommendation links (mitigates, addresses, etc.). Relationship analytics.
          </p>
        </section>
        <p className="text-sm text-gray-500">
          For tenant catalog view (categories, templates, industry risks), see{' '}
          <Link href="/admin/risk-catalog" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Risk Catalog
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

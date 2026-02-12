/**
 * Super Admin: Action Catalog — Overview (§2)
 * Links to Entries, Categories, Relationships (Risks + Recommendations).
 * Summary counts and Refresh for consistency with other admin pages.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GENERIC_ERROR_MESSAGE, apiFetch, getApiBaseUrl } from '@/lib/api';

interface OverviewStats {
  entriesCount: number;
  categoriesCount: number;
  relationshipsCount: number;
}

export default function ActionCatalogOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!getApiBaseUrl()) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [entriesRes, categoriesRes, relationshipsRes] = await Promise.all([
        apiFetch('/api/v1/action-catalog/entries'),
        apiFetch('/api/v1/action-catalog/categories'),
        apiFetch('/api/v1/action-catalog/relationships'),
      ]);
      if (!entriesRes.ok || !categoriesRes.ok || !relationshipsRes.ok) {
        throw new Error('Failed to load catalog stats');
      }
      const [entries, categories, relationships] = await Promise.all([
        entriesRes.json(),
        categoriesRes.json(),
        relationshipsRes.json(),
      ]);
      setStats({
        entriesCount: Array.isArray(entries) ? entries.length : 0,
        categoriesCount: Array.isArray(categories) ? categories.length : 0,
        relationshipsCount: Array.isArray(relationships) ? relationships.length : 0,
      });
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    document.title = 'Action Catalog | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Action Catalog</h1>
          <p className="text-muted-foreground">
            Manage risks and recommendations (catalog entries), categories, and risk–recommendation relationships. Super Admin §2.
          </p>
        </div>
        {getApiBaseUrl() && (
          <Button type="button" variant="outline" onClick={fetchStats} disabled={loading}>
            Refresh
          </Button>
        )}
      </div>
      {!getApiBaseUrl() && (
        <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}
      {error && (
        <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-900/20 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            <Button type="button" variant="link" onClick={() => fetchStats()} className="mt-2">
              Retry
            </Button>
        </div>
      )}
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
          {stats !== null && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {loading ? '…' : `${stats.entriesCount} entr${stats.entriesCount === 1 ? 'y' : 'ies'}`}
            </p>
          )}
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
          {stats !== null && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {loading ? '…' : `${stats.categoriesCount} categor${stats.categoriesCount === 1 ? 'y' : 'ies'}`}
            </p>
          )}
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
          {stats !== null && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {loading ? '…' : `${stats.relationshipsCount} relationship${stats.relationshipsCount === 1 ? '' : 's'}`}
            </p>
          )}
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

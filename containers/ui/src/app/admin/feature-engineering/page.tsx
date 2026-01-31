/**
 * Super Admin: Feature Engineering — Overview (§5)
 * Features, versioning, quality monitoring (ml-service Layer 2).
 * Summary count and Refresh for consistency with other admin pages.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function FeatureEngineeringOverviewPage() {
  const [versionsCount, setVersionsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!apiBaseUrl) {
      setVersionsCount(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/ml/features/versions`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load feature versions');
      const json = await res.json();
      setVersionsCount(Array.isArray(json?.items) ? json.items.length : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
      setVersionsCount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    document.title = 'Feature Engineering | Admin | Castiel';
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
        <span className="text-sm font-medium">Feature Engineering</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Feature Engineering</h1>
          <p className="text-muted-foreground">
            Feature management, versioning, and quality monitoring for ml-service Layer 2. Super Admin §5.
          </p>
        </div>
        {apiBaseUrl && (
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
          >
            Refresh
          </button>
        )}
      </div>
      {!apiBaseUrl && (
        <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-900/20 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}
      {error && (
        <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-900/20 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          <button
            type="button"
            onClick={() => fetchStats()}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Retry
          </button>
        </div>
      )}
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Overview
        </span>
        <Link
          href="/admin/feature-engineering/features"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Features
        </Link>
        <Link
          href="/admin/feature-engineering/versioning"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Versioning
        </Link>
        <Link
          href="/admin/feature-engineering/quality"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Quality
        </Link>
      </nav>

      <div className="space-y-6">
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Features</h2>
            <Link
              href="/admin/feature-engineering/features"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View features →
            </Link>
          </div>
          {versionsCount !== null && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {loading ? '…' : `${versionsCount} feature version${versionsCount === 1 ? '' : 's'}`}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Feature versions and schema (GET /api/v1/ml/features/versions, /schema) for ml-service Layer 2. §5.1, §4.3.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Versioning</h2>
            <Link
              href="/admin/feature-engineering/versioning"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Version history & policy →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Version history, version policy (semantic/timestamp/hash), backward compatibility, deprecation. §5.2.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Quality</h2>
            <Link
              href="/admin/feature-engineering/quality"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Quality dashboard & rules →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Quality dashboard (missing rate, outliers, drift), quality rules per feature. §5.3.
          </p>
        </section>
      </div>
    </div>
  );
}

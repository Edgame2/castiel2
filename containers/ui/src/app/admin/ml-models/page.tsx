/**
 * Super Admin: ML Models — Overview (§4)
 * Links to Models (health), Endpoints, Features, Monitoring (ml-service).
 * Summary counts and Refresh for consistency with other admin pages.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface OverviewStats {
  modelsHealthCount: number;
  endpointsCount: number;
}

export default function MLModelsOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!apiBaseUrl) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [healthRes, endpointsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/ml/models/health`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/v1/ml/endpoints`, { credentials: 'include' }),
      ]);
      if (!healthRes.ok || !endpointsRes.ok) {
        throw new Error('Failed to load ML stats');
      }
      const [healthJson, endpointsJson] = await Promise.all([
        healthRes.json(),
        endpointsRes.json(),
      ]);
      const modelsHealthCount =
        healthJson?.endpoints && typeof healthJson.endpoints === 'object'
          ? Object.keys(healthJson.endpoints).length
          : 0;
      const endpointsCount = Array.isArray(endpointsJson?.items) ? endpointsJson.items.length : 0;
      setStats({ modelsHealthCount, endpointsCount });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    document.title = 'ML Models | Admin | Castiel';
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
        <span className="text-sm font-medium">ML Models</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">ML Models</h1>
          <p className="text-muted-foreground">
            Model/endpoint health, features, and monitoring for ml-service (Azure ML). Super Admin §4.
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
          href="/admin/ml-models/models"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Models & health
        </Link>
        <Link
          href="/admin/ml-models/endpoints"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Endpoints
        </Link>
        <Link
          href="/admin/ml-models/features"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Features
        </Link>
        <Link
          href="/admin/ml-models/monitoring"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Monitoring
        </Link>
      </nav>

      <div className="space-y-6">
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Models & health</h2>
            <Link
              href="/admin/ml-models/models"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View health →
            </Link>
          </div>
          {stats !== null && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {loading ? '…' : `${stats.modelsHealthCount} model${stats.modelsHealthCount === 1 ? '' : 's'} in health`}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Azure ML endpoint health (status, latency) via GET /api/v1/ml/models/health. Model list, detail, test, retrain, and A/B when backend supports full §4.1.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Endpoints</h2>
            <Link
              href="/admin/ml-models/endpoints"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View endpoints →
            </Link>
          </div>
          {stats !== null && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {loading ? '…' : `${stats.endpointsCount} endpoint${stats.endpointsCount === 1 ? '' : 's'}`}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Endpoint management and connectivity tests (§4.2). Currently covered by Models & health; dedicated endpoint table when available.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Features</h2>
            <Link
              href="/admin/ml-models/features"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Feature store →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Feature versions and schema (ml-service Layer 2). Full feature store config at §4.3 when available; versions/schema in Feature Engineering.
          </p>
        </section>
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Monitoring</h2>
            <Link
              href="/admin/ml-models/monitoring"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Monitoring & alerts →
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Model health dashboard, alert rules, drift (§4.4). Grafana/Prometheus runbooks in deployment/monitoring.
          </p>
        </section>
      </div>
    </div>
  );
}

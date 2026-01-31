/**
 * Super Admin: Tenant Management — Overview (§7)
 * Links to Tenants list, Templates; per-tenant config via tenant detail.
 * Summary count and Refresh for consistency with other admin pages.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function TenantManagementOverviewPage() {
  const [tenantsCount, setTenantsCount] = useState<number | null>(null);
  const [templatesCount, setTemplatesCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!apiBaseUrl) {
      setTenantsCount(null);
      setTemplatesCount(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [tenantsRes, templatesRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/admin/tenants`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/v1/admin/tenant-templates`, { credentials: 'include' }),
      ]);
      if (!tenantsRes.ok) throw new Error('Failed to load tenants');
      const tenantsJson = await tenantsRes.json();
      setTenantsCount(Array.isArray(tenantsJson?.items) ? tenantsJson.items.length : 0);
      if (templatesRes.ok) {
        const templatesJson = await templatesRes.json();
        setTemplatesCount(Array.isArray(templatesJson?.items) ? templatesJson.items.length : 0);
      } else {
        setTemplatesCount(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
      setTenantsCount(null);
      setTemplatesCount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    document.title = 'Tenant Management | Admin | Castiel';
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
        <span className="text-sm font-medium">Tenant Management</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Tenant Management</h1>
          <p className="text-muted-foreground">
            View tenants, per-tenant feedback config, methodology, limits; templates (§7).
          </p>
        </div>
        {apiBaseUrl && (
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="px-4 py-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
            aria-label="Refresh tenant management stats"
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
          {tenantsCount !== null && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {loading ? '…' : `${tenantsCount} tenant${tenantsCount === 1 ? '' : 's'}`}
            </p>
          )}
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
          {templatesCount !== null && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {loading ? '…' : `${templatesCount} template${templatesCount === 1 ? '' : 's'}`}
            </p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create and apply tenant templates (methodology, feedback config, limits). Apply template to overwrite tenant config (§7.2).
          </p>
        </section>
      </div>
    </div>
  );
}

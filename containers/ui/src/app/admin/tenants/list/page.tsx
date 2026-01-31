/**
 * Super Admin: Tenant Management — Tenants list (§7.1)
 * GET /api/v1/admin/tenants via gateway (recommendations).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type TenantStatus = 'active' | 'trial' | 'suspended' | 'inactive';

interface TenantRow {
  id: string;
  name?: string;
  industry?: string;
  status?: TenantStatus;
  createdAt?: string;
  activeUsers?: number;
  activeOpportunities?: number;
  predictionsPerDay?: number;
  feedbackPerDay?: number;
  methodology?: string;
  feedbackLimit?: number;
  customCatalogEntries?: number;
  avgRecommendationAccuracy?: number;
  avgActionRate?: number;
}

export default function TenantsListPage() {
  const [items, setItems] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TenantStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'' | 'id' | 'name' | 'status' | 'createdAt'>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchTenants = useCallback(async () => {
    if (!apiBaseUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/tenants`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiBaseUrl) fetchTenants();
    else {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
    }
  }, [apiBaseUrl, fetchTenants]);

  useEffect(() => {
    document.title = 'Tenants | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const filtered = items.filter((row) => {
    if (statusFilter && (row.status ?? '') !== statusFilter) return false;
    if (q) {
      const name = (row.name ?? '').toLowerCase();
      const id = (row.id ?? '').toLowerCase();
      if (!name.includes(q) && !id.includes(q)) return false;
    }
    return true;
  });

  const sorted = (() => {
    if (!sortBy) return filtered;
    const arr = [...filtered];
    const mult = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      switch (sortBy) {
        case 'id':
          va = (a.id ?? '').toLowerCase();
          vb = (b.id ?? '').toLowerCase();
          return mult * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'name':
          va = (a.name ?? '').toLowerCase();
          vb = (b.name ?? '').toLowerCase();
          return mult * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'status':
          va = a.status ?? '';
          vb = b.status ?? '';
          return mult * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'createdAt': {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return mult * (ta - tb);
        }
        default:
          return 0;
      }
    });
    return arr;
  })();

  const handleExportTenantData = () => {
    if (sorted.length === 0) return;
    const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenants-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const subNav = (
    <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
      <Link
        href="/admin/tenants"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Overview
      </Link>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
        Tenants
      </span>
      <Link
        href="/admin/tenants/templates"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Templates
      </Link>
    </nav>
  );

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
        <Link href="/admin/tenants" className="text-sm font-medium hover:underline">
          Tenant Management
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Tenants</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Tenants</h1>
      <p className="text-muted-foreground mb-4">
        View and manage tenants. Per-tenant feedback config: <code className="text-sm">/api/v1/admin/tenants/:tenantId/feedback-config</code> (§7.1).
      </p>
      {subNav}

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {apiBaseUrl && (
        <div className="mb-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Status (§7.1.1)</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TenantStatus | '')}
              className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Search (§7.1.1)</label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name or ID…"
              className="w-48 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
              aria-label="Search by name or ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sort by (§7.1.1)</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-40 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
              aria-label="Sort by"
            >
              <option value="">Default</option>
              <option value="id">ID</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="createdAt">Created</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Order</label>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
              className="w-32 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 text-sm"
              aria-label="Sort direction"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <button
            type="button"
            onClick={fetchTenants}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            aria-label="Refresh tenant list"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportTenantData}
            disabled={sorted.length === 0}
            className="px-4 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-sm"
          >
            Export tenant data (§7.1.3)
          </button>
          <Link
            href="/admin/tenants/templates"
            className="px-4 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Tenant Templates
          </Link>
        </div>
      )}

      {loading && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {!loading && !error && apiBaseUrl && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-semibold mb-3">Tenants</h2>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">No tenants returned. Tenant list is provided by the backend (stub returns empty).</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-gray-500">No tenants match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left py-2 px-4">ID</th>
                    <th className="text-left py-2 px-4">Name</th>
                    <th className="text-left py-2 px-4">Industry</th>
                    <th className="text-left py-2 px-4">Status</th>
                    <th className="text-left py-2 px-4">Created</th>
                    <th className="text-left py-2 px-4">Users</th>
                    <th className="text-left py-2 px-4">Opportunities</th>
                    <th className="text-left py-2 px-4">Predictions/day</th>
                    <th className="text-left py-2 px-4">Feedback/day</th>
                    <th className="text-left py-2 px-4">Methodology</th>
                    <th className="text-left py-2 px-4">Feedback limit</th>
                    <th className="text-left py-2 px-4">Custom catalog</th>
                    <th className="text-left py-2 px-4">Accuracy</th>
                    <th className="text-left py-2 px-4">Action rate</th>
                    <th className="text-left py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-2 px-4">{row.id}</td>
                      <td className="py-2 px-4">{row.name ?? '—'}</td>
                      <td className="py-2 px-4">{row.industry ?? '—'}</td>
                      <td className="py-2 px-4">{row.status ?? '—'}</td>
                      <td className="py-2 px-4">{row.createdAt ?? '—'}</td>
                      <td className="py-2 px-4">{row.activeUsers ?? '—'}</td>
                      <td className="py-2 px-4">{row.activeOpportunities ?? '—'}</td>
                      <td className="py-2 px-4">{row.predictionsPerDay ?? '—'}</td>
                      <td className="py-2 px-4">{row.feedbackPerDay ?? '—'}</td>
                      <td className="py-2 px-4">{row.methodology ?? '—'}</td>
                      <td className="py-2 px-4">{row.feedbackLimit ?? '—'}</td>
                      <td className="py-2 px-4">{row.customCatalogEntries ?? '—'}</td>
                      <td className="py-2 px-4">{row.avgRecommendationAccuracy != null ? `${row.avgRecommendationAccuracy}%` : '—'}</td>
                      <td className="py-2 px-4">{row.avgActionRate != null ? `${row.avgActionRate}%` : '—'}</td>
                      <td className="py-2 px-4">
                        <span className="flex flex-wrap gap-x-2 gap-y-1">
                          <Link href={`/admin/tenants/${row.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            View
                          </Link>
                          <Link href={`/admin/tenants/${row.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            Edit
                          </Link>
                          <Link href={`/admin/tenants/${row.id}?tab=feedback`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            Configure
                          </Link>
                          <Link href={`/admin/tenants/${row.id}?tab=analytics`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            Analytics
                          </Link>
                          <button type="button" disabled className="text-gray-400 cursor-not-allowed" title="Coming soon">
                            Suspend
                          </button>
                          <button type="button" disabled className="text-gray-400 cursor-not-allowed" title="Coming soon">
                            Delete
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

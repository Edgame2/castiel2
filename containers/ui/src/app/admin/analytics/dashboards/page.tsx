/**
 * Super Admin: Dashboard configuration (§9.1)
 * GET/PUT /api/v1/system/analytics via gateway (configuration-service). List + create dashboards.
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface DashboardDef {
  id: string;
  name: string;
  dataSource?: string;
  refreshIntervalSeconds?: number;
  widgets?: string[];
  createdAt?: string;
}

interface AnalyticsConfig {
  dashboards: DashboardDef[];
  reports: DashboardDef[];
  exportConfig: Record<string, unknown>;
}

const DEFAULT_ANALYTICS: AnalyticsConfig = {
  dashboards: [],
  reports: [],
  exportConfig: {},
};

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as { randomUUID?: () => string }).randomUUID === 'function') {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `dash-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function AnalyticsDashboardsContent() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId') ?? '';
  const [config, setConfig] = useState<AnalyticsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDataSource, setCreateDataSource] = useState('');
  const [createRefresh, setCreateRefresh] = useState(300);

  const fetchConfig = useCallback(async () => {
    if (!apiBaseUrl) {
      setConfig(DEFAULT_ANALYTICS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/system/analytics`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConfig({
        dashboards: data.dashboards ?? [],
        reports: data.reports ?? [],
        exportConfig: data.exportConfig ?? {},
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfig(DEFAULT_ANALYTICS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    document.title = 'Dashboards | Admin | Castiel';
    return () => { document.title = 'Admin | Castiel'; };
  }, []);

  const handleSave = async (nextDashboards: DashboardDef[]) => {
    if (!apiBaseUrl || !config) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/system/analytics`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, dashboards: nextDashboards }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConfig({ ...config, dashboards: data.dashboards ?? [] });
      setShowCreate(false);
      setCreateName('');
      setCreateDataSource('');
      setCreateRefresh(300);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = () => {
    if (!createName.trim() || !config) return;
    const newDash: DashboardDef = {
      id: generateId(),
      name: createName.trim(),
      dataSource: createDataSource.trim() || undefined,
      refreshIntervalSeconds: createRefresh,
      widgets: [],
      createdAt: new Date().toISOString(),
    };
    handleSave([...config.dashboards, newDash]);
  };

  const handleDelete = (id: string) => {
    if (!config || !window.confirm('Delete this dashboard?')) return;
    handleSave(config.dashboards.filter((d) => d.id !== id));
  };

  if (loading) {
    return (
      <div className="p-6">
        <Link href="/admin/analytics" className="text-sm font-medium hover:underline">← Analytics</Link>
        <p className="text-muted-foreground mt-4">Loading dashboards…</p>
      </div>
    );
  }

  const dashboards = config?.dashboards ?? [];

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
        </div>
      )}
      <h1 className="text-2xl font-bold mb-2">Dashboard Configuration</h1>
      <p className="text-muted-foreground mb-4">List and create custom dashboards (§9.1).</p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/analytics" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Dashboards</span>
        <Link href="/admin/analytics/reports" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Reports</Link>
        <Link href="/admin/analytics/export" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Data Export</Link>
      </nav>
      {error && <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">{error}</p>}
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Dashboards</h2>
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-1.5 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {showCreate ? 'Cancel' : 'Create dashboard'}
          </button>
        </div>
        {showCreate && (
          <div className="rounded border border-gray-200 dark:border-gray-700 p-4 space-y-3 max-w-md">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Dashboard name"
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
            <input
              type="text"
              value={createDataSource}
              onChange={(e) => setCreateDataSource(e.target.value)}
              placeholder="Data source (optional)"
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
            <div>
              <label className="block text-sm font-medium mb-1">Refresh interval (seconds)</label>
              <input
                type="number"
                min={60}
                value={createRefresh}
                onChange={(e) => setCreateRefresh(parseInt(e.target.value, 10) || 300)}
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!createName.trim() || saving}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
            >
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        )}
        <ul className="list-none space-y-2">
          {dashboards.length === 0 && !showCreate && (
            <li className="text-sm text-gray-500">No dashboards yet. Create one above.</li>
          )}
          {dashboards.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{d.name}</span>
              {d.dataSource && <span className="text-xs text-gray-500 dark:text-gray-400">{d.dataSource}</span>}
              {d.refreshIntervalSeconds && <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Refresh: {d.refreshIntervalSeconds}s</span>}
              <button
                type="button"
                onClick={() => handleDelete(d.id)}
                className="ml-auto text-sm text-red-600 dark:text-red-400 hover:underline"
                aria-label={`Delete ${d.name}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Link href="/admin/analytics" className="inline-block mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">← Back to Analytics & Reporting</Link>
    </div>
  );
}

export default function AnalyticsDashboardsPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <Link href="/admin/analytics" className="text-sm font-medium hover:underline">← Analytics</Link>
        <p className="text-muted-foreground mt-4">Loading…</p>
      </div>
    }>
      <AnalyticsDashboardsContent />
    </Suspense>
  );
}

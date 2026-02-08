'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

function generateId(): string {
  if (typeof crypto !== 'undefined' && (crypto as { randomUUID?: () => string }).randomUUID) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `dash-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

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

export default function AnalyticsDashboardNewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(300);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !name.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    fetch(`${apiBase}/api/v1/system/analytics`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((config: AnalyticsConfig) => {
        const newId = generateId();
        const newDash: DashboardDef = {
          id: newId,
          name: name.trim(),
          dataSource: dataSource.trim() || undefined,
          refreshIntervalSeconds,
          widgets: [],
          createdAt: new Date().toISOString(),
        };
        return fetch(`${apiBase}/api/v1/system/analytics`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...config, dashboards: [...(config.dashboards ?? []), newDash] }),
        }).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          router.push(`/admin/analytics/dashboards/${encodeURIComponent(newId)}`);
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/analytics">Analytics</Link><span>/</span>
          <Link href="/admin/analytics/dashboards">Dashboards</Link><span>/</span>
          <span className="text-foreground">New dashboard</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create dashboard</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
          </div>
          <div>
            <label htmlFor="dataSource" className="block text-sm font-medium mb-1">Data source (optional)</label>
            <input id="dataSource" type="text" value={dataSource} onChange={(e) => setDataSource(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label htmlFor="refresh" className="block text-sm font-medium mb-1">Refresh interval (seconds)</label>
            <input id="refresh" type="number" min={60} value={refreshIntervalSeconds} onChange={(e) => setRefreshIntervalSeconds(parseInt(e.target.value, 10) || 300)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting || !name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create</button>
            <Link href="/admin/analytics/dashboards" className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Link>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/analytics/dashboards" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Dashboards</Link></p>
      </div>
    </div>
  );
}

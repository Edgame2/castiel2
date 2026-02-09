'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

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

export default function AnalyticsDashboardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [config, setConfig] = useState<AnalyticsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(300);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!apiBase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/system/analytics`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: AnalyticsConfig) => {
        setConfig(data);
        const dash = (data.dashboards ?? []).find((d) => d.id === id);
        if (dash) {
          setName(dash.name ?? '');
          setDataSource(dash.dataSource ?? '');
          setRefreshIntervalSeconds(dash.refreshIntervalSeconds ?? 300);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setConfig(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const dashboard = config?.dashboards?.find((d) => d.id === id);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !config || !dashboard || saving) return;
    setSaveError(null);
    setSaving(true);
    const updated = config.dashboards.map((d) =>
      d.id === id
        ? { ...d, name: name.trim(), dataSource: dataSource.trim() || undefined, refreshIntervalSeconds }
        : d
    );
    fetch(`${apiBase}/api/v1/system/analytics`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, dashboards: updated }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Save failed');
        setEditing(false);
        fetchConfig();
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Save failed'))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!apiBase || !config || !dashboard || deleting) return;
    setDeleting(true);
    const next = (config.dashboards ?? []).filter((d) => d.id !== id);
    fetch(`${apiBase}/api/v1/system/analytics`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, dashboards: next }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Delete failed');
        router.push('/admin/analytics/dashboards');
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Delete failed'))
      .finally(() => setDeleting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/analytics">Analytics</Link><span>/</span>
          <Link href="/admin/analytics/dashboards">Dashboards</Link><span>/</span>
          <span className="text-foreground">Dashboard</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{saveError}</p>}

        {!loading && !error && dashboard && (
          <>
            <h1 className="text-xl font-semibold mb-4">{dashboard.name}</h1>

            {!editing ? (
              <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
                <p><span className="text-gray-500">ID:</span> {dashboard.id}</p>
                <p><span className="text-gray-500">Name:</span> {dashboard.name}</p>
                {dashboard.dataSource != null && <p><span className="text-gray-500">Data source:</span> {dashboard.dataSource}</p>}
                {dashboard.refreshIntervalSeconds != null && <p><span className="text-gray-500">Refresh:</span> {dashboard.refreshIntervalSeconds}s</p>}
                {dashboard.createdAt && <p><span className="text-gray-500">Created:</span> {new Date(dashboard.createdAt).toLocaleString()}</p>}
                <div className="flex gap-2 mt-4">
                  <Button type="button" onClick={() => setEditing(true)}>Edit</Button>
                  <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(true)}>Delete</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataSource">Data source (optional)</Label>
                  <Input id="dataSource" type="text" value={dataSource} onChange={(e) => setDataSource(e.target.value)} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refresh">Refresh interval (seconds)</Label>
                  <Input id="refresh" type="number" min={60} value={refreshIntervalSeconds} onChange={(e) => setRefreshIntervalSeconds(parseInt(e.target.value, 10) || 300)} className="w-full" />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>Save</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-destructive/30 bg-destructive/10">
                <p className="text-sm mb-2">Delete this dashboard?</p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>Delete</Button>
                  <Button type="button" variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !dashboard && config && (
          <p className="text-sm text-gray-500">Dashboard not found.</p>
        )}
        <p className="mt-4"><Link href="/admin/analytics/dashboards" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Dashboards</Link></p>
      </div>
    </div>
  );
}

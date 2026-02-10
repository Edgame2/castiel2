'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

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
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setError(GENERIC_ERROR_MESSAGE); })
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
            <Button type="submit" disabled={submitting || !name.trim()}>Create</Button>
            <Button asChild variant="outline">
              <Link href="/admin/analytics/dashboards">Cancel</Link>
            </Button>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/analytics/dashboards" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Dashboards</Link></p>
      </div>
    </div>
  );
}

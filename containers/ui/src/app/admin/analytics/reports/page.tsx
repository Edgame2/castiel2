/**
 * Super Admin: Report configuration (§9.2)
 * GET/PUT /api/v1/system/analytics via gateway (configuration-service). List + create reports.
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface ReportDef {
  id: string;
  name: string;
  dataSources?: string[];
  metrics?: string[];
  outputFormat?: string;
  schedule?: string;
  recipients?: string[];
  createdAt?: string;
}

interface AnalyticsConfig {
  dashboards: unknown[];
  reports: ReportDef[];
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
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function AnalyticsReportsContent() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId') ?? '';
  const [config, setConfig] = useState<AnalyticsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDataSources, setCreateDataSources] = useState('');
  const [createFormat, setCreateFormat] = useState<'PDF' | 'Excel' | 'CSV'>('CSV');
  const [createSchedule, setCreateSchedule] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

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
    document.title = 'Reports | Admin | Castiel';
    return () => { document.title = 'Admin | Castiel'; };
  }, []);

  const handleSave = async (nextReports: ReportDef[]) => {
    if (!apiBaseUrl || !config) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/system/analytics`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, reports: nextReports }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConfig({ ...config, reports: data.reports ?? [] });
      setShowCreate(false);
      setCreateName('');
      setCreateDataSources('');
      setCreateFormat('CSV');
      setCreateSchedule('weekly');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = () => {
    if (!createName.trim() || !config) return;
    const newReport: ReportDef = {
      id: generateId(),
      name: createName.trim(),
      dataSources: createDataSources.split(',').map((s) => s.trim()).filter(Boolean),
      outputFormat: createFormat,
      schedule: createSchedule,
      recipients: [],
      createdAt: new Date().toISOString(),
    };
    handleSave([...config.reports, newReport]);
  };

  const handleDelete = (id: string) => {
    if (!config || !window.confirm('Delete this report?')) return;
    handleSave(config.reports.filter((r) => r.id !== id));
  };

  if (loading) {
    return (
      <div className="p-6">
        <Link href="/admin/analytics" className="text-sm font-medium hover:underline">← Analytics</Link>
        <p className="text-muted-foreground mt-4">Loading reports…</p>
      </div>
    );
  }

  const reports = config?.reports ?? [];

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
      <h1 className="text-2xl font-bold mb-2">Report Configuration</h1>
      <p className="text-muted-foreground mb-4">List and create reports (§9.2).</p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/analytics" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/analytics/dashboards" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Dashboards</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Reports</span>
        <Link href="/admin/analytics/export" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Data Export</Link>
      </nav>
      {error && <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">{error}</p>}
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Reports</h2>
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-1.5 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {showCreate ? 'Cancel' : 'Create report'}
          </button>
        </div>
        {showCreate && (
          <div className="rounded border border-gray-200 dark:border-gray-700 p-4 space-y-3 max-w-md">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Report name"
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
            <input
              type="text"
              value={createDataSources}
              onChange={(e) => setCreateDataSources(e.target.value)}
              placeholder="Data sources (comma-separated)"
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
            <div>
              <label className="block text-sm font-medium mb-1">Output format</label>
              <select
                value={createFormat}
                onChange={(e) => setCreateFormat(e.target.value as 'PDF' | 'Excel' | 'CSV')}
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="PDF">PDF</option>
                <option value="Excel">Excel</option>
                <option value="CSV">CSV</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Schedule</label>
              <select
                value={createSchedule}
                onChange={(e) => setCreateSchedule(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
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
          {reports.length === 0 && !showCreate && (
            <li className="text-sm text-gray-500">No reports yet. Create one above.</li>
          )}
          {reports.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 p-3">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{r.name}</span>
              {r.outputFormat && <span className="text-xs text-gray-500 dark:text-gray-400">{r.outputFormat}</span>}
              {r.schedule && <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Schedule: {r.schedule}</span>}
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="ml-auto text-sm text-red-600 dark:text-red-400 hover:underline"
                aria-label={`Delete ${r.name}`}
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

export default function AnalyticsReportsPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <Link href="/admin/analytics" className="text-sm font-medium hover:underline">← Analytics</Link>
        <p className="text-muted-foreground mt-4">Loading…</p>
      </div>
    }>
      <AnalyticsReportsContent />
    </Suspense>
  );
}

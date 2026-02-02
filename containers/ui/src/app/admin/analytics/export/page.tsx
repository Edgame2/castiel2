/**
 * Super Admin: Data export configuration (§9.3)
 * GET/PUT /api/v1/system/analytics via gateway (configuration-service). Export config form.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface ExportConfig {
  datasets?: string[];
  format?: 'CSV' | 'JSON' | 'Parquet';
  schedule?: 'daily' | 'weekly' | 'monthly';
  retentionDays?: number;
}

interface AnalyticsConfig {
  dashboards: unknown[];
  reports: unknown[];
  exportConfig: ExportConfig;
}

const DEFAULT_EXPORT: ExportConfig = {
  datasets: [],
  format: 'CSV',
  schedule: 'daily',
  retentionDays: 90,
};

export default function AnalyticsExportPage() {
  const [config, setConfig] = useState<AnalyticsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>(DEFAULT_EXPORT);
  const [datasetsInput, setDatasetsInput] = useState('');

  const fetchConfig = useCallback(async () => {
    if (!apiBaseUrl) {
      setExportConfig(DEFAULT_EXPORT);
      setDatasetsInput('');
      setConfig({ dashboards: [], reports: [], exportConfig: DEFAULT_EXPORT });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/system/analytics`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const ec = data.exportConfig ?? DEFAULT_EXPORT;
      setConfig({
        dashboards: data.dashboards ?? [],
        reports: data.reports ?? [],
        exportConfig: ec,
      });
      setExportConfig({ ...DEFAULT_EXPORT, ...ec });
      setDatasetsInput(Array.isArray(ec.datasets) ? ec.datasets.join(', ') : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setExportConfig(DEFAULT_EXPORT);
      setConfig({ dashboards: [], reports: [], exportConfig: DEFAULT_EXPORT });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    document.title = 'Data Export | Admin | Castiel';
    return () => { document.title = 'Admin | Castiel'; };
  }, []);

  const update = (updates: Partial<ExportConfig>) => {
    setExportConfig((prev) => ({ ...prev, ...updates }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!apiBaseUrl || !config) return;
    setSaving(true);
    setSaveError(null);
    const ec = {
      ...exportConfig,
      datasets: datasetsInput.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/system/analytics`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, exportConfig: ec }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const updated = data.exportConfig ?? ec;
      setExportConfig({ ...DEFAULT_EXPORT, ...updated });
      setDatasetsInput(Array.isArray(updated.datasets) ? updated.datasets.join(', ') : '');
      setConfig({ ...config, exportConfig: updated });
      setDirty(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Link href="/admin/analytics" className="text-sm font-medium hover:underline">← Analytics</Link>
        <p className="text-muted-foreground mt-4">Loading export configuration…</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">Admin</Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/analytics" className="text-sm font-medium hover:underline">Analytics & Reporting</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Data Export Configuration</h1>
      <p className="text-muted-foreground mb-4">Datasets, format, schedule, and retention (§9.3).</p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/analytics" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/analytics/dashboards" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Dashboards</Link>
        <Link href="/admin/analytics/reports" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Reports</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Data Export</span>
      </nav>
      {error && <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">{error}</p>}
      {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{saveError}</p>}
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <div className="grid gap-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium mb-1">Datasets (comma-separated)</label>
            <input
              type="text"
              value={datasetsInput}
              onChange={(e) => { setDatasetsInput(e.target.value); setDirty(true); }}
              placeholder="e.g. risk_evaluations, ml_predictions, feedback"
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <select
              value={exportConfig.format ?? 'CSV'}
              onChange={(e) => update({ format: e.target.value as ExportConfig['format'] })}
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="CSV">CSV</option>
              <option value="JSON">JSON</option>
              <option value="Parquet">Parquet</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Schedule</label>
            <select
              value={exportConfig.schedule ?? 'daily'}
              onChange={(e) => update({ schedule: e.target.value as ExportConfig['schedule'] })}
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Retention (days)</label>
            <input
              type="number"
              min={1}
              value={exportConfig.retentionDays ?? 90}
              onChange={(e) => update({ retentionDays: parseInt(e.target.value, 10) || undefined })}
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => { fetchConfig(); setDirty(false); }}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Reset
          </button>
        </div>
      </div>
      <Link href="/admin/analytics" className="inline-block mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">← Back to Analytics & Reporting</Link>
    </div>
  );
}

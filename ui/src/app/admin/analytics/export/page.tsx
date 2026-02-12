/**
 * Super Admin: Data export configuration (§9.3)
 * GET/PUT /api/v1/system/analytics via gateway (configuration-service). Export config form.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

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
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
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
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setSaveError(GENERIC_ERROR_MESSAGE);
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
            <Label className="block mb-1">Datasets (comma-separated)</Label>
            <Input
              type="text"
              value={datasetsInput}
              onChange={(e) => { setDatasetsInput(e.target.value); setDirty(true); }}
              placeholder="e.g. risk_evaluations, ml_predictions, feedback"
              className="w-full"
            />
          </div>
          <div>
            <Label className="block mb-1">Format</Label>
            <Select value={exportConfig.format ?? 'CSV'} onValueChange={(v) => update({ format: v as ExportConfig['format'] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CSV">CSV</SelectItem>
                <SelectItem value="JSON">JSON</SelectItem>
                <SelectItem value="Parquet">Parquet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block mb-1">Schedule</Label>
            <Select value={exportConfig.schedule ?? 'daily'} onValueChange={(v) => update({ schedule: v as ExportConfig['schedule'] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block mb-1">Retention (days)</Label>
            <Input
              type="number"
              min={1}
              value={exportConfig.retentionDays ?? 90}
              onChange={(e) => update({ retentionDays: parseInt(e.target.value, 10) || undefined })}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button type="button" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="outline" onClick={() => { fetchConfig(); setDirty(false); }}>
            Reset
          </Button>
        </div>
      </div>
      <Link href="/admin/analytics" className="inline-block mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">← Back to Analytics & Reporting</Link>
    </div>
  );
}

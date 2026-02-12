'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
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

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

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

export default function AnalyticsReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [config, setConfig] = useState<AnalyticsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [dataSourcesStr, setDataSourcesStr] = useState('');
  const [outputFormat, setOutputFormat] = useState<'PDF' | 'Excel' | 'CSV'>('CSV');
  const [schedule, setSchedule] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
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
        const report = (data.reports ?? []).find((r) => r.id === id);
        if (report) {
          setName(report.name ?? '');
          setDataSourcesStr((report.dataSources ?? []).join(', '));
          setOutputFormat((report.outputFormat as 'PDF' | 'Excel' | 'CSV') ?? 'CSV');
          setSchedule((report.schedule as 'daily' | 'weekly' | 'monthly') ?? 'weekly');
        }
      })
      .catch((e) => {
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
        setError(GENERIC_ERROR_MESSAGE);
        setConfig(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const report = config?.reports?.find((r) => r.id === id);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !config || !report || saving) return;
    setSaveError(null);
    setSaving(true);
    const dataSources = dataSourcesStr.split(',').map((s) => s.trim()).filter(Boolean);
    const updated = config.reports.map((r) =>
      r.id === id
        ? { ...r, name: name.trim(), dataSources: dataSources.length ? dataSources : undefined, outputFormat, schedule }
        : r
    );
    fetch(`${apiBase}/api/v1/system/analytics`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, reports: updated }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Save failed');
        setEditing(false);
        fetchConfig();
      })
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setSaveError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!apiBase || !config || !report || deleting) return;
    setDeleting(true);
    const next = (config.reports ?? []).filter((r) => r.id !== id);
    fetch(`${apiBase}/api/v1/system/analytics`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, reports: next }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Delete failed');
        router.push('/admin/analytics/reports');
      })
      .catch((e) => { if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e); setSaveError(GENERIC_ERROR_MESSAGE); })
      .finally(() => setDeleting(false));
  };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/analytics">Analytics</Link><span>/</span>
          <Link href="/admin/analytics/reports">Reports</Link><span>/</span>
          <span className="text-foreground">Report</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{saveError}</p>}

        {!loading && !error && report && (
          <>
            <h1 className="text-xl font-semibold mb-4">{report.name}</h1>

            {!editing ? (
              <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
                <p><span className="text-gray-500">ID:</span> {report.id}</p>
                <p><span className="text-gray-500">Name:</span> {report.name}</p>
                {report.dataSources?.length ? <p><span className="text-gray-500">Data sources:</span> {report.dataSources.join(', ')}</p> : null}
                {report.outputFormat && <p><span className="text-gray-500">Output format:</span> {report.outputFormat}</p>}
                {report.schedule && <p><span className="text-gray-500">Schedule:</span> {report.schedule}</p>}
                {report.createdAt && <p><span className="text-gray-500">Created:</span> {new Date(report.createdAt).toLocaleString()}</p>}
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
                  <Label htmlFor="dataSources">Data sources (comma-separated, optional)</Label>
                  <Input id="dataSources" type="text" value={dataSourcesStr} onChange={(e) => setDataSourcesStr(e.target.value)} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outputFormat">Output format</Label>
                  <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as 'PDF' | 'Excel' | 'CSV')}>
                    <SelectTrigger id="outputFormat" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PDF">PDF</SelectItem>
                      <SelectItem value="Excel">Excel</SelectItem>
                      <SelectItem value="CSV">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule">Schedule</Label>
                  <Select value={schedule} onValueChange={(v) => setSchedule(v as 'daily' | 'weekly' | 'monthly')}>
                    <SelectTrigger id="schedule" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>Save</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-destructive/30 bg-destructive/10">
                <p className="text-sm mb-2">Delete this report?</p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>Delete</Button>
                  <Button type="button" variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !report && config && (
          <p className="text-sm text-gray-500">Report not found.</p>
        )}
        <p className="mt-4"><Link href="/admin/analytics/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Reports</Link></p>
      </div>
    </div>
  );
}

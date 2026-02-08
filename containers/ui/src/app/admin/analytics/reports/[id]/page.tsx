'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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
        setError(e instanceof Error ? e.message : 'Failed to load');
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
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Save failed'))
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
      .catch((e) => setSaveError(e instanceof Error ? e.message : 'Delete failed'))
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
                  <button type="button" onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                  <button type="button" onClick={() => setDeleteConfirm(true)} className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
                  <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" required />
                </div>
                <div>
                  <label htmlFor="dataSources" className="block text-sm font-medium mb-1">Data sources (comma-separated, optional)</label>
                  <input id="dataSources" type="text" value={dataSourcesStr} onChange={(e) => setDataSourcesStr(e.target.value)} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div>
                  <label htmlFor="outputFormat" className="block text-sm font-medium mb-1">Output format</label>
                  <select id="outputFormat" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as 'PDF' | 'Excel' | 'CSV')} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                    <option value="PDF">PDF</option>
                    <option value="Excel">Excel</option>
                    <option value="CSV">CSV</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="schedule" className="block text-sm font-medium mb-1">Schedule</label>
                  <select id="schedule" value={schedule} onChange={(e) => setSchedule(e.target.value as 'daily' | 'weekly' | 'monthly')} className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                </div>
              </form>
            )}

            {deleteConfirm && (
              <div className="mt-4 p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm mb-2">Delete this report?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Delete</button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="px-4 py-2 border rounded dark:border-gray-700">Cancel</button>
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

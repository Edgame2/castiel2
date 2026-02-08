'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

function generateId(): string {
  if (typeof crypto !== 'undefined' && (crypto as { randomUUID?: () => string }).randomUUID) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface ReportDef {
  id: string;
  name: string;
  dataSources?: string[];
  outputFormat?: 'PDF' | 'Excel' | 'CSV';
  schedule?: 'daily' | 'weekly' | 'monthly';
  recipients?: string[];
  createdAt?: string;
}

interface AnalyticsConfig {
  dashboards: unknown[];
  reports: ReportDef[];
  exportConfig: Record<string, unknown>;
}

export default function AnalyticsReportNewPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [dataSourcesStr, setDataSourcesStr] = useState('');
  const [outputFormat, setOutputFormat] = useState<'PDF' | 'Excel' | 'CSV'>('CSV');
  const [schedule, setSchedule] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
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
        const dataSources = dataSourcesStr.split(',').map((s) => s.trim()).filter(Boolean);
        const newReport: ReportDef = {
          id: newId,
          name: name.trim(),
          dataSources: dataSources.length ? dataSources : undefined,
          outputFormat,
          schedule,
          recipients: [],
          createdAt: new Date().toISOString(),
        };
        return fetch(`${apiBase}/api/v1/system/analytics`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...config, reports: [...(config.reports ?? []), newReport] }),
        }).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          router.push(`/admin/analytics/reports/${encodeURIComponent(newId)}`);
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
          <Link href="/admin/analytics/reports">Reports</Link><span>/</span>
          <span className="text-foreground">New report</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">Create report</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="border rounded-lg p-6 dark:border-gray-700 space-y-4">
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
            <button type="submit" disabled={submitting || !name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create</button>
            <Link href="/admin/analytics/reports" className="px-4 py-2 border rounded dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Link>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/analytics/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Reports</Link></p>
      </div>
    </div>
  );
}

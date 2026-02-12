'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

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
    if (!getApiBaseUrl() || !name.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    apiFetch('/api/v1/system/analytics')
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
        return apiFetch('/api/v1/system/analytics', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...config, reports: [...(config.reports ?? []), newReport] }),
        }).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          router.push(`/admin/analytics/reports/${encodeURIComponent(newId)}`);
        });
      })
      .catch(() => setError(GENERIC_ERROR_MESSAGE))
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
            <Button type="submit" disabled={submitting || !name.trim()}>Create</Button>
            <Button asChild variant="outline">
              <Link href="/admin/analytics/reports">Cancel</Link>
            </Button>
          </div>
        </form>
        <p className="mt-4"><Link href="/admin/analytics/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Reports</Link></p>
      </div>
    </div>
  );
}

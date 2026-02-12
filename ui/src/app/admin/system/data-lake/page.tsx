/**
 * Super Admin: Data Lake configuration (§8.2)
 * GET/PUT /api/v1/system/datalake via gateway (configuration-service).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GENERIC_ERROR_MESSAGE, apiFetch, getApiBaseUrl } from '@/lib/api';

interface DataLakeConfig {
  connectionString?: string;
  accountName?: string;
  containerName?: string;
  syncStrategy?: 'real-time' | 'batch' | 'hybrid';
  batchSyncFrequency?: 'hourly' | 'daily' | 'weekly';
  retryMaxRetries?: number;
  retryDelaySeconds?: number;
  compressionEnabled?: boolean;
  compressionFormat?: 'gzip' | 'snappy' | 'lz4';
}

const DEFAULT_CONFIG: DataLakeConfig = {
  syncStrategy: 'hybrid',
  batchSyncFrequency: 'daily',
  retryMaxRetries: 3,
  retryDelaySeconds: 60,
  compressionEnabled: true,
  compressionFormat: 'snappy',
};

export default function SystemDataLakePage() {
  const [config, setConfig] = useState<DataLakeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!getApiBaseUrl()) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setConfig(DEFAULT_CONFIG);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/system/datalake');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConfig({ ...DEFAULT_CONFIG, ...data });
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    document.title = 'Data Lake | Admin | Castiel';
    return () => { document.title = 'Admin | Castiel'; };
  }, []);

  const handleSave = async () => {
    if (!getApiBaseUrl() || !config) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiFetch('/api/v1/system/datalake', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setConfig({ ...DEFAULT_CONFIG, ...data });
      setDirty(false);
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setSaveError(GENERIC_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  const update = (updates: Partial<DataLakeConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <Link href="/admin/system" className="text-sm font-medium hover:underline">← System</Link>
        <p className="text-muted-foreground mt-4">Loading Data Lake configuration…</p>
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
        <Link href="/admin/system" className="text-sm font-medium hover:underline">System Configuration</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Data Lake Configuration</h1>
      <p className="text-muted-foreground mb-4">Connection, sync strategy, retry, and compression (§8.2).</p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/system" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/system/performance" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Performance</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Data Lake</span>
        <Link href="/admin/system/logging" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Logging</Link>
        <Link href="/admin/system/api-security" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">API Security</Link>
      </nav>
      {error && <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">{error}</p>}
      {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{saveError}</p>}
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <div className="grid gap-4 max-w-xl">
          <div>
            <Label className="block mb-1">Account name</Label>
            <Input
              type="text"
              value={config?.accountName ?? ''}
              onChange={(e) => update({ accountName: e.target.value || undefined })}
              className="w-full"
              placeholder="Storage account name"
            />
          </div>
          <div>
            <Label className="block mb-1">Container name</Label>
            <Input
              type="text"
              value={config?.containerName ?? ''}
              onChange={(e) => update({ containerName: e.target.value || undefined })}
              className="w-full"
              placeholder="Container name"
            />
          </div>
          <div>
            <Label className="block mb-1">Connection string (masked)</Label>
            <Input
              type="password"
              value={config?.connectionString ?? ''}
              onChange={(e) => update({ connectionString: e.target.value || undefined })}
              className="w-full"
              placeholder="Leave blank to keep existing"
            />
          </div>
          <div>
            <Label className="block mb-1">Sync strategy</Label>
            <Select value={config?.syncStrategy ?? 'hybrid'} onValueChange={(v) => update({ syncStrategy: v as DataLakeConfig['syncStrategy'] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="real-time">Real-time</SelectItem>
                <SelectItem value="batch">Batch</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block mb-1">Batch sync frequency</Label>
            <Select value={config?.batchSyncFrequency ?? 'daily'} onValueChange={(v) => update({ batchSyncFrequency: v as DataLakeConfig['batchSyncFrequency'] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4">
            <div>
              <Label className="block mb-1">Retry max</Label>
              <Input
                type="number"
                min={0}
                value={config?.retryMaxRetries ?? 3}
                onChange={(e) => update({ retryMaxRetries: parseInt(e.target.value, 10) || undefined })}
                className="w-full"
              />
            </div>
            <div>
              <Label className="block mb-1">Retry delay (s)</Label>
              <Input
                type="number"
                min={0}
                value={config?.retryDelaySeconds ?? 60}
                onChange={(e) => update({ retryDelaySeconds: parseInt(e.target.value, 10) || undefined })}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="compression"
              checked={config?.compressionEnabled ?? true}
              onCheckedChange={(c) => update({ compressionEnabled: !!c })}
            />
            <Label htmlFor="compression" className="text-sm font-normal">Compression enabled</Label>
          </div>
          <div>
            <Label className="block mb-1">Compression format</Label>
            <Select value={config?.compressionFormat ?? 'snappy'} onValueChange={(v) => update({ compressionFormat: v as DataLakeConfig['compressionFormat'] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gzip">gzip</SelectItem>
                <SelectItem value="snappy">snappy</SelectItem>
                <SelectItem value="lz4">lz4</SelectItem>
              </SelectContent>
            </Select>
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
      <Link href="/admin/system" className="inline-block mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">← Back to System Configuration</Link>
    </div>
  );
}

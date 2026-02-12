/**
 * Super Admin: Logging configuration (§8.3)
 * GET/PUT /api/v1/system/logging via gateway (configuration-service).
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
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface LoggingConfig {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  retentionDays?: number;
  archiveAfterDays?: number;
  samplingEnabled?: boolean;
  sampleRate?: number;
}

const DEFAULT_CONFIG: LoggingConfig = {
  logLevel: 'info',
  retentionDays: 30,
  archiveAfterDays: 90,
  samplingEnabled: false,
  sampleRate: 100,
};

export default function SystemLoggingPage() {
  const [config, setConfig] = useState<LoggingConfig | null>(null);
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
      const res = await apiFetch('/api/v1/system/logging');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConfig({ ...DEFAULT_CONFIG, ...data });
    } catch (e) {
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
    document.title = 'Logging | Admin | Castiel';
    return () => { document.title = 'Admin | Castiel'; };
  }, []);

  const handleSave = async () => {
    if (!getApiBaseUrl() || !config) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiFetch('/api/v1/system/logging', {
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
    } catch {
      setSaveError(GENERIC_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  const update = (updates: Partial<LoggingConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <Link href="/admin/system" className="text-sm font-medium hover:underline">← System</Link>
        <p className="text-muted-foreground mt-4">Loading logging configuration…</p>
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
      <h1 className="text-2xl font-bold mb-2">Logging Configuration</h1>
      <p className="text-muted-foreground mb-4">Log level, retention, and sampling (§8.3).</p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/system" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/system/performance" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Performance</Link>
        <Link href="/admin/system/data-lake" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Data Lake</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">Logging</span>
        <Link href="/admin/system/logging/config" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Data collection config</Link>
        <Link href="/admin/system/api-security" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">API Security</Link>
      </nav>
      {error && <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">{error}</p>}
      {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{saveError}</p>}
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <div className="grid gap-4 max-w-xl">
          <div>
            <Label className="block mb-1">Log level</Label>
            <Select value={config?.logLevel ?? 'info'} onValueChange={(v) => update({ logLevel: v as LoggingConfig['logLevel'] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debug">debug</SelectItem>
                <SelectItem value="info">info</SelectItem>
                <SelectItem value="warn">warn</SelectItem>
                <SelectItem value="error">error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block mb-1">Retention (days)</Label>
            <Input
              type="number"
              min={1}
              value={config?.retentionDays ?? 30}
              onChange={(e) => update({ retentionDays: parseInt(e.target.value, 10) || undefined })}
              className="w-full"
            />
          </div>
          <div>
            <Label className="block mb-1">Archive after (days)</Label>
            <Input
              type="number"
              min={1}
              value={config?.archiveAfterDays ?? 90}
              onChange={(e) => update({ archiveAfterDays: parseInt(e.target.value, 10) || undefined })}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="sampling"
              checked={config?.samplingEnabled ?? false}
              onCheckedChange={(c) => update({ samplingEnabled: !!c })}
            />
            <Label htmlFor="sampling" className="text-sm font-normal">Sampling enabled</Label>
          </div>
          <div>
            <Label className="block mb-1">Sample rate (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={config?.sampleRate ?? 100}
              onChange={(e) => update({ sampleRate: parseInt(e.target.value, 10) || undefined })}
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
      <Link href="/admin/system" className="inline-block mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">← Back to System Configuration</Link>
    </div>
  );
}

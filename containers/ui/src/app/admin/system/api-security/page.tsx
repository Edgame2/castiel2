/**
 * Super Admin: API security configuration (§8.4)
 * GET/PUT /api/v1/system/api-security via gateway (configuration-service).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface ApiSecurityConfig {
  rateLimitEnabled?: boolean;
  requestsPerMinute?: number;
  perTenant?: boolean;
  perUser?: boolean;
  corsEnabled?: boolean;
  allowedOrigins?: string[];
  dataAtRestEncryption?: boolean;
  dataInTransitEncryption?: boolean;
}

const DEFAULT_CONFIG: ApiSecurityConfig = {
  rateLimitEnabled: true,
  requestsPerMinute: 100,
  perTenant: true,
  perUser: false,
  corsEnabled: true,
  allowedOrigins: [],
  dataAtRestEncryption: true,
  dataInTransitEncryption: true,
};

export default function SystemApiSecurityPage() {
  const [config, setConfig] = useState<ApiSecurityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setConfig(DEFAULT_CONFIG);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/system/api-security`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConfig({ ...DEFAULT_CONFIG, ...data });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    document.title = 'API Security | Admin | Castiel';
    return () => { document.title = 'Admin | Castiel'; };
  }, []);

  const handleSave = async () => {
    if (!apiBaseUrl || !config) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/system/api-security`, {
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
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const update = (updates: Partial<ApiSecurityConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <Link href="/admin/system" className="text-sm font-medium hover:underline">← System</Link>
        <p className="text-muted-foreground mt-4">Loading API security configuration…</p>
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
      <h1 className="text-2xl font-bold mb-2">API Security Configuration</h1>
      <p className="text-muted-foreground mb-4">Rate limits, CORS, and encryption (§8.4).</p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link href="/admin/system" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Overview</Link>
        <Link href="/admin/system/performance" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Performance</Link>
        <Link href="/admin/system/data-lake" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Data Lake</Link>
        <Link href="/admin/system/logging" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Logging</Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">API Security</span>
      </nav>
      {error && <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">{error}</p>}
      {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{saveError}</p>}
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 space-y-4">
        <div className="grid gap-4 max-w-xl">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rateLimit"
              checked={config?.rateLimitEnabled ?? true}
              onChange={(e) => update({ rateLimitEnabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="rateLimit" className="text-sm">Rate limit enabled</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Requests per minute</label>
            <input
              type="number"
              min={1}
              value={config?.requestsPerMinute ?? 100}
              onChange={(e) => update({ requestsPerMinute: parseInt(e.target.value, 10) || undefined })}
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="perTenant"
              checked={config?.perTenant ?? true}
              onChange={(e) => update({ perTenant: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="perTenant" className="text-sm">Per-tenant rate limit</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="perUser"
              checked={config?.perUser ?? false}
              onChange={(e) => update({ perUser: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="perUser" className="text-sm">Per-user rate limit</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cors"
              checked={config?.corsEnabled ?? true}
              onChange={(e) => update({ corsEnabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="cors" className="text-sm">CORS enabled</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Allowed origins (comma-separated)</label>
            <input
              type="text"
              value={(config?.allowedOrigins ?? []).join(', ')}
              onChange={(e) => update({ allowedOrigins: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              placeholder="https://app.example.com"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dataAtRest"
              checked={config?.dataAtRestEncryption ?? true}
              onChange={(e) => update({ dataAtRestEncryption: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="dataAtRest" className="text-sm">Data at rest encryption</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dataInTransit"
              checked={config?.dataInTransitEncryption ?? true}
              onChange={(e) => update({ dataInTransitEncryption: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="dataInTransit" className="text-sm">Data in transit encryption</label>
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
      <Link href="/admin/system" className="inline-block mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">← Back to System Configuration</Link>
    </div>
  );
}

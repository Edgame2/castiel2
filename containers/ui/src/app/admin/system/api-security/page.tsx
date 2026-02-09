/**
 * Super Admin: API security configuration (§8.4)
 * GET/PUT /api/v1/system/api-security via gateway (configuration-service).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

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
            <Checkbox
              id="rateLimit"
              checked={config?.rateLimitEnabled ?? true}
              onCheckedChange={(c) => update({ rateLimitEnabled: !!c })}
            />
            <Label htmlFor="rateLimit" className="text-sm font-normal">Rate limit enabled</Label>
          </div>
          <div>
            <Label className="block mb-1">Requests per minute</Label>
            <Input
              type="number"
              min={1}
              value={config?.requestsPerMinute ?? 100}
              onChange={(e) => update({ requestsPerMinute: parseInt(e.target.value, 10) || undefined })}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="perTenant"
              checked={config?.perTenant ?? true}
              onCheckedChange={(c) => update({ perTenant: !!c })}
            />
            <Label htmlFor="perTenant" className="text-sm font-normal">Per-tenant rate limit</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="perUser"
              checked={config?.perUser ?? false}
              onCheckedChange={(c) => update({ perUser: !!c })}
            />
            <Label htmlFor="perUser" className="text-sm font-normal">Per-user rate limit</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="cors"
              checked={config?.corsEnabled ?? true}
              onCheckedChange={(c) => update({ corsEnabled: !!c })}
            />
            <Label htmlFor="cors" className="text-sm font-normal">CORS enabled</Label>
          </div>
          <div>
            <Label className="block mb-1">Allowed origins (comma-separated)</Label>
            <Input
              type="text"
              value={(config?.allowedOrigins ?? []).join(', ')}
              onChange={(e) => update({ allowedOrigins: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              className="w-full"
              placeholder="https://app.example.com"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="dataAtRest"
              checked={config?.dataAtRestEncryption ?? true}
              onCheckedChange={(c) => update({ dataAtRestEncryption: !!c })}
            />
            <Label htmlFor="dataAtRest" className="text-sm font-normal">Data at rest encryption</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="dataInTransit"
              checked={config?.dataInTransitEncryption ?? true}
              onCheckedChange={(c) => update({ dataInTransitEncryption: !!c })}
            />
            <Label htmlFor="dataInTransit" className="text-sm font-normal">Data in transit encryption</Label>
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

/**
 * Admin: Data collection config (view-only + search). Plan §2.9.
 * GET /api/v1/config/data-collection (gateway → logging). No edit in UI; config is YAML/env.
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

type DataCollectionConfig = {
  default?: string;
  severity?: Record<string, boolean>;
  category?: Record<string, boolean>;
  resource_type?: Record<string, boolean>;
  event_type?: { mode?: string; allow?: string[]; deny?: string[]; explicit?: Record<string, boolean> };
} | null;

export default function SystemLoggingConfigPage() {
  const [config, setConfig] = useState<DataCollectionConfig>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchConfig = useCallback(() => {
    if (!getApiBaseUrl()) {
      setLoading(false);
      setError(GENERIC_ERROR_MESSAGE);
      return;
    }
    setLoading(true);
    setError(null);
    const path = `/api/v1/config/data-collection${search ? `?search=${encodeURIComponent(search)}` : ''}`;
    apiFetch(path)
      .then((r: Response) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load config');
        return r.json();
      })
      .then((data: DataCollectionConfig) => setConfig(data))
      .catch(() => {
        setError(GENERIC_ERROR_MESSAGE);
        setConfig(null);
      })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const filteredJson = config != null && search.trim() ? (() => {
    const q = search.trim().toLowerCase();
    const str = JSON.stringify(config);
    if (str.toLowerCase().includes(q)) return config;
    return config;
  })() : config;

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin" className="hover:underline">Admin</Link>
          <span>/</span>
          <Link href="/admin/system" className="hover:underline">System</Link>
          <span>/</span>
          <Link href="/admin/system/logging" className="hover:underline">Logging</Link>
          <span>/</span>
          <span className="text-foreground">Data collection config</span>
        </div>
        <h1 className="text-xl font-semibold mb-2">Data collection config</h1>
        <p className="text-sm text-gray-500 mb-4">
          View-only. Controls which events are stored in the audit log (severity, category, resource_type, event_type). Edits are in YAML/env, not in this UI.
        </p>

        <div className="mb-4">
          <Label htmlFor="search" className="block mb-1">Search (filter display)</Label>
          <Input
            id="search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by key or value…"
            className="max-w-md"
          />
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}
        {!loading && !error && filteredJson === null && <p className="text-sm text-gray-500">No data collection config (collect all).</p>}
        {!loading && !error && filteredJson != null && (
          <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(filteredJson, null, 2)}
          </pre>
        )}
        <p className="mt-4">
          <Link href="/admin/system/logging" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Logging</Link>
        </p>
      </div>
    </div>
  );
}

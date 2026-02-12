/**
 * Super Admin: ML Models — Models & health (§4.1)
 * GET /api/v1/ml/models/health via gateway (ml-service).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface ModelHealthResponse {
  endpoints: Record<string, { status: 'ok' | 'unreachable'; latencyMs?: number }>;
  overall: 'ok' | 'degraded' | 'not_configured';
  timestamp: string;
}

interface ModelItem {
  id: string;
  name?: string;
  type?: string;
  status?: string;
}

export default function MLModelsModelsPage() {
  const [health, setHealth] = useState<ModelHealthResponse | null>(null);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    if (!apiBaseUrl) return;
    setModelsLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/ml/models?limit=100`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setModels(Array.isArray(json?.items) ? json.items : []);
    } catch {
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    if (!apiBaseUrl) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/ml/models/health`, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setHealth(json);
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await fetchHealth();
      if (apiBaseUrl && !cancelled) await fetchModels();
    };
    run();
    return () => { cancelled = true; };
  }, [fetchHealth, fetchModels, apiBaseUrl]);

  useEffect(() => {
    document.title = 'Models & health | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const subNav = (
    <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
      <Link
        href="/admin/ml-models"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Overview
      </Link>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
        Models & health
      </span>
      <Link
        href="/admin/ml-models/endpoints"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Endpoints
      </Link>
      <Link
        href="/admin/ml-models/features"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Features
      </Link>
      <Link
        href="/admin/ml-models/monitoring"
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Monitoring
      </Link>
    </nav>
  );

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin" className="text-sm font-medium hover:underline">
          Admin
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/admin/ml-models" className="text-sm font-medium hover:underline">
          ML Models
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <span className="text-sm font-medium">Models & health</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Models & health</h1>
      <p className="text-muted-foreground mb-4">
        Model/endpoint health and status for ml-service (Azure ML endpoints). §4.1.
      </p>
      {subNav}

      {!apiBaseUrl && (
        <div className="rounded-lg border p-6 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">Set NEXT_PUBLIC_API_BASE_URL to the API gateway URL.</p>
        </div>
      )}

      {loading && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {apiBaseUrl && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 mb-6">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Models</h2>
            <Button asChild size="sm">
              <Link href="/admin/ml-models/models/new">New model</Link>
            </Button>
          </div>
          <div className="p-6">
            {modelsLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : models.length === 0 ? (
              <p className="text-sm text-gray-500">No models.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800">
                      <th className="text-left py-2 px-4">Name</th>
                      <th className="text-left py-2 px-4">Type</th>
                      <th className="text-left py-2 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((m) => (
                      <tr key={m.id} className="border-b">
                        <td className="py-2 px-4">
                          <Link href={`/admin/ml-models/models/${encodeURIComponent(m.id)}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            {m.name ?? m.id}
                          </Link>
                        </td>
                        <td className="py-2 px-4">{m.type ?? '—'}</td>
                        <td className="py-2 px-4">{m.status ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && health && (
        <div className="rounded-lg border bg-white dark:bg-gray-900">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Model health</h2>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-sm ${
                  health.overall === 'ok'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                    : health.overall === 'degraded'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}
              >
                {health.overall}
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={fetchHealth}>
                Refresh
              </Button>
            </div>
          </div>
          <div className="p-6">
            {health.timestamp && (
              <p className="text-xs text-gray-500 mb-4">Last checked: {health.timestamp}</p>
            )}
            {!health.endpoints || Object.keys(health.endpoints).length === 0 ? (
              <p className="text-sm text-gray-500">No endpoints configured.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800">
                      <th className="text-left py-2 px-4">Endpoint</th>
                      <th className="text-left py-2 px-4">Status</th>
                      <th className="text-left py-2 px-4">Latency (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(health.endpoints).map(([modelId, e]) => (
                      <tr key={modelId} className="border-b">
                        <td className="py-2 px-4 font-medium">{modelId}</td>
                        <td className="py-2 px-4">
                          <span
                            className={
                              e.status === 'ok'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }
                          >
                            {e.status}
                          </span>
                        </td>
                        <td className="py-2 px-4">{e.latencyMs ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Super Admin: ML Models — Endpoints (§4.2)
 * GET /api/v1/ml/endpoints via gateway (ml-service).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';

interface EndpointItem {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'degraded';
  latencyMs: number;
  models: string[];
  lastHealthCheck: string;
}

interface EndpointsResponse {
  items: EndpointItem[];
  timestamp: string;
}

export default function MLModelsEndpointsPage() {
  const [data, setData] = useState<EndpointsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEndpoints = useCallback(async () => {
    if (!getApiBaseUrl()) {
      setError('NEXT_PUBLIC_API_BASE_URL is not set');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/ml/endpoints');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(GENERIC_ERROR_MESSAGE);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  useEffect(() => {
    document.title = 'Endpoints | Admin | Castiel';
    return () => {
      document.title = 'Admin | Castiel';
    };
  }, []);

  const statusBadge = (status: EndpointItem['status']) => {
    const cls =
      status === 'online'
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : status === 'degraded'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
  };

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
        <span className="text-sm font-medium">Endpoints</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">Endpoints</h1>
      <p className="text-muted-foreground mb-4">
        Azure ML endpoint list with health status and latency (§4.2). Configure URLs in ml-service config or environment.
      </p>
      <nav className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <Link
          href="/admin/ml-models"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Overview
        </Link>
        <Link
          href="/admin/ml-models/models"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Models & health
        </Link>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-blue-600 pb-2 -mb-0.5">
          Endpoints
        </span>
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

      {getApiBaseUrl() && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/admin/ml-models/endpoints/new">New endpoint</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={fetchEndpoints} disabled={loading} title="Refetch ML endpoints">
            Refresh
          </Button>
        </div>
      )}

      {!getApiBaseUrl() && (
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
          <Button type="button" variant="link" size="sm" className="mt-2" onClick={fetchEndpoints}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && data && (
        <div className="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden">
          {data.items.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              No endpoints configured. Add Azure ML endpoint URLs in ml-service config (azure_ml.endpoints) or via
              AZURE_ML_ENDPOINT_* environment variables.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Latency (ms)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last health check
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        <Link href={`/admin/ml-models/endpoints/${encodeURIComponent(item.id)}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {item.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono truncate max-w-[240px]" title={item.url}>
                        {item.url}
                      </td>
                      <td className="px-4 py-3 text-sm">{statusBadge(item.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.latencyMs}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {item.lastHealthCheck ? new Date(item.lastHealthCheck).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href="/admin/ml-models/models"
                          className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View health
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.items.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              Updated {data.timestamp ? new Date(data.timestamp).toLocaleString() : ''}. Use &quot;View health&quot; for full health summary.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

interface EndpointItem {
  id: string;
  name: string;
  url: string;
  status: string;
  latencyMs: number;
  models: string[];
  lastHealthCheck: string;
}

export default function MLModelsEndpointDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [endpoint, setEndpoint] = useState<EndpointItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEndpoints = useCallback(async () => {
    if (!apiBase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/v1/ml/endpoints`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load');
        return r.json();
      })
      .then((data: { items?: EndpointItem[] }) => {
        const found = (data.items ?? []).find((e) => e.id === id) ?? null;
        setEndpoint(found);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setEndpoint(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link href="/admin">Admin</Link><span>/</span>
          <Link href="/admin/ml-models">ML Models</Link><span>/</span>
          <Link href="/admin/ml-models/endpoints">Endpoints</Link><span>/</span>
          <span className="text-foreground">Endpoint</span>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}

        {!loading && !error && endpoint && (
          <>
            <h1 className="text-xl font-semibold mb-4">{endpoint.name}</h1>
            <div className="border rounded-lg p-6 dark:border-gray-700 space-y-2">
              <p><span className="text-gray-500">ID:</span> {endpoint.id}</p>
              <p><span className="text-gray-500">Name:</span> {endpoint.name}</p>
              <p><span className="text-gray-500">URL:</span> <span className="font-mono text-sm break-all">{endpoint.url}</span></p>
              <p><span className="text-gray-500">Status:</span> {endpoint.status}</p>
              <p><span className="text-gray-500">Latency (ms):</span> {endpoint.latencyMs}</p>
              {endpoint.models?.length ? <p><span className="text-gray-500">Models:</span> {endpoint.models.join(', ')}</p> : null}
              {endpoint.lastHealthCheck && <p><span className="text-gray-500">Last health check:</span> {new Date(endpoint.lastHealthCheck).toLocaleString()}</p>}
              <p className="text-sm text-gray-500 mt-4">Endpoint URLs are configured in ml-service config. To change, edit config or environment variables.</p>
            </div>
          </>
        )}

        {!loading && !error && !endpoint && <p className="text-sm text-gray-500">Endpoint not found.</p>}
        <p className="mt-4"><Link href="/admin/ml-models/endpoints" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Endpoints</Link></p>
      </div>
    </div>
  );
}

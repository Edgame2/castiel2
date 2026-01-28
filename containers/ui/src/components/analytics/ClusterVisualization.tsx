/**
 * ClusterVisualization – risk clusters (Gap 3, Plan §6.3).
 * Data: GET /api/v1/risk-clustering/clusters (tenant via X-Tenant-ID in getHeaders) → { clusters: [{ id, label?, opportunityIds?, centroid?, computedAt? }] }.
 * List/card view; optional 2D scatter when centroid has ≥2 numeric keys.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type Cluster = {
  id: string;
  label?: string;
  opportunityIds?: string[];
  centroid?: Record<string, number>;
  computedAt?: string;
};

export type ClusterVisualizationProps = {
  title?: string;
  height?: number;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

export function ClusterVisualization({
  title = 'Risk clusters',
  height = 280,
  apiBaseUrl = '',
  getHeaders,
}: ClusterVisualizationProps) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/api/v1/risk-clustering/clusters`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = getHeaders ? await Promise.resolve(getHeaders()) : {};
      const res = await fetch(url, {
        headers: { ...headers },
        credentials: getHeaders ? undefined : ('same-origin' as RequestCredentials),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { clusters?: Cluster[] } | Cluster[];
      const arr = Array.isArray(json) ? json : (json?.clusters ?? []);
      setClusters(Array.isArray(arr) ? arr : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setClusters([]);
    } finally {
      setLoading(false);
    }
  }, [url, getHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <div className="flex items-center justify-center" style={{ height }}>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!clusters || clusters.length === 0) {
    return (
      <div className="flex flex-col rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <div className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>No clusters</div>
      </div>
    );
  }

  const centroidKeys = (() => {
    const c = clusters[0]?.centroid;
    if (!c || typeof c !== 'object') return null;
    const k = Object.keys(c).filter((key) => typeof (c as Record<string, unknown>)[key] === 'number');
    return k.length >= 2 ? k.slice(0, 2) : null;
  })();
  const scatterData = centroidKeys
    ? clusters.map((cl, i) => ({
        name: cl.label || cl.id || `Cluster ${i + 1}`,
        x: (cl.centroid as Record<string, number>)?.[centroidKeys[0]] ?? 0,
        y: (cl.centroid as Record<string, number>)?.[centroidKeys[1]] ?? 0,
        count: cl.opportunityIds?.length ?? 0,
      }))
    : null;

  return (
    <div className="flex flex-col rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="grid gap-3">
        <ul className="space-y-2">
          {clusters.map((cl, i) => (
            <li key={cl.id || i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
              <span className="font-medium">{cl.label || cl.id || `Cluster ${i + 1}`}</span>
              <span className="text-gray-500">
                {cl.opportunityIds?.length ?? 0} opportunities
                {cl.computedAt ? ` · ${cl.computedAt.slice(0, 10)}` : ''}
              </span>
            </li>
          ))}
        </ul>
        {scatterData && scatterData.length > 0 && (
          <ResponsiveContainer width="100%" height={Math.min(180, height - 120)}>
            <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="x" name={centroidKeys?.[0] ?? 'x'} tick={{ fontSize: 10 }} />
              <YAxis dataKey="y" name={centroidKeys?.[1] ?? 'y'} tick={{ fontSize: 10 }} />
              <ZAxis type="number" dataKey="count" range={[60, 400]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number | undefined) => [v ?? 0, 'Count']} />
              <Scatter data={scatterData} fill="#3b82f6" shape="circle" />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

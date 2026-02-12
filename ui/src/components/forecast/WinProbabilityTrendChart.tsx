/**
 * WinProbabilityTrendChart – win-probability over time (Gap 1, Plan §4.2).
 * Data: GET /api/v1/opportunities/:id/win-probability/trend (optional from/to) → { points: [{ date, probability, confidence? }] }.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type WinProbabilityTrendChartProps = {
  opportunityId: string;
  title?: string;
  height?: number;
  /** ISO date; default last 90 days */
  from?: string;
  to?: string;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

export function WinProbabilityTrendChart({
  opportunityId,
  title = 'Win probability trend',
  height = 200,
  from,
  to,
  apiBaseUrl = '',
  getHeaders,
}: WinProbabilityTrendChartProps) {
  const [points, setPoints] = useState<Array<{ date: string; probability: number; confidence?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const url = `${base}/api/v1/opportunities/${opportunityId}/win-probability/trend${qs.toString() ? `?${qs.toString()}` : ''}`;

  const fetchData = useCallback(async () => {
    if (!opportunityId) return;
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
      const json = (await res.json()) as { points?: Array<{ date: string; probability: number; confidence?: number }> };
      setPoints(Array.isArray(json?.points) ? json.points : []);
    } catch (e) {
      setError(GENERIC_ERROR_MESSAGE);
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [opportunityId, url, getHeaders]);

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

  if (!points || points.length === 0) {
    return (
      <div className="flex flex-col rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <div className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>No win-probability history</div>
      </div>
    );
  }

  const chartData = points.map((p) => ({
    date: p.date,
    probability: typeof p.probability === 'number' ? Math.min(1, Math.max(0, p.probability)) : 0,
    confidence: p.confidence,
  }));

  return (
    <div className="flex flex-col rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
          <Tooltip formatter={(v: number | undefined) => [v != null ? `${(v * 100).toFixed(1)}%` : '—', 'Probability']} labelFormatter={(l) => l} />
          <Line type="monotone" dataKey="probability" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

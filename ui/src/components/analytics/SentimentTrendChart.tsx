/**
 * SentimentTrendChart – sentiment over time (Gap 2, Plan §921).
 * Data: GET /api/v1/opportunities/:id/sentiment-trends → { trends: [{ period, score, sampleSize? }] }.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type SentimentTrendChartProps = {
  opportunityId: string;
  title?: string;
  height?: number;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

export function SentimentTrendChart({
  opportunityId,
  title = 'Sentiment trend',
  height = 200,
  apiBaseUrl = '',
  getHeaders,
}: SentimentTrendChartProps) {
  const [trends, setTrends] = useState<Array<{ period: string; score: number; sampleSize?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/api/v1/opportunities/${opportunityId}/sentiment-trends`;

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
      const json = (await res.json()) as { trends?: Array<{ period: string; score: number; sampleSize?: number }> };
      setTrends(Array.isArray(json?.trends) ? json.trends : []);
    } catch (e) {
      setError(GENERIC_ERROR_MESSAGE);
      setTrends([]);
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

  if (!trends || trends.length === 0) {
    return (
      <div className="flex flex-col rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <div className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>No sentiment data</div>
      </div>
    );
  }

  const chartData = trends.map((t) => ({ period: t.period, score: typeof t.score === 'number' ? t.score : 0, sampleSize: t.sampleSize }));

  return (
    <div className="flex flex-col rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis domain={[-1, 1]} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toFixed(1)} />
          <Tooltip formatter={(v: number | undefined) => [v != null ? v.toFixed(2) : '—', 'Score']} labelFormatter={(l) => l} />
          <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

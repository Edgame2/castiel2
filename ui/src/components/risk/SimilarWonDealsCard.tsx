/**
 * SimilarWonDealsCard – peer deal comparison (Plan §11.12, §945).
 * Data: GET /api/v1/opportunities/:opportunityId/similar-won-deals. Similar by industry, size; win rate, median cycle time.
 * No hardcoded URLs; optional apiBaseUrl, getHeaders.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type SimilarWonDealsData = {
  count: number;
  winRate: number;
  medianCycleTimeDays: number | null;
  p25CloseAmount: number | null;
};

export type SimilarWonDealsCardProps = {
  opportunityId: string;
  title?: string;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

export function SimilarWonDealsCard({
  opportunityId,
  title = 'Deals like this',
  apiBaseUrl = '',
  getHeaders,
}: SimilarWonDealsCardProps) {
  const [data, setData] = useState<SimilarWonDealsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/api/v1/opportunities/${opportunityId}/similar-won-deals`;

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
        if (res.status === 404) {
          setData({ count: 0, winRate: 0, medianCycleTimeDays: null, p25CloseAmount: null });
          return;
        }
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as SimilarWonDealsData;
      setData({
        count: typeof json?.count === 'number' ? json.count : 0,
        winRate: typeof json?.winRate === 'number' ? json.winRate : 0,
        medianCycleTimeDays: typeof json?.medianCycleTimeDays === 'number' ? json.medianCycleTimeDays : null,
        p25CloseAmount: typeof json?.p25CloseAmount === 'number' ? json.p25CloseAmount : null,
      });
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [opportunityId, url, getHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <p className="text-xs text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const d = data ?? { count: 0, winRate: 0, medianCycleTimeDays: null, p25CloseAmount: null };

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {d.count === 0 ? (
        <p className="text-xs text-gray-500">No similar won deals to compare</p>
      ) : (
        <div className="space-y-1 text-sm">
          <p className="font-medium">
            Deals like this win <span className="text-emerald-600 dark:text-emerald-400">{(d.winRate * 100).toFixed(0)}%</span> of the time
          </p>
          <p className="text-xs text-gray-500">Based on {d.count} similar deals (industry, size)</p>
          {d.medianCycleTimeDays != null && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Median cycle: {d.medianCycleTimeDays} days
            </p>
          )}
          {d.p25CloseAmount != null && d.p25CloseAmount > 0 && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              P25 close: ${(d.p25CloseAmount / 1000).toFixed(0)}k
            </p>
          )}
        </div>
      )}
    </div>
  );
}

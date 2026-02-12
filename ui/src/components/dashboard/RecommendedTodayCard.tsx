/**
 * RecommendedTodayCard – prioritized opportunities (Plan §941).
 * Data: GET /api/v1/dashboards/manager/prioritized. Rank by revenue-at-risk × risk × early-warning; suggestedAction.
 * No hardcoded URLs; optional apiBaseUrl, getHeaders.
 */

'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type PrioritizedOpportunity = {
  opportunityId: string;
  revenueAtRisk?: number;
  riskScore?: number;
  earlyWarningScore?: number;
  suggestedAction?: string;
  rankScore?: number;
};

export type RecommendedTodayCardProps = {
  title?: string;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

export function RecommendedTodayCard({
  title = 'Recommended today',
  apiBaseUrl = '',
  getHeaders,
}: RecommendedTodayCardProps) {
  const [data, setData] = useState<{ opportunities: PrioritizedOpportunity[]; suggestedAction?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/api/v1/dashboards/manager/prioritized`;

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
      const json = (await res.json()) as { opportunities?: PrioritizedOpportunity[]; suggestedAction?: string | null };
      setData({
        opportunities: Array.isArray(json?.opportunities) ? json.opportunities : [],
        suggestedAction: json?.suggestedAction ?? null,
      });
    } catch (e) {
      setError(GENERIC_ERROR_MESSAGE);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url, getHeaders]);

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

  const opportunities = data?.opportunities ?? [];

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {data?.suggestedAction && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{data.suggestedAction}</p>
      )}
      {opportunities.length === 0 ? (
        <p className="text-xs text-gray-500">No prioritized opportunities</p>
      ) : (
        <ul className="space-y-2">
          {opportunities.slice(0, 5).map((o) => (
            <li key={o.opportunityId} className="flex items-center justify-between gap-2 text-sm">
              <Link
                href={`/opportunities/${o.opportunityId}`}
                className="font-medium text-blue-600 hover:underline truncate"
              >
                {o.opportunityId}
              </Link>
              <span className="text-xs text-gray-500 shrink-0">
                {typeof o.revenueAtRisk === 'number' && `$${(o.revenueAtRisk / 1000).toFixed(0)}k at risk`}
                {typeof o.riskScore === 'number' && ` · ${(o.riskScore * 100).toFixed(0)}% risk`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

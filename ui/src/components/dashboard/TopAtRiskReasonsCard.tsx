/**
 * TopAtRiskReasonsCard – top at-risk reasons for dashboard (Plan §11.11, §944).
 * Data: GET /api/v1/risk-analysis/tenant/top-at-risk-reasons.
 * No hardcoded URLs; optional apiBaseUrl, getHeaders.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type TopAtRiskReason = {
  reason: string;
  count: number;
  suggestedMitigation?: string;
};

export type TopAtRiskReasonsCardProps = {
  title?: string;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
  /** When set, skips fetch and renders from this (e.g. from GET /dashboards/executive). */
  reasons?: TopAtRiskReason[];
};

export function TopAtRiskReasonsCard({
  title = 'Top at-risk reasons',
  apiBaseUrl = '',
  getHeaders,
  reasons: reasonsProp,
}: TopAtRiskReasonsCardProps) {
  const [data, setData] = useState<{ reasons: TopAtRiskReason[] } | null>(null);
  const [loading, setLoading] = useState(!reasonsProp);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/api/v1/risk-analysis/tenant/top-at-risk-reasons`;

  const fetchData = useCallback(async () => {
    if (reasonsProp) return;
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
      const json = (await res.json()) as { reasons?: TopAtRiskReason[] };
      setData({ reasons: Array.isArray(json?.reasons) ? json.reasons : [] });
    } catch (e) {
      setError(GENERIC_ERROR_MESSAGE);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url, getHeaders, reasonsProp]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reasons = reasonsProp ?? data?.reasons ?? [];

  if (loading && !reasonsProp) {
    return (
      <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <p className="text-xs text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error && !reasonsProp) {
    return (
      <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {reasons.length === 0 ? (
        <p className="text-xs text-gray-500">No at-risk reasons yet. Run evaluations to populate.</p>
      ) : (
        <ul className="space-y-1.5">
          {reasons.map((r, i) => (
            <li key={i} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-gray-700 dark:text-gray-300" title={r.reason}>{r.reason}</span>
                <span className="shrink-0 text-xs text-gray-500">{r.count}</span>
              </div>
              {r.suggestedMitigation && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 truncate" title={r.suggestedMitigation}>→ {r.suggestedMitigation}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

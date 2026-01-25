/**
 * ExplainabilityCard – top drivers for risk and win-probability (Plan §6.3, §11.2, §901).
 * Data: GET /api/v1/opportunities/:opportunityId/risk-explainability or
 * GET /api/v1/opportunities/:opportunityId/win-probability/explain.
 * When opportunityId is set and topDrivers is not, fetches from risk-analytics via API gateway.
 * Optional modelId: when present, shows "View model card" link to /models/[id] (Plan §946).
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export type ExplainabilityDriver = {
  feature: string;
  contribution: number;
  direction: 'increases' | 'decreases';
};

export type ExplainabilityCardProps = {
  /** Pre-loaded drivers; when unset and opportunityId is set, fetches from API */
  topDrivers?: ExplainabilityDriver[];
  riskScore?: number;
  /** risk | win_probability for labeling and API path */
  variant?: 'risk' | 'win_probability';
  title?: string;
  /** When set, shows link to /models/[id] for model card (Plan §946) */
  modelId?: string;
  /** When set and topDrivers unset, fetches from risk-explainability or win-probability/explain */
  opportunityId?: string;
};

const apiBase = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE_URL || '') : '';

export function ExplainabilityCard({
  topDrivers: topDriversProp,
  riskScore: riskScoreProp,
  variant = 'risk',
  title,
  modelId,
  opportunityId,
}: ExplainabilityCardProps) {
  const [topDrivers, setTopDrivers] = useState<ExplainabilityDriver[]>(topDriversProp ?? []);
  const [riskScore, setRiskScore] = useState<number | undefined>(riskScoreProp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (topDriversProp != null) {
      setTopDrivers(topDriversProp);
      setRiskScore(riskScoreProp);
      setLoading(false);
      setError(null);
      return;
    }
    if (!opportunityId || !apiBase) {
      setLoading(false);
      return;
    }
    const path =
      variant === 'win_probability'
        ? `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/win-probability/explain`
        : `/api/v1/opportunities/${encodeURIComponent(opportunityId)}/risk-explainability`;
    setLoading(true);
    setError(null);
    fetch(`${apiBase.replace(/\/$/, '')}${path}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Fetch failed');
        return r.json();
      })
      .then((data: { topDrivers?: ExplainabilityDriver[]; riskScore?: number }) => {
        setTopDrivers(Array.isArray(data.topDrivers) ? data.topDrivers : []);
        if (typeof data.riskScore === 'number') setRiskScore(data.riskScore);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [opportunityId, variant, topDriversProp, riskScoreProp]);

  const drivers = topDriversProp ?? topDrivers;
  const score = riskScoreProp ?? riskScore;
  const t = title ?? (variant === 'win_probability' ? 'Win probability drivers' : 'Risk drivers');

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-3">{t}</h3>
      {typeof score === 'number' && (
        <p className="text-xs text-gray-500 mb-2">
          {variant === 'win_probability' ? 'Win probability' : 'Risk score'}: {(score * 100).toFixed(0)}%
        </p>
      )}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!loading && !error && drivers.length === 0 && <p className="text-sm text-gray-500">No drivers available</p>}
      {!loading && !error && drivers.length > 0 && (
        <ul className="space-y-2">
          {drivers.map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium truncate" title={d.feature}>
                {d.feature}
              </span>
              <span
                className={`shrink-0 text-xs ${
                  d.direction === 'increases'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {d.direction === 'increases' ? '+' : ''}
                {(d.contribution * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
      {modelId && (
        <p className="text-xs mt-2">
          <Link href={`/models/${encodeURIComponent(modelId)}`} className="text-blue-600 dark:text-blue-400 hover:underline">
            View model card
          </Link>
        </p>
      )}
    </div>
  );
}

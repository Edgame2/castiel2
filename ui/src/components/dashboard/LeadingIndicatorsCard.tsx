/**
 * LeadingIndicatorsCard – leading-indicator status (Gap 5, Plan §4).
 * Data: GET /api/v1/opportunities/:id/leading-indicators → { indicators: [{ id, name, status, value?, detail? }] }.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type LeadingIndicatorsCardProps = {
  opportunityId: string;
  title?: string;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

type Indicator = { id: string; name: string; status: 'ok' | 'warning' | 'critical' | 'unknown'; value?: number; detail?: string };

function StatusBadge({ status }: { status: Indicator['status'] }) {
  const c = status === 'ok' ? 'text-green-600 dark:text-green-400' : status === 'warning' ? 'text-amber-600 dark:text-amber-400' : status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-gray-500';
  const Icon = status === 'ok' ? CheckCircle : status === 'warning' ? AlertTriangle : status === 'critical' ? XCircle : HelpCircle;
  return <Icon className={`h-4 w-4 ${c}`} aria-hidden />;
}

export function LeadingIndicatorsCard({
  opportunityId,
  title = 'Leading indicators',
  apiBaseUrl = '',
  getHeaders,
}: LeadingIndicatorsCardProps) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/api/v1/opportunities/${opportunityId}/leading-indicators`;

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
      const json = (await res.json()) as { indicators?: Indicator[] };
      setIndicators(Array.isArray(json?.indicators) ? json.indicators : []);
    } catch (e) {
      setError(GENERIC_ERROR_MESSAGE);
      setIndicators([]);
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
        <p className="text-sm text-gray-500">Loading…</p>
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

  if (!indicators || indicators.length === 0) {
    return (
      <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-500">No indicators</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="grid gap-2">
        {indicators.map((ind) => (
          <div key={ind.id} className="flex items-start gap-2 text-sm">
            <StatusBadge status={ind.status} />
            <div className="min-w-0 flex-1">
              <span className="font-medium">{ind.name}</span>
              {ind.value != null && <span className="text-gray-500 ml-1">({ind.value})</span>}
              {ind.detail && <p className="text-xs text-gray-500 mt-0.5">{ind.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

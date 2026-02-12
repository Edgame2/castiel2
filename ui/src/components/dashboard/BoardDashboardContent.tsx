/**
 * BoardDashboardContent – fetches GET /api/v1/dashboards/board and renders widgets (Plan §4.5, §932, §933).
 * Board: revenue-at-risk, competitive_win_loss (winLoss only), forecast-summary.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type BoardWidget = {
  id: string;
  type: string;
  title?: string;
  data: Record<string, unknown>;
};

export type BoardDashboardContentProps = {
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

function WidgetBlock({ w }: { w: BoardWidget }) {
  const d = w.data || {};
  const t = w.title || w.id;

  switch (w.type) {
    case 'revenue-at-risk': {
      const total = Number(d.totalRevenueAtRisk) || 0;
      const count = Number(d.opportunityCount) || 0;
      return (
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <h3 className="text-sm font-semibold mb-2">{t}</h3>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            ${(total / 1_000_000).toFixed(2)}M
          </p>
          <p className="text-xs text-gray-500">{count.toLocaleString()} opportunities</p>
        </div>
      );
    }
    case 'competitive_win_loss': {
      const wl = (d.winLoss as { wins?: number; losses?: number; winRate?: number }) ?? {};
      const wins = wl.wins ?? 0;
      const losses = wl.losses ?? 0;
      const rate = typeof wl.winRate === 'number' ? wl.winRate : (wins + losses > 0 ? wins / (wins + losses) : 0);
      return (
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <h3 className="text-sm font-semibold mb-2">{t}</h3>
          <p className="text-2xl font-bold">{wins} / {wins + losses}</p>
          <p className="text-xs text-gray-500">Win rate: {(rate * 100).toFixed(0)}%</p>
        </div>
      );
    }
    case 'forecast-summary': {
      const rev = Number(d.totalRevenue) || 0;
      const adj = Number(d.totalRiskAdjusted) || 0;
      return (
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <h3 className="text-sm font-semibold mb-2">{t}</h3>
          <p className="text-2xl font-bold">${(rev / 1_000_000).toFixed(2)}M</p>
          <p className="text-xs text-gray-500">risk-adjusted: ${(adj / 1_000_000).toFixed(2)}M</p>
        </div>
      );
    }
    default:
      return (
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <h3 className="text-sm font-semibold mb-2">{t}</h3>
          <p className="text-xs text-gray-500">Widget type: {w.type}</p>
        </div>
      );
  }
}

export function BoardDashboardContent({ apiBaseUrl = '', getHeaders }: BoardDashboardContentProps) {
  const [widgets, setWidgets] = useState<BoardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/api/v1/dashboards/board`;

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
      const json = (await res.json()) as { widgets?: BoardWidget[] };
      setWidgets(Array.isArray(json?.widgets) ? json.widgets : []);
    } catch (e) {
      setError(GENERIC_ERROR_MESSAGE);
      setWidgets([]);
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
        <p className="text-sm text-gray-500">Loading board dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <DashboardGrid>
      {widgets.map((w) => (
        <WidgetBlock key={w.id} w={w} />
      ))}
    </DashboardGrid>
  );
}

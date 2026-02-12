/**
 * ExecutiveDashboardContent – fetches GET /api/v1/dashboards/executive and renders widgets (Plan §4.5, §932).
 * Maps widget types to components: revenue-at-risk, forecast-summary, competitive_win_loss, risk_heatmap, top_at_risk_reasons, industry_benchmark.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { TopAtRiskReasonsCard } from '@/components/dashboard/TopAtRiskReasonsCard';
import { RiskHeatmap } from '@/components/risk/RiskHeatmap';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

export type ExecutiveWidget = {
  id: string;
  type: string;
  title?: string;
  data: Record<string, unknown>;
};

export type ExecutiveDashboardContentProps = {
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

function WidgetBlock({ w }: { w: ExecutiveWidget }) {
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
          <p className="text-xs text-gray-500">across {count.toLocaleString()} opportunities</p>
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
    case 'competitive_win_loss': {
      const mentions = (d.topCompetitorsByMentions as { competitorId?: string; competitorName?: string; mentionCount?: number }[]) ?? [];
      const wl = (d.winLoss as { wins?: number; losses?: number; winRate?: number }) ?? {};
      return (
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <h3 className="text-sm font-semibold mb-2">{t}</h3>
          {typeof wl.winRate === 'number' && (
            <p className="text-xs text-gray-500 mb-2">
              Wins: {wl.wins ?? 0}, Losses: {wl.losses ?? 0} ({(wl.winRate * 100).toFixed(0)}% win rate)
            </p>
          )}
          {mentions.length === 0 ? (
            <p className="text-sm text-gray-500">No competitor mentions</p>
          ) : (
            <ul className="space-y-2">
              {mentions.map((m, i) => (
                <li key={m?.competitorId ?? i} className="flex justify-between gap-2 text-sm">
                  <span className="font-medium truncate">{String(m?.competitorName ?? 'Unknown')}</span>
                  <span className="shrink-0 text-gray-600 dark:text-gray-400">{Number(m?.mentionCount) || 0}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    case 'risk_heatmap': {
      const segs = (d.segments as { id?: string; label?: string; riskScore?: number }[]) ?? [];
      const total = Number(d.totalAtRisk) ?? 0;
      return (
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <RiskHeatmap
            segments={segs.map((s) => ({ id: String(s?.id ?? ''), label: s?.label, riskScore: Number(s?.riskScore) || 0 }))}
            totalAtRisk={total}
            title={t}
          />
        </div>
      );
    }
    case 'top_at_risk_reasons': {
      const reasons = (d.reasons as { reason?: string; count?: number; suggestedMitigation?: string }[]) ?? [];
      return <TopAtRiskReasonsCard title={t} reasons={reasons.map((r) => ({ reason: String(r?.reason ?? ''), count: Number(r?.count) || 0, ...(r?.suggestedMitigation && { suggestedMitigation: r.suggestedMitigation }) }))} />;
    }
    case 'industry_benchmark': {
      const p10 = Number(d.p10) || 0;
      const p50 = Number(d.p50) || 0;
      const p90 = Number(d.p90) || 0;
      return (
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <h3 className="text-sm font-semibold mb-2">{t}</h3>
          <p className="text-sm text-gray-500">
            P10: {p10.toLocaleString()} | P50: {p50.toLocaleString()} | P90: {p90.toLocaleString()}
          </p>
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

export function ExecutiveDashboardContent({ apiBaseUrl = '', getHeaders }: ExecutiveDashboardContentProps) {
  const [widgets, setWidgets] = useState<ExecutiveWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/api/v1/dashboards/executive`;

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
      const json = (await res.json()) as { widgets?: ExecutiveWidget[] };
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
        <p className="text-sm text-gray-500">Loading executive dashboard…</p>
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

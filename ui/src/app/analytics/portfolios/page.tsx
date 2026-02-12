/**
 * Portfolio drill-down (Plan §6.5, §957, §958).
 * Fetches GET /api/v1/portfolios/:id/summary, /portfolios/:id/accounts;
 * GET /api/v1/accounts/:id/opportunities; GET /api/v1/opportunities/:id/activities.
 * Renders DrillDownBreadcrumb and ActivityList.
 */

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { DrillDownBreadcrumb } from '@/components/dashboard/DrillDownBreadcrumb';
import { ActivityList, type ActivityItem } from '@/components/dashboard/ActivityList';
import type { DrillDownSegment } from '@/components/dashboard/DrillDownBreadcrumb';

const apiBase = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE_URL || '') : '';

type PortfolioSummary = { opportunityCount: number; accountsCount: number; totalPipeline: number };
type PortfolioAccount = { id: string; name?: string };
type AccountOpportunity = { id: string; name?: string; amount?: number; stageName?: string };

function buildSegments(
  portfolioId: string,
  accountId?: string,
  accountLabel?: string,
  opportunityId?: string,
  opportunityLabel?: string
): DrillDownSegment[] {
  const segs: DrillDownSegment[] = [{ type: 'portfolio', id: portfolioId, label: `Portfolio ${portfolioId}` }];
  if (accountId) segs.push({ type: 'account', id: accountId, label: accountLabel || accountId });
  if (opportunityId) segs.push({ type: 'opportunity', id: opportunityId, label: opportunityLabel || opportunityId });
  return segs;
}

function PortfolioDrillDownContent() {
  const searchParams = useSearchParams();
  const portfolioId = searchParams.get('portfolioId') || 'default';
  const accountId = searchParams.get('accountId') || undefined;
  const opportunityId = searchParams.get('opportunityId') || undefined;

  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [accounts, setAccounts] = useState<PortfolioAccount[]>([]);
  const [opportunities, setOpportunities] = useState<AccountOpportunity[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base = apiBase.replace(/\/$/, '');

  const fetchSummary = useCallback(async () => {
    const res = await fetch(`${base}/api/v1/portfolios/${encodeURIComponent(portfolioId)}/summary`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Summary: ${res.status}`);
    return (await res.json()) as PortfolioSummary;
  }, [base, portfolioId]);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch(`${base}/api/v1/portfolios/${encodeURIComponent(portfolioId)}/accounts`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Accounts: ${res.status}`);
    const data = await res.json();
    return (Array.isArray(data) ? data : data?.items || []) as PortfolioAccount[];
  }, [base, portfolioId]);

  const fetchOpportunities = useCallback(async () => {
    if (!accountId) return [];
    const res = await fetch(`${base}/api/v1/accounts/${encodeURIComponent(accountId)}/opportunities`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Opportunities: ${res.status}`);
    const data = await res.json();
    return (Array.isArray(data) ? data : data?.items || []) as AccountOpportunity[];
  }, [base, accountId]);

  const fetchActivities = useCallback(async () => {
    if (!opportunityId) return [];
    const res = await fetch(`${base}/api/v1/opportunities/${encodeURIComponent(opportunityId)}/activities`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Activities: ${res.status}`);
    const data = await res.json();
    return (Array.isArray(data) ? data : data?.items || []) as ActivityItem[];
  }, [base, opportunityId]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const [s, a, o, act] = await Promise.all([
          fetchSummary().catch((e) => (cancelled ? null : (setError(e.message), null))),
          fetchAccounts().catch(() => []),
          accountId ? fetchOpportunities() : Promise.resolve([]),
          opportunityId ? fetchActivities() : Promise.resolve([]),
        ]);
        if (cancelled) return;
        if (s) setSummary(s);
        setAccounts(a);
        setOpportunities(o);
        setActivities(act);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchSummary, fetchAccounts, fetchOpportunities, fetchActivities, accountId, opportunityId]);

  const accountLabel = accountId ? (accounts.find((x) => x.id === accountId)?.name ?? accountId) : undefined;
  const opportunityLabel = opportunityId ? (opportunities.find((x) => x.id === opportunityId)?.name ?? opportunityId) : undefined;
  const segments = buildSegments(portfolioId, accountId, accountLabel, opportunityId, opportunityLabel);

  const accountQ = (aid: string) => `portfolioId=${encodeURIComponent(portfolioId)}&accountId=${encodeURIComponent(aid)}`;
  const oppQ = (oid: string) => `portfolioId=${encodeURIComponent(portfolioId)}&accountId=${encodeURIComponent(accountId!)}&opportunityId=${encodeURIComponent(oid)}`;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <Link href="/analytics/benchmarks" className="text-sm font-medium hover:underline">Benchmarks</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Portfolio drill-down</h1>
      <p className="text-muted-foreground mb-4">Portfolio → account → opportunity → activity. Plan §6.5, §957.</p>

      <DrillDownBreadcrumb segments={segments} />

      {error && (
        <div className="rounded border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 mb-4 text-sm text-red-800 dark:text-red-200">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {summary && (
            <div className="rounded-lg border p-4 bg-white dark:bg-gray-900 mb-4">
              <h2 className="text-sm font-semibold mb-2">Summary</h2>
              <p className="text-sm">Opportunities: {summary.opportunityCount} · Accounts: {summary.accountsCount} · Pipeline: {summary.totalPipeline.toLocaleString()}</p>
            </div>
          )}

          {accounts.length > 0 && (
            <div className="rounded-lg border p-4 bg-white dark:bg-gray-900 mb-4">
              <h2 className="text-sm font-semibold mb-2">Accounts</h2>
              <ul className="space-y-1">
                {accounts.map((a) => (
                  <li key={a.id}>
                    <Link href={`/analytics/portfolios?${accountQ(a.id)}`} className="text-sm font-medium hover:underline">
                      {a.name || a.id}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {accountId && (
            <div className="rounded-lg border p-4 bg-white dark:bg-gray-900 mb-4">
              <h2 className="text-sm font-semibold mb-2">Opportunities</h2>
              {opportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No opportunities</p>
              ) : (
                <ul className="space-y-1">
                  {opportunities.map((o) => (
                    <li key={o.id}>
                      <Link href={`/analytics/portfolios?${oppQ(o.id)}`} className="text-sm font-medium hover:underline">
                        {o.name || o.id} {o.amount != null ? `(${o.amount.toLocaleString()})` : ''}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {opportunityId && (
            <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
              <h2 className="text-sm font-semibold mb-2">Activities</h2>
              <ActivityList activities={activities} />
            </div>
          )}
        </>
      )}

      <p className="text-sm text-muted-foreground mt-4">
        API: dashboard-analytics GET /api/v1/portfolios/:id/summary, /portfolios/:id/accounts, /accounts/:id/opportunities, /opportunities/:id/activities.
      </p>
    </div>
  );
}

export default function PortfolioDrillDownPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
      <PortfolioDrillDownContent />
    </Suspense>
  );
}

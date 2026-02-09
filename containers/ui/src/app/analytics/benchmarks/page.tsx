/**
 * Industry benchmarks (Plan §6.5, §953, §954).
 * Fetches GET /api/v1/industries/:id/benchmarks, GET /api/v1/opportunities/:id/benchmark-comparison.
 * Maps percentiles.amount / percentiles.cycleDays to BenchmarkComparison; metrics.avgWinRate as summary.
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BenchmarkComparison } from '@/components/analytics/BenchmarkComparison';
import { ClusterVisualization } from '@/components/analytics/ClusterVisualization';

const apiBase = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE_URL || '') : '';

type IndustryBenchmark = {
  metrics?: { avgWinRate?: number; avgDealSize?: number; avgCycleTime?: number; avgRiskScore?: number };
  percentiles?: {
    p10?: { amount?: number; cycleDays?: number };
    p25?: { amount?: number; cycleDays?: number };
    p50?: { amount?: number; cycleDays?: number };
    p75?: { amount?: number; cycleDays?: number };
    p90?: { amount?: number; cycleDays?: number };
  };
  industryId?: string;
  period?: string;
  sampleSize?: number;
};

type BenchmarkComparisonResult = {
  benchmark: IndustryBenchmark;
  opportunity: { industryId?: string; amount?: number; stage?: string };
  comparison?: { amountPercentile?: number; vsAvgWinRate?: number; vsAvgDealSize?: number };
};

function toPercentiles(
  p: IndustryBenchmark['percentiles'],
  key: 'amount' | 'cycleDays'
): { p10: number; p25: number; p50: number; p75: number; p90: number } {
  return {
    p10: p?.p10?.[key] ?? 0,
    p25: p?.p25?.[key] ?? 0,
    p50: p?.p50?.[key] ?? 0,
    p75: p?.p75?.[key] ?? 0,
    p90: p?.p90?.[key] ?? 0,
  };
}

export default function IndustryBenchmarksPage() {
  const [industryId, setIndustryId] = useState('general');
  const [period, setPeriod] = useState('');
  const [opportunityId, setOpportunityId] = useState('');
  const [benchmark, setBenchmark] = useState<IndustryBenchmark | null>(null);
  const [comparison, setComparison] = useState<BenchmarkComparisonResult | null>(null);
  const [loadingBenchmarks, setLoadingBenchmarks] = useState(true);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [errorBenchmarks, setErrorBenchmarks] = useState<string | null>(null);
  const [errorComparison, setErrorComparison] = useState<string | null>(null);
  const [notFoundBenchmarks, setNotFoundBenchmarks] = useState(false);

  const fetchBenchmarks = useCallback(async () => {
    if (!industryId.trim()) return;
    setLoadingBenchmarks(true);
    setErrorBenchmarks(null);
    setNotFoundBenchmarks(false);
    const url = `${apiBase.replace(/\/$/, '')}/api/v1/industries/${encodeURIComponent(industryId.trim())}/benchmarks${period.trim() ? `?period=${encodeURIComponent(period.trim())}` : ''}`;
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.status === 404) {
        setBenchmark(null);
        setNotFoundBenchmarks(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorBenchmarks((body?.error?.message as string) || `HTTP ${res.status}`);
        setBenchmark(null);
        return;
      }
      const data = (await res.json()) as IndustryBenchmark;
      setBenchmark(data);
    } catch (e) {
      setErrorBenchmarks(e instanceof Error ? e.message : 'Failed to load benchmarks');
      setBenchmark(null);
    } finally {
      setLoadingBenchmarks(false);
    }
  }, [industryId, period]);

  const fetchComparison = useCallback(async () => {
    const id = opportunityId.trim();
    if (!id) {
      setComparison(null);
      setErrorComparison(null);
      return;
    }
    setLoadingComparison(true);
    setErrorComparison(null);
    const url = `${apiBase.replace(/\/$/, '')}/api/v1/opportunities/${encodeURIComponent(id)}/benchmark-comparison`;
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.status === 404) {
        setComparison(null);
        setErrorComparison('Opportunity or benchmark not found');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorComparison((body?.error?.message as string) || `HTTP ${res.status}`);
        setComparison(null);
        return;
      }
      const data = (await res.json()) as BenchmarkComparisonResult;
      setComparison(data);
    } catch (e) {
      setErrorComparison(e instanceof Error ? e.message : 'Failed to load comparison');
      setComparison(null);
    } finally {
      setLoadingComparison(false);
    }
  }, [opportunityId]);

  useEffect(() => { fetchBenchmarks(); }, [fetchBenchmarks]);
  useEffect(() => { fetchComparison(); }, [fetchComparison]);

  const dealSizePercentiles = benchmark ? toPercentiles(benchmark.percentiles, 'amount') : null;
  const cycleTimePercentiles = benchmark ? toPercentiles(benchmark.percentiles, 'cycleDays') : null;
  const avgWinRate = benchmark?.metrics?.avgWinRate;
  const currentDealAmount = comparison?.opportunity?.amount;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">← Dashboard</Link>
        <Link href="/analytics/competitive" className="text-sm font-medium hover:underline">Competitive</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Industry benchmarks</h1>
      <p className="text-muted-foreground mb-4">
        Compare to industry percentiles (P10–P90). Plan §6.5, §953. Data from GET /api/v1/industries/:id/benchmarks.
      </p>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">Industry</Label>
          <Input
            type="text"
            value={industryId}
            onChange={(e) => setIndustryId(e.target.value)}
            placeholder="e.g. general"
            className="w-32 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">Period (YYYY-MM)</Label>
          <Input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="optional"
            className="w-28 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">Opportunity ID</Label>
          <Input
            type="text"
            value={opportunityId}
            onChange={(e) => setOpportunityId(e.target.value)}
            placeholder="optional"
            className="w-36 h-8 text-sm"
          />
        </div>
      </div>

      {errorBenchmarks && (
        <div className="rounded border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 mb-4 text-sm text-red-800 dark:text-red-200">
          {errorBenchmarks}
        </div>
      )}
      {notFoundBenchmarks && (
        <div className="rounded border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 mb-4 text-sm text-amber-800 dark:text-amber-200">
          No benchmark for this industry/period. Run the industry-benchmarks batch job or choose another industry.
        </div>
      )}
      {errorComparison && (
        <div className="rounded border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 mb-4 text-sm text-red-800 dark:text-red-200">
          Comparison: {errorComparison}
        </div>
      )}

      {loadingBenchmarks ? (
        <p className="text-sm text-muted-foreground">Loading benchmarks…</p>
      ) : benchmark && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dealSizePercentiles && (dealSizePercentiles.p10 || dealSizePercentiles.p50 || dealSizePercentiles.p90) ? (
            <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
              <BenchmarkComparison
                percentiles={dealSizePercentiles}
                metricLabel="Deal size"
                currentValue={typeof currentDealAmount === 'number' ? currentDealAmount : undefined}
                title="Deal size (P10–P90)"
              />
            </div>
          ) : null}
          {cycleTimePercentiles && (cycleTimePercentiles.p10 || cycleTimePercentiles.p50 || cycleTimePercentiles.p90) ? (
            <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
              <BenchmarkComparison
                percentiles={cycleTimePercentiles}
                metricLabel="Cycle time (days)"
                title="Cycle time (P10–P90)"
              />
            </div>
          ) : null}
          <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
            <h3 className="text-sm font-semibold mb-2">Industry avg win rate</h3>
            <p className="text-2xl font-bold">
              {typeof avgWinRate === 'number' ? `${(avgWinRate * 100).toFixed(1)}%` : '—'}
            </p>
            {benchmark?.sampleSize != null && (
              <p className="text-xs text-muted-foreground mt-1">Sample: {benchmark.sampleSize}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <ClusterVisualization title="Risk clusters" apiBaseUrl={apiBase} />
      </div>

      {comparison && !loadingComparison && (
        <div className="mt-6 rounded-lg border p-4 bg-white dark:bg-gray-900">
          <h3 className="text-sm font-semibold mb-2">You vs benchmark</h3>
          <p className="text-sm text-muted-foreground">
            Your amount: {typeof comparison.opportunity?.amount === 'number' ? comparison.opportunity.amount.toLocaleString() : '—'}
            {typeof comparison.comparison?.vsAvgDealSize === 'number' && (
              <> · Industry avg: {comparison.comparison.vsAvgDealSize.toLocaleString()}</>
            )}
            {typeof comparison.comparison?.amountPercentile === 'number' && (
              <> · Amount at ~{Math.round(comparison.comparison.amountPercentile)}th percentile</>
            )}
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground mt-4">
        API: risk-analytics GET /api/v1/industries/:industryId/benchmarks (period?), GET /api/v1/opportunities/:opportunityId/benchmark-comparison.
      </p>
    </div>
  );
}

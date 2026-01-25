/**
 * Portfolio drill-down (Plan §6.5, §957).
 * Portfolio → account → opportunity → activity. Data: GET /api/v1/portfolios/:id/summary,
 * GET /api/v1/portfolios/:id/accounts; GET /api/v1/accounts/:id/opportunities;
 * GET /api/v1/opportunities/:id/activities.
 */

import Link from 'next/link';
import { DrillDownBreadcrumb } from '@/components/dashboard/DrillDownBreadcrumb';

const sampleBreadcrumb = [
  { type: 'portfolio' as const, id: 'P1', label: 'Enterprise' },
  { type: 'account' as const, id: 'acc-1', label: 'Acme Corp' },
  { type: 'opportunity' as const, id: 'opp-1', label: 'Q1 Deal' },
];

type Props = { searchParams: Promise<{ portfolioId?: string }> };

export default async function PortfolioDrillDownPage({ searchParams }: Props) {
  const { portfolioId } = await searchParams;
  const pid = portfolioId ?? 'P1';
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
        <Link href="/analytics/benchmarks" className="text-sm font-medium hover:underline">
          Benchmarks
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Portfolio drill-down</h1>
      <p className="text-muted-foreground mb-4">
        Portfolio → account → opportunity → activity. Plan §6.5, §957.
      </p>
      <DrillDownBreadcrumb segments={sampleBreadcrumb} />
      <div className="rounded-lg border p-4 bg-white dark:bg-gray-900 max-w-2xl">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Summary and accounts for portfolio <strong>{pid}</strong>. Wire to GET /api/v1/portfolios/:id/summary and
          GET /api/v1/portfolios/:id/accounts. Drill to accounts → GET /api/v1/accounts/:id/opportunities;
          to activities → GET /api/v1/opportunities/:id/activities.
        </p>
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        API: dashboard-analytics GET /api/v1/portfolios/:id/summary, GET /api/v1/portfolios/:id/accounts;
        GET /api/v1/accounts/:id/opportunities; shard-manager or dashboard-analytics GET /api/v1/opportunities/:id/activities.
      </p>
    </div>
  );
}

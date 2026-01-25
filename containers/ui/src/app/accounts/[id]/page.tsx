/**
 * Account detail (Plan §6.5, §936, §917).
 * Account health: score, trend, critical opportunities. Data from GET /api/v1/accounts/:id/health.
 */

import Link from 'next/link';
import { AccountHealthCard } from '@/components/account/AccountHealthCard';

const sampleHealth = {
  healthScore: 0.72,
  trend: 'improving' as const,
  criticalOpportunities: ['opp-1', 'opp-2'],
  lastUpdated: '2026-01-22',
};

type Props = { params: Promise<{ id: string }> };

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Account {id}</h1>
      <p className="text-muted-foreground mb-6">
        Account health: score, trend, critical opportunities. Plan §6.5, §936, §917.
      </p>
      <div className="max-w-sm">
        <AccountHealthCard
          healthScore={sampleHealth.healthScore}
          trend={sampleHealth.trend}
          criticalOpportunities={sampleHealth.criticalOpportunities}
          lastUpdated={sampleHealth.lastUpdated}
          title="Account health"
        />
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        API: risk-analytics GET /api/v1/accounts/:id/health (AccountHealthService; batch account-health job).
      </p>
    </div>
  );
}

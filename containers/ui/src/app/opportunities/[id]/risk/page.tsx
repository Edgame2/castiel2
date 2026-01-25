/**
 * Opportunity risk page (Plan §6.5, §936).
 * Risk-focused: gauge, trajectory, velocity, explainability.
 * Data: GET /api/v1/risk/opportunities/:id/latest-evaluation, .../risk-predictions,
 * .../risk-velocity, .../risk-explainability.
 */

import Link from 'next/link';
import { ExplainabilityCard } from '@/components/risk/ExplainabilityCard';
import { RiskGauge } from '@/components/risk/RiskGauge';
import { RiskTrajectoryChart } from '@/components/risk/RiskTrajectoryChart';
import { RiskVelocityChart } from '@/components/risk/RiskVelocityChart';
import { SimilarWonDealsCard } from '@/components/risk/SimilarWonDealsCard';

const sampleHorizons = {
  30: { riskScore: 0.42, confidence: 0.82 },
  60: { riskScore: 0.48, confidence: 0.75 },
  90: { riskScore: 0.55, confidence: 0.7 },
};

const sampleVelocity = { velocity: 0.008, acceleration: 0.001, dataPoints: 14 };

type Props = { params: Promise<{ id: string }> };

export default async function OpportunityRiskPage({ params }: Props) {
  const { id } = await params;
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/opportunities/${id}`} className="text-sm font-medium hover:underline">
          ← Opportunity {id}
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Risk</h1>
      <p className="text-muted-foreground mb-6">
        Risk score, trajectory, velocity, drivers. Plan §6.5, §936.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <RiskGauge value={0.45} label="Current risk" />
        </div>
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <RiskTrajectoryChart horizons={sampleHorizons} title="Risk trajectory" />
        </div>
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <RiskVelocityChart {...sampleVelocity} title="Risk velocity" />
        </div>
        <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
          <SimilarWonDealsCard opportunityId={id} title="Deals like this" />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <ExplainabilityCard opportunityId={id} variant="risk" title="Risk drivers" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        API: risk-analytics GET /api/v1/risk/opportunities/:id/latest-evaluation, .../risk-predictions, .../risk-velocity, .../risk-explainability, .../similar-won-deals (Plan §945).
      </p>
      <div className="flex flex-wrap gap-4 mt-2">
        <Link href={`/opportunities/${id}/remediation`} className="text-sm font-medium hover:underline">
          Remediation →
        </Link>
      </div>
    </div>
  );
}

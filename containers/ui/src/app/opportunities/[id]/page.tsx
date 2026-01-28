/**
 * Opportunity detail (Plan §6.2, §889, §901).
 * OpportunityDetailPage: risk, evaluation, early warning, win prob,
 * competitors, sentiment, anomalies, remediation.
 * ExplainabilityCard (Plan §6.3, §11.2, §901): fetches from risk-explainability and win-probability/explain when opportunityId is set.
 */

import Link from 'next/link';
import { AnomalyCard } from '@/components/dashboard/AnomalyCard';
import { RemediationWorkflowCard } from '@/components/remediation/RemediationWorkflowCard';
import { ExplainabilityCard } from '@/components/risk/ExplainabilityCard';
import { LeadingIndicatorsCard } from '@/components/dashboard/LeadingIndicatorsCard';
import { LinkCompetitorCard } from '@/components/competitive/LinkCompetitorCard';
import { SentimentTrendChart } from '@/components/analytics/SentimentTrendChart';
import { StakeholderGraph } from '@/components/analytics/StakeholderGraph';
import { WinProbabilityTrendChart } from '@/components/forecast/WinProbabilityTrendChart';

const sampleAnomalies = [
  { id: 'a1', anomalyType: 'revenue_spike', severity: 'medium' as const, description: 'Revenue 2σ above trend', detectedAt: '2026-01-20' },
  { id: 'a2', anomalyType: 'activity_gap', severity: 'low' as const, description: 'No meetings in 5 days' },
];

const sampleWorkflow = {
  id: 'wf1',
  status: 'in_progress' as const,
  assignedTo: 'jane@example.com',
  steps: [
    { stepNumber: 1, description: 'Schedule discovery call', status: 'completed' as const, completedAt: '2026-01-18', completedBy: 'jane@example.com' },
    { stepNumber: 2, description: 'Send proposal', status: 'current' as const },
    { stepNumber: 3, description: 'Follow-up meeting', status: 'pending' as const },
  ],
  completedSteps: 1,
  totalSteps: 3,
};

type Props = { params: Promise<{ id: string }> };

export default async function OpportunityDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Opportunity {id}</h1>
      <p className="text-muted-foreground mb-4">
        Detail: risk, evaluation, early warning, win prob, competitors,
        sentiment, anomalies, remediation. Plan §6.2.
      </p>
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="max-w-sm">
          <ExplainabilityCard opportunityId={id} variant="risk" title="Risk drivers" />
        </div>
        <div className="max-w-sm">
          <ExplainabilityCard opportunityId={id} variant="win_probability" title="Win probability drivers" />
        </div>
        <div className="max-w-sm">
          <AnomalyCard anomalies={sampleAnomalies} opportunityId={id} title="Anomalies" />
        </div>
        <div className="max-w-sm">
          <RemediationWorkflowCard workflow={{ ...sampleWorkflow, opportunityId: id }} title="Remediation" />
        </div>
        <div className="max-w-sm">
          <StakeholderGraph opportunityId={id} title="Stakeholder graph" />
        </div>
        <div className="max-w-sm">
          <LeadingIndicatorsCard opportunityId={id} title="Leading indicators" />
        </div>
        <div className="max-w-sm">
          <SentimentTrendChart opportunityId={id} title="Sentiment trend" />
        </div>
        <div className="max-w-sm">
          <WinProbabilityTrendChart opportunityId={id} title="Win probability trend" />
        </div>
        <div className="max-w-sm">
          <LinkCompetitorCard opportunityId={id} title="Competitors" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        API: risk-analytics (evaluation, risk-velocity, win-probability, risk-explainability,
        anomalies, sentiment-trends), CompetitiveIntelligenceService, etc.
      </p>
      <div className="flex flex-wrap gap-4 mt-4">
        <Link href={`/opportunities/${id}/risk`} className="text-sm font-medium hover:underline">
          Risk →
        </Link>
        <Link href={`/opportunities/${id}/remediation`} className="text-sm font-medium hover:underline">
          Remediation →
        </Link>
        <Link href="/opportunities" className="text-sm font-medium hover:underline">
          ← Back to Opportunities
        </Link>
      </div>
    </div>
  );
}

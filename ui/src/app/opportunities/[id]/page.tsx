/**
 * Opportunity detail — real APIs: anomalies, remediation-workflows; ExplainabilityCard etc. fetch their own.
 * No mock data.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AnomalyCard } from '@/components/dashboard/AnomalyCard';
import { RemediationWorkflowCard } from '@/components/remediation/RemediationWorkflowCard';
import { ExplainabilityCard } from '@/components/risk/ExplainabilityCard';
import { LeadingIndicatorsCard } from '@/components/dashboard/LeadingIndicatorsCard';
import { LinkCompetitorCard } from '@/components/competitive/LinkCompetitorCard';
import { SentimentTrendChart } from '@/components/analytics/SentimentTrendChart';
import { StakeholderGraph } from '@/components/analytics/StakeholderGraph';
import { WinProbabilityTrendChart } from '@/components/forecast/WinProbabilityTrendChart';
import { RecommendationsCard } from '@/components/recommendations/RecommendationsCard';
import { ProductFitCard } from '@/components/analytics/ProductFitCard';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import type { AnomalyItem } from '@/components/dashboard/AnomalyCard';
import type { RemediationWorkflow } from '@/components/remediation/RemediationWorkflowCard';

function mapAnomaly(a: { id?: string; anomalyType?: string; severity?: string; description?: string; detectedAt?: string }): AnomalyItem {
  return {
    id: a.id ?? '',
    anomalyType: a.anomalyType,
    severity: (a.severity === 'high' || a.severity === 'medium' ? a.severity : 'low') as 'low' | 'medium' | 'high',
    description: a.description ?? '',
    detectedAt: a.detectedAt,
  };
}

function mapWorkflow(w: {
  id: string;
  status?: string;
  assignedTo?: string;
  steps?: Array<{ stepNumber: number; description?: string; status?: string; completedAt?: string; completedBy?: string }>;
}): RemediationWorkflow {
  const steps = Array.isArray(w.steps) ? w.steps : [];
  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  return {
    id: w.id,
    status: (w.status === 'completed' || w.status === 'cancelled' || w.status === 'in_progress' ? w.status : 'pending') as RemediationWorkflow['status'],
    assignedTo: w.assignedTo,
    steps: steps.map((s) => ({
      stepNumber: s.stepNumber,
      description: s.description ?? '',
      status: (s.status === 'completed' || s.status === 'current' ? s.status : 'pending') as 'pending' | 'current' | 'completed',
      completedAt: s.completedAt ?? null,
      completedBy: s.completedBy ?? null,
    })),
    completedSteps,
    totalSteps: steps.length,
  };
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [workflow, setWorkflow] = useState<RemediationWorkflow | null>(null);
  const [anomaliesLoaded, setAnomaliesLoaded] = useState(false);
  const [workflowLoaded, setWorkflowLoaded] = useState(false);

  const fetchAnomalies = useCallback(async () => {
    if (!id || !getApiBaseUrl()) return;
    try {
      const res = await apiFetch(`/api/v1/opportunities/${id}/anomalies`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.anomalies) ? data.anomalies : Array.isArray(data) ? data : [];
        setAnomalies(list.map(mapAnomaly));
      }
    } finally {
      setAnomaliesLoaded(true);
    }
  }, [id]);

  const fetchWorkflows = useCallback(async () => {
    if (!id || !getApiBaseUrl()) return;
    try {
      const res = await apiFetch(`/api/v1/remediation-workflows?opportunityId=${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.workflows) ? data.workflows : Array.isArray(data) ? data : [];
        const first = list[0];
        setWorkflow(first ? mapWorkflow({ ...first, id: first.id ?? first.workflowId ?? '' }) : null);
      }
    } finally {
      setWorkflowLoaded(true);
    }
  }, [id]);

  useEffect(() => {
    fetchAnomalies();
    fetchWorkflows();
  }, [fetchAnomalies, fetchWorkflows]);

  if (!id) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Opportunity {id}</h1>
      <p className="text-muted-foreground mb-4">
        Detail: risk, evaluation, early warning, win prob, competitors,
        sentiment, anomalies, remediation.
      </p>
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="max-w-sm">
          <ExplainabilityCard opportunityId={id} variant="risk" title="Risk drivers" />
        </div>
        <div className="max-w-sm">
          <ExplainabilityCard opportunityId={id} variant="win_probability" title="Win probability drivers" />
        </div>
        <div className="max-w-sm">
          <AnomalyCard
            anomalies={anomaliesLoaded ? anomalies : []}
            opportunityId={id}
            title="Anomalies"
          />
        </div>
        <div className="max-w-sm">
          {workflowLoaded && workflow && (
            <RemediationWorkflowCard workflow={{ ...workflow, opportunityId: id }} title="Remediation" />
          )}
          {workflowLoaded && !workflow && (
            <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
              <h3 className="text-sm font-semibold mb-2">Remediation</h3>
              <p className="text-sm text-muted-foreground">No remediation workflow for this opportunity.</p>
            </div>
          )}
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
        <div className="max-w-sm">
          <ProductFitCard opportunityId={id} title="Product fit" />
        </div>
        <div className="max-w-sm">
          <RecommendationsCard opportunityId={id} title="Recommendations" />
        </div>
      </div>
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

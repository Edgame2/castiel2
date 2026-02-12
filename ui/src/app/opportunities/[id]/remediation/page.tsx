/**
 * Opportunity remediation page — real API: GET /api/v1/remediation-workflows?opportunityId=.
 * RemediationWithModal handles complete step (POST) and cancel (PUT). No mock data.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RemediationWithModal } from '@/components/remediation/RemediationWithModal';
import { CreateRemediationWorkflowButton } from '@/components/remediation/CreateRemediationWorkflowModal';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';
import type { RemediationWorkflow } from '@/components/remediation/RemediationWorkflowCard';

interface ListResponse {
  workflows?: RemediationWorkflow[];
}

function mapWorkflow(w: {
  id: string;
  status?: string;
  assignedTo?: string;
  steps?: Array<{ stepNumber: number; description?: string; status?: string; completedAt?: string | null; completedBy?: string | null }>;
  completedSteps?: number;
  totalSteps?: number;
  opportunityId?: string;
}): RemediationWorkflow {
  const steps = Array.isArray(w.steps) ? w.steps : [];
  const completedSteps = typeof w.completedSteps === 'number' ? w.completedSteps : steps.filter((s) => s.status === 'completed').length;
  const totalSteps = typeof w.totalSteps === 'number' ? w.totalSteps : steps.length;
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
    totalSteps,
    opportunityId: w.opportunityId,
  };
}

export default function OpportunityRemediationPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [workflow, setWorkflow] = useState<RemediationWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    if (!id) return;
    const base = getApiBaseUrl();
    if (!base) {
      setLoading(false);
      setError('API base URL not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/remediation-workflows?opportunityId=${encodeURIComponent(id)}`);
      if (!res.ok) {
        setWorkflow(null);
        if (res.status >= 500) setError(GENERIC_ERROR_MESSAGE);
        return;
      }
      const data: ListResponse = await res.json();
      const list = Array.isArray(data.workflows) ? data.workflows : [];
      const first = list[0];
      setWorkflow(first ? mapWorkflow({ ...first, id: first.id, opportunityId: id }) : null);
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setWorkflow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleCancel = useCallback(
    async (workflowId: string) => {
      try {
        const res = await apiFetch(`/api/v1/remediation-workflows/${workflowId}/cancel`, { method: 'PUT' });
        if (res.ok) await fetchWorkflows();
      } catch {
        // leave workflow state as-is; user can retry
      }
    },
    [fetchWorkflows]
  );

  if (!id) return null;

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link href={`/opportunities/${id}`} className="text-sm font-medium hover:underline">
            ← Opportunity {id}
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-2">Remediation</h1>
        <p className="text-muted-foreground mb-6">Workflow steps, progress, complete.</p>
        <Skeleton className="h-48 max-w-lg rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/opportunities/${id}`} className="text-sm font-medium hover:underline">
          ← Opportunity {id}
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Remediation</h1>
      <p className="text-muted-foreground mb-6">
        Workflow steps, progress, complete.
      </p>
      {error && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 mb-4">
        <CreateRemediationWorkflowButton opportunityId={id} onCreated={fetchWorkflows} />
      </div>
      {workflow ? (
        <div className="max-w-lg">
          <RemediationWithModal
            workflow={{ ...workflow, opportunityId: id }}
            title="Remediation workflow"
            onStepCompleted={fetchWorkflows}
            onCancel={handleCancel}
          />
        </div>
      ) : (
        <p className="text-muted-foreground">No remediation workflow for this opportunity. Create one above.</p>
      )}
      <div className="flex flex-wrap gap-4 mt-4">
        <Link href={`/opportunities/${id}/risk`} className="text-sm font-medium hover:underline">
          Risk →
        </Link>
        <Link href={`/opportunities/${id}`} className="text-sm font-medium hover:underline">
          ← Opportunity
        </Link>
        <Link href="/opportunities" className="text-sm font-medium hover:underline">
          ← Opportunities
        </Link>
      </div>
    </div>
  );
}

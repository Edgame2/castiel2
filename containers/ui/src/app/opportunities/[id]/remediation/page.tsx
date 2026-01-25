/**
 * Opportunity remediation page (Plan §6.5, §936).
 * Remediation workflows: steps, progress, complete. Optional CreateRemediationWorkflowModal, CompleteRemediationStepModal.
 * Data: GET /api/v1/remediation-workflows?opportunityId=; POST .../steps/:stepNumber/complete; PUT .../cancel.
 */

import Link from 'next/link';
import { RemediationWithModal } from '@/components/remediation/RemediationWithModal';
import { CreateRemediationWorkflowButton } from '@/components/remediation/CreateRemediationWorkflowModal';

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

export default async function OpportunityRemediationPage({ params }: Props) {
  const { id } = await params;
  const workflow = { ...sampleWorkflow, opportunityId: id };
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/opportunities/${id}`} className="text-sm font-medium hover:underline">
          ← Opportunity {id}
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Remediation</h1>
      <p className="text-muted-foreground mb-6">
        Workflow steps, progress, complete. Plan §6.5, §936, §937.
      </p>
      <div className="flex items-center gap-2 mb-4">
        <CreateRemediationWorkflowButton opportunityId={id} />
      </div>
      <div className="max-w-lg">
        <RemediationWithModal workflow={workflow} title="Remediation workflow" />
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        API: recommendations GET /api/v1/remediation-workflows?opportunityId=, POST .../steps/:stepNumber/complete, PUT .../cancel.
      </p>
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

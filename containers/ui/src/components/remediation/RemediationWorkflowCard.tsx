/**
 * RemediationWorkflowCard – steps, progress, complete (Plan §6.3, §937).
 * Data from recommendations GET /api/v1/remediation-workflows?opportunityId= or GET /api/v1/remediation-workflows/:id.
 * Complete step: POST /api/v1/remediation-workflows/:id/steps/:stepNumber/complete.
 * Cancel: PUT /api/v1/remediation-workflows/:id/cancel.
 */

'use client';

export type RemediationStep = {
  stepNumber: number;
  description: string;
  status: 'pending' | 'current' | 'completed';
  completedAt?: string | null;
  completedBy?: string | null;
};

export type RemediationWorkflow = {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  steps: RemediationStep[];
  completedSteps: number;
  totalSteps: number;
  opportunityId?: string;
};

export type RemediationWorkflowCardProps = {
  workflow: RemediationWorkflow;
  onCompleteStep?: (workflowId: string, stepNumber: number) => void;
  onCancel?: (workflowId: string) => void;
  title?: string;
};

export function RemediationWorkflowCard({
  workflow,
  onCompleteStep,
  onCancel,
  title = 'Remediation',
}: RemediationWorkflowCardProps) {
  const { id, status, assignedTo, steps, completedSteps, totalSteps } = workflow;
  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const isDone = status === 'completed' || status === 'cancelled';
  const canComplete = !isDone && Boolean(onCompleteStep);

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            status === 'completed'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
              : status === 'cancelled'
                ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
          }`}
        >
          {status}
        </span>
      </div>
      {assignedTo && <p className="text-xs text-gray-500 mb-2">Assigned to {assignedTo}</p>}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-3">
        <div
          className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {completedSteps} / {totalSteps} steps
      </p>
      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s.stepNumber} className="flex items-start gap-2 text-sm">
            <span
              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                s.status === 'completed'
                  ? 'bg-emerald-500 text-white'
                  : s.status === 'current'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
              }`}
            >
              {s.status === 'completed' ? '✓' : s.stepNumber}
            </span>
            <span className="flex-1 min-w-0">{s.description}</span>
            {s.status === 'completed' && s.completedAt && (
              <span className="text-xs text-gray-400">{s.completedAt.slice(0, 10)}</span>
            )}
            {canComplete && (s.status === 'pending' || s.status === 'current') && onCompleteStep && (
              <button
                type="button"
                onClick={() => onCompleteStep(id, s.stepNumber)}
                className="text-xs font-medium text-blue-600 hover:underline shrink-0"
              >
                Complete
              </button>
            )}
          </li>
        ))}
      </ul>
      {canComplete && onCancel && (
        <div className="mt-3 pt-3 border-t">
          <button
            type="button"
            onClick={() => onCancel(id)}
            className="text-xs font-medium text-gray-600 hover:underline"
          >
            Cancel workflow
          </button>
        </div>
      )}
    </div>
  );
}

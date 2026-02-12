/**
 * RemediationWithModal – RemediationWorkflowCard + CompleteRemediationStepModal (Plan §6.3, §937).
 * Wires onCompleteStep to open the modal; on submit, POST .../steps/:stepNumber/complete and onStepCompleted.
 */

'use client';

import { useState, useCallback } from 'react';
import { RemediationWorkflowCard, type RemediationWorkflow } from './RemediationWorkflowCard';
import { CompleteRemediationStepModal } from './CompleteRemediationStepModal';

export type RemediationWithModalProps = {
  workflow: RemediationWorkflow;
  title?: string;
  onCancel?: (workflowId: string) => void;
  /** Called after a step is completed (e.g. refetch). */
  onStepCompleted?: () => void;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
  /** Optional. Omit to use relative /api/v1/... */
  apiBaseUrl?: string;
};

export function RemediationWithModal({
  workflow,
  title,
  onCancel,
  onStepCompleted,
  getHeaders,
  apiBaseUrl,
}: RemediationWithModalProps) {
  const [modal, setModal] = useState<{
    open: boolean;
    workflowId: string;
    stepNumber: number;
    stepDescription: string;
  } | null>(null);

  const onCompleteStep = useCallback(
    (workflowId: string, stepNumber: number) => {
      const step = workflow.steps.find((s) => s.stepNumber === stepNumber);
      setModal({
        open: true,
        workflowId,
        stepNumber,
        stepDescription: step?.description ?? `Step ${stepNumber}`,
      });
    },
    [workflow.steps]
  );

  const closeModal = useCallback(() => {
    setModal((m) => (m ? { ...m, open: false } : null));
  }, []);

  const handleSubmitted = useCallback(() => {
    onStepCompleted?.();
  }, [onStepCompleted]);

  return (
    <>
      <RemediationWorkflowCard
        workflow={workflow}
        onCompleteStep={onCompleteStep}
        onCancel={onCancel}
        title={title}
      />
      {modal && (
        <CompleteRemediationStepModal
          isOpen
          onClose={closeModal}
          workflowId={modal.workflowId}
          stepNumber={modal.stepNumber}
          stepDescription={modal.stepDescription}
          onSubmitted={handleSubmitted}
          apiBaseUrl={apiBaseUrl}
          getHeaders={getHeaders}
        />
      )}
    </>
  );
}

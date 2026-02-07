/**
 * Remediation Workflow Service (Plan §927–929)
 * CRUD and step completion for recommendation_remediation_workflows.
 * Publishes remediation.workflow.created, remediation.step.completed, remediation.workflow.completed.
 */

import { getContainer } from '@coder/shared';
import { v4 as uuidv4 } from 'uuid';
import {
  RemediationWorkflow,
  RemediationWorkflowStep,
  CreateRemediationWorkflowInput,
} from '../types/recommendations.types';
import {
  publishRemediationWorkflowCreated,
  publishRemediationStepCompleted,
  publishRemediationWorkflowCompleted,
} from '../events/publishers/RecommendationEventPublisher.js';

const CONTAINER = 'recommendation_remediation_workflows';

export async function createWorkflow(tenantId: string, input: CreateRemediationWorkflowInput): Promise<RemediationWorkflow> {
  const now = new Date().toISOString();
  if (!input.steps || input.steps.length === 0) {
    throw Object.assign(new Error('At least one step is required'), { statusCode: 400 });
  }
  const steps: RemediationWorkflowStep[] = input.steps.map((s, i) => ({
    stepNumber: i + 1,
    actionId: s.actionId,
    description: s.description,
    status: i === 0 ? ('current' as const) : ('pending' as const),
    estimatedEffort: s.estimatedEffort,
    completedAt: null,
    completedBy: null,
  }));
  const workflow: RemediationWorkflow = {
    id: uuidv4(),
    tenantId,
    opportunityId: input.opportunityId,
    riskId: input.riskId,
    status: 'in_progress',
    assignedTo: input.assignedTo ?? '',
    steps,
    completedSteps: 0,
    totalSteps: steps.length,
    createdAt: now,
    updatedAt: now,
  };
  const container = getContainer(CONTAINER);
  await container.items.create(workflow);
  await publishRemediationWorkflowCreated(tenantId, {
    workflowId: workflow.id,
    opportunityId: workflow.opportunityId,
    assignedTo: workflow.assignedTo,
  });
  return workflow;
}

export async function getWorkflow(id: string, tenantId: string): Promise<RemediationWorkflow | null> {
  const container = getContainer(CONTAINER);
  const { resource } = await container.item(id, tenantId).read();
  return (resource as RemediationWorkflow) ?? null;
}

export async function getWorkflowsByOpportunity(opportunityId: string, tenantId: string): Promise<RemediationWorkflow[]> {
  const container = getContainer(CONTAINER);
  const { resources } = await container.items
    .query<RemediationWorkflow>({
      query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId ORDER BY c.updatedAt DESC',
      parameters: [{ name: '@opportunityId', value: opportunityId }],
    }, { partitionKey: tenantId })
    .fetchAll();
  return resources ?? [];
}

export async function completeStep(
  workflowId: string,
  stepNumber: number,
  tenantId: string,
  completedBy: string
): Promise<RemediationWorkflow> {
  const w = await getWorkflow(workflowId, tenantId);
  if (!w) throw Object.assign(new Error('Remediation workflow not found'), { statusCode: 404 });
  if (w.status === 'completed' || w.status === 'cancelled') {
    throw Object.assign(new Error('Workflow is already completed or cancelled'), { statusCode: 400 });
  }
  const step = w.steps.find((s) => s.stepNumber === stepNumber);
  if (!step) throw Object.assign(new Error('Step not found'), { statusCode: 404 });
  if (step.status === 'completed') {
    throw Object.assign(new Error('Step already completed'), { statusCode: 400 });
  }
  const now = new Date().toISOString();
  for (const s of w.steps) {
    if (s.stepNumber === stepNumber) {
      s.status = 'completed';
      s.completedAt = now;
      s.completedBy = completedBy;
    }
  }
  const next = w.steps.find((s) => s.status === 'pending');
  if (next) next.status = 'current';
  w.completedSteps = w.steps.filter((s) => s.status === 'completed').length;
  w.updatedAt = now;

  const allStepsComplete = w.completedSteps >= w.totalSteps;
  if (allStepsComplete) {
    w.status = 'completed';
    const created = new Date(w.createdAt).getTime();
    const duration = Math.round((Date.now() - created) / 1000);
    await publishRemediationWorkflowCompleted(tenantId, {
      workflowId: w.id,
      opportunityId: w.opportunityId,
      status: 'completed',
      completedAt: now,
      userId: completedBy,
      duration,
    });
  } else {
    await publishRemediationStepCompleted(tenantId, {
      workflowId: w.id,
      stepNumber,
      completedBy,
      allStepsComplete: false,
    });
  }

  const container = getContainer(CONTAINER);
  await container.items.upsert(w);
  return w;
}

/**
 * Cancel a remediation workflow (Plan §928, §435). Sets status to cancelled.
 */
export async function cancelWorkflow(workflowId: string, tenantId: string): Promise<RemediationWorkflow> {
  const w = await getWorkflow(workflowId, tenantId);
  if (!w) throw Object.assign(new Error('Remediation workflow not found'), { statusCode: 404 });
  if (w.status === 'completed') {
    throw Object.assign(new Error('Cannot cancel a completed workflow'), { statusCode: 400 });
  }
  if (w.status === 'cancelled') {
    return w;
  }
  const now = new Date().toISOString();
  w.status = 'cancelled';
  w.updatedAt = now;
  const container = getContainer(CONTAINER);
  await container.items.upsert(w);
  return w;
}

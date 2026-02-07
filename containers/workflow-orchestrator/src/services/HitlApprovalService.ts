/**
 * HITL Approval Service (Plan §972, hitl-approval-flow runbook).
 * Persists approvals from hitl.approval.requested; supports approve/reject and publish hitl.approval.completed.
 */

import { randomUUID } from 'crypto';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { publishHitlApprovalCompleted } from '../events/publishers/WorkflowEventPublisher.js';

const CONTAINER_KEY = 'hitl_approvals';

export interface HitlApproval {
  id: string;
  tenantId: string;
  opportunityId: string;
  riskScore: number;
  amount: number;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  ownerId?: string;
  approverId?: string;
  recipientId?: string;
  correlationId?: string;
  decidedBy?: string;
  decidedAt?: string;
  comment?: string;
}

export interface HitlApprovalRequestedData {
  opportunityId: string;
  riskScore: number;
  amount: number;
  requestedAt: string;
  ownerId?: string;
  approverId?: string;
  recipientId?: string;
  correlationId?: string;
  approvalUrl?: string;
}

/**
 * Create an approval record from hitl.approval.requested event. Called by WorkflowOrchestratorEventConsumer.
 */
export async function createFromEvent(tenantId: string, data: HitlApprovalRequestedData): Promise<HitlApproval> {
  const config = loadConfig();
  const containerName = config.cosmos_db.containers.hitl_approvals ?? CONTAINER_KEY;
  const container = getContainer(containerName);

  const id = randomUUID();
  const doc: HitlApproval = {
    id,
    tenantId,
    opportunityId: data.opportunityId,
    riskScore: data.riskScore,
    amount: data.amount,
    requestedAt: data.requestedAt,
    status: 'pending',
    ownerId: data.ownerId,
    approverId: data.approverId,
    recipientId: data.recipientId,
    correlationId: data.correlationId,
  };

  await container.items.create(doc, { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]);
  log.info('HITL approval created', { approvalId: id, opportunityId: data.opportunityId, tenantId, service: 'workflow-orchestrator' });
  return doc;
}

/**
 * Get approval by id and tenantId. Returns null if not found.
 */
export async function getById(id: string, tenantId: string): Promise<HitlApproval | null> {
  const config = loadConfig();
  const containerName = config.cosmos_db.containers.hitl_approvals ?? CONTAINER_KEY;
  const container = getContainer(containerName);
  const { resource } = await container.item(id, tenantId).read<HitlApproval>();
  return resource ?? null;
}

/**
 * Approve an HITL request. Updates status, publishes hitl.approval.completed. Throws if not pending.
 */
export async function approve(
  id: string,
  tenantId: string,
  body: { decidedBy: string; comment?: string }
): Promise<HitlApproval> {
  const doc = await getById(id, tenantId);
  if (!doc) throw Object.assign(new Error('HITL approval not found'), { statusCode: 404 });
  if (doc.status !== 'pending') {
    throw Object.assign(new Error(`HITL approval is not pending (status=${doc.status})`), { statusCode: 409 });
  }
  const decidedAt = new Date().toISOString();
  const updated: HitlApproval = {
    ...doc,
    status: 'approved',
    decidedBy: body.decidedBy,
    decidedAt,
    comment: body.comment,
  };
  const containerName = loadConfig().cosmos_db.containers.hitl_approvals ?? CONTAINER_KEY;
  await getContainer(containerName).items.upsert(updated);

  await publishHitlApprovalCompleted(tenantId, {
    opportunityId: doc.opportunityId,
    approvalId: id,
    approved: true,
    decidedBy: body.decidedBy,
    decidedAt,
  });
  log.info('HITL approval approved', { approvalId: id, opportunityId: doc.opportunityId, tenantId, service: 'workflow-orchestrator' });
  return updated;
}

/**
 * Reject an HITL request. Updates status, publishes hitl.approval.completed. Throws if not pending.
 */
export async function reject(
  id: string,
  tenantId: string,
  body: { decidedBy: string; comment?: string }
): Promise<HitlApproval> {
  const doc = await getById(id, tenantId);
  if (!doc) throw Object.assign(new Error('HITL approval not found'), { statusCode: 404 });
  if (doc.status !== 'pending') {
    throw Object.assign(new Error(`HITL approval is not pending (status=${doc.status})`), { statusCode: 409 });
  }
  const decidedAt = new Date().toISOString();
  const updated: HitlApproval = {
    ...doc,
    status: 'rejected',
    decidedBy: body.decidedBy,
    decidedAt,
    comment: body.comment,
  };
  const containerName = loadConfig().cosmos_db.containers.hitl_approvals ?? CONTAINER_KEY;
  await getContainer(containerName).items.upsert(updated);

  await publishHitlApprovalCompleted(tenantId, {
    opportunityId: doc.opportunityId,
    approvalId: id,
    approved: false,
    decidedBy: body.decidedBy,
    decidedAt,
  });
  log.info('HITL approval rejected', { approvalId: id, opportunityId: doc.opportunityId, tenantId, service: 'workflow-orchestrator' });
  return updated;
}

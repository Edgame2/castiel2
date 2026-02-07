/**
 * Quick Actions Service (Plan §942, §11.10)
 * POST /api/v1/opportunities/:id/quick-actions: create_task, log_activity, start_remediation.
 * Publishes opportunity.quick_action.requested for async handling by workflow-orchestrator,
 * integration-manager, or recommendations (start_remediation when POST /remediation-workflows exists).
 */

import { publishOpportunityQuickActionRequested } from '../events/publishers/RiskAnalyticsEventPublisher.js';
import { log } from '../utils/logger.js';

export type QuickActionType = 'create_task' | 'log_activity' | 'start_remediation';

export interface QuickActionInput {
  action: QuickActionType;
  payload?: Record<string, unknown>;
}

export interface QuickActionResponse {
  status: 'accepted';
  action: QuickActionType;
}

/**
 * Execute a quick action. Publishes opportunity.quick_action.requested and returns 202 Accepted.
 * start_remediation: when recommendations exposes POST /remediation-workflows, can call synchronously; for now event-only.
 */
export async function executeQuickAction(
  opportunityId: string,
  tenantId: string,
  userId: string,
  input: QuickActionInput
): Promise<QuickActionResponse> {
  const { action, payload } = input;
  const allowed: QuickActionType[] = ['create_task', 'log_activity', 'start_remediation'];
  if (!allowed.includes(action)) {
    throw new Error(`Invalid quick action: ${action}. Must be one of: ${allowed.join(', ')}`);
  }

  await publishOpportunityQuickActionRequested(tenantId, {
    opportunityId,
    userId,
    action,
    payload: payload ?? {},
  });

  log.info('Quick action accepted', { opportunityId, action, tenantId, service: 'risk-analytics' });
  return { status: 'accepted', action };
}

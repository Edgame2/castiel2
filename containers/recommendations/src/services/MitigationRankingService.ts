/**
 * Mitigation Ranking Service (Plan §427–428, §927)
 * Ranks mitigation actions for an opportunity's risks.
 * Reads from recommendation_mitigation_actions (Plan §3.1.4) when present; otherwise stub.
 * Future: ml-service mitigation-ranking-model (Azure ML) for opportunity-specific ranking.
 */

import { getContainer } from '@coder/shared';
import { RankedMitigationAction, RankedMitigationResponse } from '../types/recommendations.types';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utils/logger.js';

const CONTAINER = 'recommendation_mitigation_actions';

/** Catalog doc in recommendation_mitigation_actions (tenantId partition). */
interface MitigationActionDoc {
  id: string;
  tenantId: string;
  actionId: string;
  title: string;
  description: string;
  rank?: number;
  estimatedImpact?: 'high' | 'medium' | 'low';
  estimatedEffort?: 'low' | 'medium' | 'high';
}

function toRankedAction(d: MitigationActionDoc, rank: number): RankedMitigationAction {
  return {
    id: d.id,
    actionId: d.actionId,
    title: d.title,
    description: d.description,
    rank,
    estimatedImpact: d.estimatedImpact,
    estimatedEffort: d.estimatedEffort,
  };
}

/** Stub when Cosmos is empty or unavailable. */
function stubActions(): RankedMitigationAction[] {
  return [
    { id: uuidv4(), actionId: 'schedule_executive_cadence', title: 'Schedule executive sponsor cadence', description: 'Set a recurring meeting with the executive sponsor to address risk drivers.', rank: 1, estimatedImpact: 'high', estimatedEffort: 'low' },
    { id: uuidv4(), actionId: 'expand_buying_committee', title: 'Expand buying committee coverage', description: 'Identify and engage missing roles (economic buyer, champion, influencer).', rank: 2, estimatedImpact: 'high', estimatedEffort: 'medium' },
    { id: uuidv4(), actionId: 'log_competitive_intel', title: 'Log competitive intelligence', description: 'Document competitor mentions and win/loss signals for this opportunity.', rank: 3, estimatedImpact: 'medium', estimatedEffort: 'low' },
    { id: uuidv4(), actionId: 'increase_activity_cadence', title: 'Increase activity cadence', description: 'Schedule more frequent calls and meetings to reduce days since last activity.', rank: 4, estimatedImpact: 'medium', estimatedEffort: 'medium' },
    { id: uuidv4(), actionId: 'review_stage_velocity', title: 'Review stage velocity', description: 'Analyze stage stagnation and consider stage-specific plays.', rank: 5, estimatedImpact: 'medium', estimatedEffort: 'low' },
  ];
}

/**
 * Returns ranked mitigation actions for an opportunity.
 * Reads from recommendation_mitigation_actions when tenant has custom actions; else stub.
 * @param opportunityId - c_opportunity shard id (Plan: opportunityId convention)
 * @param tenantId - partition/tenant
 * @returns Ranked list of actions for use in remediation workflows
 */
export async function rankMitigationActions(
  opportunityId: string,
  tenantId: string
): Promise<RankedMitigationResponse> {
  try {
    const container = getContainer(CONTAINER);
    const queryOptions = { partitionKey: tenantId };
    const { resources } = await container.items
      .query<MitigationActionDoc>(
        { query: 'SELECT * FROM c ORDER BY c.rank ASC, c.id ASC', parameters: [] },
        queryOptions as Parameters<typeof container.items.query>[1]
      )
      .fetchAll();
    if (resources && resources.length > 0) {
      const actions = resources.map((d: MitigationActionDoc, i: number) => toRankedAction(d, d.rank ?? i + 1));
      return { opportunityId, tenantId, actions };
    }
  } catch (e) {
    log.warn('MitigationRankingService: recommendation_mitigation_actions read failed, using stub', { error: e instanceof Error ? e.message : String(e), tenantId, service: 'recommendations' });
  }
  return { opportunityId, tenantId, actions: stubActions() };
}

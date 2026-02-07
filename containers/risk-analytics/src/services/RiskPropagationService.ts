/**
 * Risk Propagation Service (Plan §916).
 * analyzeRiskPropagation(opportunityId, tenantId): propagation from one opportunity.
 * computeAndPersistForTenant(tenantId): batch over opportunities; used by propagation job (Plan §9.3).
 * Full impl: build graph (opportunities, accounts, contacts from shard-manager), call Azure ML
 * batch `risk-propagation` (NetworkX/PageRank-like), persist or return propagated risk per node.
 * Stub: returns placeholder until graph + Azure ML batch wired.
 */

import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { log } from '../utils/logger.js';

export interface RiskPropagationResult {
  opportunityId: string;
  tenantId: string;
  propagatedRisk?: number;
  affectedNodeIds?: string[];
  /** True when graph + Azure ML batch not yet wired (Plan §916). */
  _stub?: boolean;
}

export class RiskPropagationService {
  constructor(_app?: FastifyInstance) {}

  /**
   * Analyze risk propagation from one opportunity (Plan §4.1, §916).
   * Stub: returns placeholder. Full: build graph, Azure ML batch (NetworkX), propagated risk per node.
   */
  async analyzeRiskPropagation(opportunityId: string, tenantId: string): Promise<RiskPropagationResult> {
    return {
      opportunityId,
      tenantId,
      propagatedRisk: undefined,
      affectedNodeIds: [],
      _stub: true,
    };
  }

  /**
   * Run propagation for all opportunities in the tenant (Plan §9.3, §916).
   * Stub: calls analyzeRiskPropagation for each opp from risk_revenue_at_risk; no persistence.
   * Full: build graph once, Azure ML batch (NetworkX), persist propagated scores.
   */
  async computeAndPersistForTenant(tenantId: string): Promise<{ processed: number }> {
    const raContainer = getContainer('risk_revenue_at_risk');
    const { resources } = await raContainer.items
      .query<{ opportunityId: string }>({ query: 'SELECT DISTINCT c.opportunityId FROM c', parameters: [] }, { partitionKey: tenantId })
      .fetchAll();
    const oppIds = [...new Set((resources ?? []).map(r => r.opportunityId).filter(Boolean))] as string[];
    let processed = 0;
    for (const oppId of oppIds) {
      await this.analyzeRiskPropagation(oppId, tenantId);
      processed++;
    }
    if (processed > 0) {
      log.info('RiskPropagationService.computeAndPersistForTenant completed (stub)', { tenantId, processed, service: 'risk-analytics' });
    }
    return { processed };
  }
}

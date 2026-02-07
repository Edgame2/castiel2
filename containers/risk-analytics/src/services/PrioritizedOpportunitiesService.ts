/**
 * Prioritized Opportunities Service
 * Ranks opportunities by revenue-at-risk × risk × early-warning for "Recommended today" (Plan §941, §1024).
 * Consumes risk_revenue_at_risk (latest per opportunity) and risk_warnings (max severity) for early-warning multiplier.
 */

import { getContainer } from '@coder/shared/database';
import { log } from '../utils/logger.js';

const MAX_OPPORTUNITIES = 20;
const MAX_RAW_ROWS = 1000;

const SEVERITY_MULTIPLIER: Record<string, number> = {
  low: 1.1,
  medium: 1.3,
  high: 1.5,
  critical: 1.8,
};

const SEVERITY_TO_SCORE: Record<string, number> = {
  low: 0.25,
  medium: 0.5,
  high: 0.75,
  critical: 1,
};

export interface PrioritizedOpportunity {
  opportunityId: string;
  revenueAtRisk?: number;
  riskScore?: number;
  earlyWarningScore?: number;
  suggestedAction?: string;
  rankScore?: number;
}

export interface PrioritizedOpportunitiesResponse {
  opportunities: PrioritizedOpportunity[];
  suggestedAction: string | null;
}

/**
 * Get prioritized opportunities for tenant. Rank = revenueAtRisk × riskScore × earlyWarningMultiplier.
 * suggestedAction is null until mitigation-ranking / recommendations is wired (Phase 2).
 */
export async function getPrioritizedOpportunities(tenantId: string): Promise<PrioritizedOpportunitiesResponse> {
  try {
    const raContainer = getContainer('risk_revenue_at_risk');
    const { resources: raRows } = await raContainer.items
      .query<{ opportunityId: string; riskScore?: number; revenueAtRisk?: number; calculatedAt?: string }>({
        query: `SELECT TOP ${MAX_RAW_ROWS} c.opportunityId, c.riskScore, c.revenueAtRisk, c.calculatedAt FROM c ORDER BY c.calculatedAt DESC`,
        parameters: [],
      }, { partitionKey: tenantId })
      .fetchAll();

    const byOpp = new Map<string, { riskScore: number; revenueAtRisk: number }>();
    for (const r of raRows || []) {
      if (r?.opportunityId && !byOpp.has(r.opportunityId)) {
        byOpp.set(r.opportunityId, {
          riskScore: typeof r.riskScore === 'number' ? r.riskScore : 0.5,
          revenueAtRisk: typeof r.revenueAtRisk === 'number' ? r.revenueAtRisk : 0,
        });
      }
    }

    const warnContainer = getContainer('risk_warnings');
    const { resources: warnRows } = await warnContainer.items
      .query<{ opportunityId: string; severity?: string }>({
        query: 'SELECT c.opportunityId, c.severity FROM c',
        parameters: [],
      }, { partitionKey: tenantId })
      .fetchAll();

    const severityByOpp = new Map<string, { mult: number; score: number }>();
    for (const w of warnRows || []) {
      if (!w?.opportunityId) continue;
      const mult = SEVERITY_MULTIPLIER[w.severity ?? ''] ?? 1;
      const score = SEVERITY_TO_SCORE[w.severity ?? ''] ?? 0;
      const cur = severityByOpp.get(w.opportunityId);
      if (!cur || cur.mult < mult) severityByOpp.set(w.opportunityId, { mult, score });
    }

    const list: PrioritizedOpportunity[] = [];
    for (const [opportunityId, { riskScore, revenueAtRisk }] of byOpp.entries()) {
      const { mult = 1, score: earlyScore = 0 } = severityByOpp.get(opportunityId) ?? {};
      const rankScore = revenueAtRisk * riskScore * mult;
      list.push({
        opportunityId,
        revenueAtRisk,
        riskScore,
        earlyWarningScore: earlyScore,
        suggestedAction: undefined,
        rankScore,
      });
    }

    list.sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));
    const opportunities = list.slice(0, MAX_OPPORTUNITIES);

    return { opportunities, suggestedAction: null };
  } catch (e) {
    log.error('getPrioritizedOpportunities failed', e instanceof Error ? e : new Error(String(e)), { tenantId, service: 'risk-analytics' });
    return { opportunities: [], suggestedAction: null };
  }
}

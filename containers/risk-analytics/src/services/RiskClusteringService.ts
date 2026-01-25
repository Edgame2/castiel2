/**
 * Risk Clustering Service (Plan §914, §915).
 * identifyRiskClusters / findAssociationRules: read from risk_clusters, risk_association_rules.
 * computeAndPersistForTenant: heuristic clustering from risk_revenue_at_risk (riskScore bands);
 *   persists risk_clusters, publishes risk.cluster.updated. Full Azure ML DBSCAN/K-Means + Apriori TBD.
 */

import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { publishRiskAnalyticsEvent } from '../events/publishers/RiskAnalyticsEventPublisher';

export interface RiskClusterDoc {
  id: string;
  tenantId: string;
  clusterId?: string;
  label?: string;
  opportunityIds?: string[];
  centroid?: Record<string, number>;
  computedAt?: string;
  [k: string]: unknown;
}

export interface AssociationRuleDoc {
  id: string;
  tenantId: string;
  antecedent?: string[];
  consequent?: string[];
  confidence?: number;
  support?: number;
  lift?: number;
  computedAt?: string;
  [k: string]: unknown;
}

/** Row from risk_revenue_at_risk for clustering input. */
interface RevAtRiskRow {
  opportunityId: string;
  riskScore?: number;
  calculatedAt?: string;
}

export class RiskClusteringService {
  private config: ReturnType<typeof loadConfig>;

  constructor(_app?: FastifyInstance) {
    this.config = loadConfig();
  }

  /**
   * Get risk clusters for tenant (Plan §4.1, §915). Reads from risk_clusters.
   * Returns [] if container missing or empty.
   */
  async identifyRiskClusters(tenantId: string): Promise<RiskClusterDoc[]> {
    const name = this.config.cosmos_db?.containers?.clusters ?? 'risk_clusters';
    try {
      const container = getContainer(name);
      const { resources } = await container.items
        .query({ query: 'SELECT * FROM c', parameters: [] }, { partitionKey: tenantId })
        .fetchAll();
      return (resources as RiskClusterDoc[]) ?? [];
    } catch (e) {
      if ((e as { code?: number })?.code === 404) return [];
      log.warn('identifyRiskClusters: container or query failed', {
        container: name,
        tenantId,
        err: e instanceof Error ? e.message : String(e),
        service: 'risk-analytics',
      });
      return [];
    }
  }

  /**
   * Get association rules for tenant (Plan §4.1, §915). Reads from risk_association_rules.
   * Returns [] if container missing or empty.
   */
  async findAssociationRules(tenantId: string): Promise<AssociationRuleDoc[]> {
    const name = this.config.cosmos_db?.containers?.association_rules ?? 'risk_association_rules';
    try {
      const container = getContainer(name);
      const { resources } = await container.items
        .query({ query: 'SELECT * FROM c', parameters: [] }, { partitionKey: tenantId })
        .fetchAll();
      return (resources as AssociationRuleDoc[]) ?? [];
    } catch (e) {
      if ((e as { code?: number })?.code === 404) return [];
      log.warn('findAssociationRules: container or query failed', {
        container: name,
        tenantId,
        err: e instanceof Error ? e.message : String(e),
        service: 'risk-analytics',
      });
      return [];
    }
  }

  /**
   * Compute clusters from risk_revenue_at_risk (riskScore bands) and persist to risk_clusters.
   * Stub: 3 bands (low/medium/high). Azure ML DBSCAN/K-Means + Apriori TBD.
   * Publishes risk.cluster.updated (Plan §7.1). Used by risk-clustering batch job (Plan §9.3, §914).
   */
  async computeAndPersistForTenant(tenantId: string): Promise<{ clustersWritten: number; rulesWritten: number }> {
    const clustersName = this.config.cosmos_db?.containers?.clusters ?? 'risk_clusters';
    const raContainer = getContainer('risk_revenue_at_risk');
    const clustersContainer = getContainer(clustersName);

    const { resources: raRows } = await raContainer.items
      .query<RevAtRiskRow>({ query: 'SELECT c.opportunityId, c.riskScore, c.calculatedAt FROM c ORDER BY c.calculatedAt DESC', parameters: [] }, { partitionKey: tenantId })
      .fetchAll();

    const oppToRisk = new Map<string, number>();
    for (const r of raRows ?? []) {
      if (!r.opportunityId || oppToRisk.has(r.opportunityId)) continue;
      oppToRisk.set(r.opportunityId, Number(r.riskScore ?? 0.5));
    }

    const now = new Date().toISOString();
    const labels = ['low', 'medium', 'high'] as const;
    const thresholds = [0.33, 0.66];
    const bandOpps: string[][] = [[], [], []];
    for (const [oppId, score] of oppToRisk) {
      const i = score < thresholds[0] ? 0 : score < thresholds[1] ? 1 : 2;
      bandOpps[i].push(oppId);
    }

    const clusterIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const id = `${tenantId}_cluster_${i}`;
      clusterIds.push(id);
      await clustersContainer.items.upsert({
        id,
        tenantId,
        clusterId: `cluster_${i}`,
        label: labels[i],
        opportunityIds: bandOpps[i],
        computedAt: now,
      } as RiskClusterDoc);
    }
    const rulesWritten = 0;
    try {
      await publishRiskAnalyticsEvent('risk.cluster.updated', tenantId, { clusterIds, ruleCount: rulesWritten });
    } catch (e) {
      log.warn('computeAndPersistForTenant: risk.cluster.updated publish failed', { tenantId, err: e instanceof Error ? e.message : String(e), service: 'risk-analytics' });
    }
    log.info('computeAndPersistForTenant completed', { tenantId, clustersWritten: 3, rulesWritten, service: 'risk-analytics' });
    return { clustersWritten: 3, rulesWritten };
  }
}

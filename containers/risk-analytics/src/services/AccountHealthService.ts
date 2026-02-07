/**
 * Account Health Service (Plan §917, §3.2).
 * calculateAccountHealth(accountId, tenantId): read from risk_account_health.
 * computeAndPersistForTenant(tenantId): batch compute from c_opportunity + risk_revenue_at_risk, upsert risk_account_health.
 * id = <tenantId>_<accountId>; partition tenantId.
 */

import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';

export interface AccountHealthDoc {
  id: string;
  tenantId: string;
  accountId: string;
  healthScore: number;
  riskBreakdown?: Record<string, number>;
  trendDirection?: 'improving' | 'stable' | 'degrading';
  criticalOpportunities?: string[];
  lastUpdated: string;
  [k: string]: unknown;
}

/** c_opportunity shard row from shard-manager list. */
interface OppShardRow {
  id: string;
  tenantId: string;
  structuredData?: { AccountId?: string };
}

/** risk_revenue_at_risk row (latest per opp used via calculatedAt desc). */
interface RevAtRiskRow {
  opportunityId: string;
  riskScore?: number;
  revenueAtRisk?: number;
  calculatedAt?: string;
}

export class AccountHealthService {
  private config: ReturnType<typeof loadConfig>;

  constructor(_app?: FastifyInstance) {
    this.config = loadConfig();
  }

  /**
   * Get account health for accountId (Plan §4.1, §917). Reads from risk_account_health.
   * Returns null when not found (batch job has not yet run for this account).
   */
  async calculateAccountHealth(accountId: string, tenantId: string): Promise<AccountHealthDoc | null> {
    const name = this.config.cosmos_db?.containers?.account_health ?? 'risk_account_health';
    const id = `${tenantId}_${accountId}`;
    try {
      const container = getContainer(name);
      const { resource } = await container.item(id, tenantId).read<AccountHealthDoc>();
      return resource ?? null;
    } catch (e) {
      if ((e as { code?: number })?.code === 404) return null;
      log.warn('calculateAccountHealth: read failed', {
        container: name,
        accountId,
        tenantId,
        err: e instanceof Error ? e.message : String(e),
        service: 'risk-analytics',
      });
      return null;
    }
  }

  /**
   * Compute account health for all accounts with opportunities in the tenant and persist to risk_account_health.
   * Used by account-health batch job (Plan §9.3, §917). Needs services.shard_manager.url.
   * @returns { computed: number } count of accounts written
   */
  async computeAndPersistForTenant(tenantId: string): Promise<{ computed: number }> {
    const shardUrl = this.config.services?.shard_manager?.url;
    if (!shardUrl) {
      throw new Error('services.shard_manager.url is required for account-health computeAndPersistForTenant');
    }
    const containerName = this.config.cosmos_db?.containers?.account_health ?? 'risk_account_health';
    const raContainer = getContainer('risk_revenue_at_risk');
    const ahContainer = getContainer(containerName);

    // 1) accountId → opportunityIds from c_opportunity
    const oppUrl = `${shardUrl.replace(/\/$/, '')}/api/v1/shards?shardTypeName=c_opportunity&limit=5000`;
    let oppItems: OppShardRow[] = [];
    try {
      const res = await fetch(oppUrl, { headers: { 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' } });
      if (res.ok) {
        const data = (await res.json()) as { items?: OppShardRow[] };
        oppItems = data.items ?? [];
      }
    } catch (e) {
      log.warn('computeAndPersistForTenant: shard-manager c_opportunity failed', { tenantId, err: e instanceof Error ? e.message : String(e), service: 'risk-analytics' });
    }
    const accountToOpps = new Map<string, string[]>();
    for (const s of oppItems) {
      const accId = s.structuredData?.AccountId;
      if (!accId) continue;
      const list = accountToOpps.get(accId) ?? [];
      list.push(s.id);
      accountToOpps.set(accId, list);
    }

    // 2) opportunityId → latest risk from risk_revenue_at_risk (by calculatedAt desc)
    const { resources: raRows } = await raContainer.items
      .query<RevAtRiskRow>({ query: 'SELECT c.opportunityId, c.riskScore, c.revenueAtRisk, c.calculatedAt FROM c ORDER BY c.calculatedAt DESC', parameters: [] }, { partitionKey: tenantId })
      .fetchAll();
    const oppToRisk = new Map<string, { riskScore: number; revenueAtRisk: number }>();
    for (const r of raRows ?? []) {
      if (!r.opportunityId || oppToRisk.has(r.opportunityId)) continue;
      oppToRisk.set(r.opportunityId, { riskScore: Number(r.riskScore ?? 0.5), revenueAtRisk: Number(r.revenueAtRisk ?? 0) });
    }

    const now = new Date().toISOString();
    let computed = 0;
    for (const [accountId, oppIds] of accountToOpps) {
      const risks = oppIds.map(o => oppToRisk.get(o)).filter(Boolean) as { riskScore: number; revenueAtRisk: number }[];
      const avgRisk = risks.length > 0 ? risks.reduce((s, x) => s + x.riskScore, 0) / risks.length : 0.5;
      const healthScore = Math.max(0, Math.min(1, 1 - avgRisk));
      const criticalOpportunities = oppIds.filter(o => (oppToRisk.get(o)?.riskScore ?? 0) >= 0.7);
      const doc: AccountHealthDoc = {
        id: `${tenantId}_${accountId}`,
        tenantId,
        accountId,
        healthScore,
        riskBreakdown: risks.length ? { high: risks.filter(r => r.riskScore >= 0.7).length, medium: risks.filter(r => r.riskScore >= 0.4 && r.riskScore < 0.7).length, low: risks.filter(r => r.riskScore < 0.4).length } : undefined,
        trendDirection: 'stable',
        criticalOpportunities: criticalOpportunities.length ? criticalOpportunities : undefined,
        lastUpdated: now,
      };
      await ahContainer.items.upsert(doc);
      computed++;
    }
    if (computed > 0) {
      log.info('computeAndPersistForTenant completed', { tenantId, computed, service: 'risk-analytics' });
    }
    return { computed };
  }
}

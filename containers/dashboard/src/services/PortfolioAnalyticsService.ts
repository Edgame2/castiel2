/**
 * Portfolio and drill-down analytics (merged from dashboard-analytics container).
 * GET /api/v1/portfolios/:id/summary, /portfolios/:id/accounts;
 * GET /api/v1/accounts/:id/opportunities; GET /api/v1/opportunities/:id/activities.
 */

import { ServiceClient } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';

export interface PortfolioSummary {
  opportunityCount: number;
  accountsCount: number;
  totalPipeline: number;
}

export interface PortfolioAccount {
  id: string;
  name?: string;
}

export interface AccountOpportunity {
  id: string;
  name?: string;
  amount?: number;
  stageName?: string;
}

export interface OpportunityActivity {
  id: string;
  type: string;
  createdAt?: string;
  summary?: string;
}

export class PortfolioAnalyticsService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
    const url = this.config.services?.shard_manager?.url || '';
    this.shardManagerClient = new ServiceClient({
      baseURL: url,
      timeout: 30000,
      retries: 2,
      circuitBreaker: { enabled: true },
    });
  }

  private headers(tenantId: string, authHeader?: string): Record<string, string> {
    const h: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (authHeader) h['Authorization'] = authHeader;
    return h;
  }

  async getSummary(_portfolioId: string, tenantId: string, authHeader?: string): Promise<PortfolioSummary> {
    const base = (this.config.services?.shard_manager?.url || '').replace(/\/$/, '');
    if (!base) {
      return { opportunityCount: 0, accountsCount: 0, totalPipeline: 0 };
    }
    try {
      const [oppRes, accRes] = await Promise.all([
        this.shardManagerClient.get<{ items?: Array<{ structuredData?: { Amount?: number } }> }>(
          `/api/v1/shards?shardTypeName=c_opportunity&limit=2000`,
          { headers: this.headers(tenantId, authHeader) }
        ),
        this.shardManagerClient.get<{ items?: unknown[] }>(
          `/api/v1/shards?shardTypeName=c_account&limit=2000`,
          { headers: this.headers(tenantId, authHeader) }
        ),
      ]);
      const opps = oppRes?.items || [];
      const accs = accRes?.items || [];
      const totalPipeline = opps.reduce((s: number, o: { structuredData?: { Amount?: number } }) => s + (Number(o?.structuredData?.Amount) || 0), 0);
      return {
        opportunityCount: opps.length,
        accountsCount: accs.length,
        totalPipeline,
      };
    } catch (e) {
      log.error('getSummary failed', e instanceof Error ? e : new Error(String(e)), { tenantId, service: 'dashboard' });
      throw e;
    }
  }

  async getAccounts(_portfolioId: string, tenantId: string, authHeader?: string): Promise<PortfolioAccount[]> {
    const url = this.config.services?.shard_manager?.url || '';
    if (!url) return [];
    try {
      const res = await this.shardManagerClient.get<{ items?: Array<{ id?: string; structuredData?: { Name?: string } }> }>(
        `/api/v1/shards?shardTypeName=c_account&limit=500`,
        { headers: this.headers(tenantId, authHeader) }
      );
      const items = res?.items || [];
      return items.map((s) => ({ id: String(s?.id ?? ''), name: s?.structuredData?.Name }));
    } catch (e) {
      log.error('getAccounts failed', e instanceof Error ? e : new Error(String(e)), { tenantId, service: 'dashboard' });
      throw e;
    }
  }

  async getOpportunitiesForAccount(accountId: string, tenantId: string, authHeader?: string): Promise<AccountOpportunity[]> {
    const base = (this.config.services?.shard_manager?.url || '').replace(/\/$/, '');
    if (!base) return [];
    try {
      const res = await this.shardManagerClient.get<{
        items?: Array<{ id?: string; structuredData?: { AccountId?: string; Name?: string; Amount?: number; StageName?: string } }>;
      }>(`/api/v1/shards?shardTypeName=c_opportunity&limit=2000`, { headers: this.headers(tenantId, authHeader) });
      const items = res?.items || [];
      type Opp = { id?: string; structuredData?: { AccountId?: string; Name?: string; Amount?: number; StageName?: string } };
      const filtered = items.filter((o: Opp) => String(o?.structuredData?.AccountId ?? '') === accountId);
      return filtered.map((o: Opp) => ({
        id: String(o?.id ?? ''),
        name: o?.structuredData?.Name,
        amount: o?.structuredData?.Amount != null ? Number(o.structuredData.Amount) : undefined,
        stageName: o?.structuredData?.StageName,
      }));
    } catch (e) {
      log.error('getOpportunitiesForAccount failed', e instanceof Error ? e : new Error(String(e)), { accountId, tenantId, service: 'dashboard' });
      throw e;
    }
  }

  async getActivitiesForOpportunity(opportunityId: string, tenantId: string, authHeader?: string): Promise<OpportunityActivity[]> {
    const url = this.config.services?.shard_manager?.url || '';
    if (!url) return [];
    try {
      const res = await this.shardManagerClient.get<Array<{ shard?: { id?: string; shardTypeName?: string; createdAt?: string; structuredData?: { subject?: string; Subject?: string } } }>>(
        `/api/v1/shards/${encodeURIComponent(opportunityId)}/related?relationshipType=has_activity&limit=100`,
        { headers: this.headers(tenantId, authHeader) }
      );
      const arr = Array.isArray(res) ? res : [];
      return arr.map((r) => ({
        id: String(r?.shard?.id ?? ''),
        type: r?.shard?.shardTypeName ?? 'activity',
        createdAt: r?.shard?.createdAt,
        summary: r?.shard?.structuredData?.subject ?? r?.shard?.structuredData?.Subject,
      }));
    } catch (e) {
      log.error('getActivitiesForOpportunity failed', e instanceof Error ? e : new Error(String(e)), { opportunityId, tenantId, service: 'dashboard' });
      throw e;
    }
  }
}

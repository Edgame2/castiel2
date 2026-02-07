/**
 * Industry Benchmark Service (Plan §953, §3.1.5).
 * analytics_industry_benchmarks: getBenchmark, compareToBenchmark, calculateAndStore.
 * Partition: industryId; id = industryId_period.
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';

export interface IndustryBenchmarkDoc {
  id: string;
  industryId: string;
  period: string;
  periodType: 'month' | 'quarter' | 'year';
  sampleSize: number;
  metrics: { avgWinRate: number; avgDealSize: number; avgCycleTime: number; avgRiskScore: number };
  percentiles: { p10?: Record<string, number>; p25?: Record<string, number>; p50?: Record<string, number>; p75?: Record<string, number>; p90?: Record<string, number> };
  computedAt: string;
  expiresAt: string;
}

export interface BenchmarkComparisonResult {
  benchmark: IndustryBenchmarkDoc;
  opportunity: { industryId: string; amount: number; stage?: string };
  comparison: { amountPercentile?: number; vsAvgWinRate: number; vsAvgDealSize: number };
}

export class IndustryBenchmarkService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  private getServiceToken(tenantId: string): string {
    if (!this.app) return '';
    return generateServiceToken(this.app as any, { serviceId: 'risk-analytics', serviceName: 'risk-analytics', tenantId });
  }

  /**
   * Get benchmark for industry (Plan §953). period default: current month YYYY-MM.
   */
  async getBenchmark(industryId: string, period?: string): Promise<IndustryBenchmarkDoc | null> {
    const p = period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const id = `${industryId}_${p}`;
    try {
      const container = getContainer('analytics_industry_benchmarks');
      const { resource } = await container.item(id, industryId).read<IndustryBenchmarkDoc>();
      return resource ?? null;
    } catch (e) {
      if ((e as { code?: number })?.code === 404) return null;
      log.error('getBenchmark failed', e instanceof Error ? e : new Error(String(e)), { industryId, period });
      throw e;
    }
  }

  /**
   * Compare opportunity to industry benchmark (Plan §953).
   */
  async compareToBenchmark(opportunityId: string, tenantId: string): Promise<BenchmarkComparisonResult | null> {
    const token = this.getServiceToken(tenantId);
    let opp: { id?: string; structuredData?: Record<string, unknown> };
    try {
      opp = await this.shardManagerClient.get<{ id?: string; structuredData?: Record<string, unknown> }>(
        `/api/v1/shards/${opportunityId}`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
      );
    } catch {
      return null;
    }
    const d = opp?.structuredData || {};
    const industryId = String(d.IndustryId ?? d.industryId ?? '').trim() || 'general';
    const amount = Number(d.Amount ?? d.amount ?? d.value ?? 0);
    const stage = (d.StageName ?? d.stage) as string | undefined;

    const bench = await this.getBenchmark(industryId);
    if (!bench) return null;

    const p50Amount = bench.percentiles?.p50?.amount ?? bench.metrics.avgDealSize;
    const amountPercentile = p50Amount > 0 ? Math.min(100, Math.max(0, (amount / p50Amount) * 50)) : undefined;

    return {
      benchmark: bench,
      opportunity: { industryId, amount, stage },
      comparison: {
        amountPercentile,
        vsAvgWinRate: bench.metrics.avgWinRate,
        vsAvgDealSize: bench.metrics.avgDealSize,
      },
    };
  }

  /**
   * Calculate and store benchmarks (Plan §953). Used by industry-benchmarks batch job.
   * options.industryIds: default ['general']; options.period: default YYYY-MM.
   */
  async calculateAndStore(tenantId: string, options?: { industryIds?: string[]; period?: string }): Promise<void> {
    const industryIds = options?.industryIds?.length ? options.industryIds : ['general'];
    const period = options?.period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const periodType: 'month' | 'quarter' | 'year' = period.length === 7 ? 'month' : period.length === 6 ? 'quarter' : 'year';

    const token = this.getServiceToken(tenantId);
    let list: Array<{ id?: string; structuredData?: Record<string, unknown> }> = [];
    try {
      const res = await this.shardManagerClient.get<{ shards?: unknown[]; data?: unknown[] }>(
        `/api/v1/shards?shardType=opportunity&limit=2000`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
      );
      list = (res?.shards || res?.data || []) as Array<{ id?: string; structuredData?: Record<string, unknown> }>;
    } catch (e) {
      log.error('calculateAndStore: shard-manager list failed', e instanceof Error ? e : new Error(String(e)), { tenantId });
      throw e;
    }

    const amount = (s: Record<string, unknown>) => Number(s?.Amount ?? s?.amount ?? s?.value ?? 0) || 0;
    const industry = (s: Record<string, unknown>) => String(s?.IndustryId ?? s?.industryId ?? '').trim() || 'general';
    const closed = (s: Record<string, unknown>) => ['closed_won', 'closed_lost'].includes(String(s?.stage ?? s?.StageName ?? ''));
    const won = (s: Record<string, unknown>) => String(s?.stage ?? s?.StageName ?? '') === 'closed_won';
    const parseDate = (v: unknown): number | null => { if (v == null) return null; const t = new Date(String(v)).getTime(); return Number.isNaN(t) ? null : t; };
    const cycleDays = (o: { structuredData?: Record<string, unknown>; createdAt?: string }) => {
      const s = o.structuredData || {};
      const close = parseDate(s?.CloseDate ?? s?.closeDate);
      const created = parseDate(s?.CreatedDate ?? s?.createdDate ?? o.createdAt);
      if (close != null && created != null && close >= created) return Math.round((close - created) / (24 * 60 * 60 * 1000));
      return null;
    };

    for (const indId of industryIds) {
      const subset = indId === 'general' ? list : list.filter((o) => industry(o.structuredData || {}) === indId);
      const amounts = subset.map((o) => amount(o.structuredData || {})).filter((a) => a > 0);
      const closedList = subset.filter((o) => closed(o.structuredData || {}));
      const wonCount = closedList.filter((o) => won(o.structuredData || {})).length;
      const cycles = closedList.map((o) => cycleDays(o)).filter((n): n is number => n != null);

      amounts.sort((a, b) => a - b);
      cycles.sort((a, b) => a - b);
      const p = (arr: number[], q: number) => (arr.length > 0 ? arr[Math.min(Math.floor(arr.length * q), arr.length - 1)]! : 0);

      const metrics = {
        avgWinRate: closedList.length > 0 ? wonCount / closedList.length : 0,
        avgDealSize: amounts.length > 0 ? amounts.reduce((s, a) => s + a, 0) / amounts.length : 0,
        avgCycleTime: cycles.length > 0 ? cycles.reduce((s, c) => s + c, 0) / cycles.length : 0,
        avgRiskScore: 0,
      };

      const percentiles = {
        p10: { amount: p(amounts, 0.1), cycleDays: p(cycles, 0.1) },
        p25: { amount: p(amounts, 0.25), cycleDays: p(cycles, 0.25) },
        p50: { amount: p(amounts, 0.5), cycleDays: p(cycles, 0.5) },
        p75: { amount: p(amounts, 0.75), cycleDays: p(cycles, 0.75) },
        p90: { amount: p(amounts, 0.9), cycleDays: p(cycles, 0.9) },
      };

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const doc: IndustryBenchmarkDoc = {
        id: `${indId}_${period}`,
        industryId: indId,
        period,
        periodType,
        sampleSize: subset.length,
        metrics,
        percentiles,
        computedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      try {
        const container = getContainer('analytics_industry_benchmarks');
        await container.items.upsert(doc);
      } catch (e) {
        log.error('calculateAndStore: upsert failed', e instanceof Error ? e : new Error(String(e)), { industryId: indId, period });
        throw e;
      }
    }
    log.info('calculateAndStore completed', { tenantId, industryIds, period, service: 'risk-analytics' });
  }
}

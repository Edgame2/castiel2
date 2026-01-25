/**
 * Benchmarking Service
 * Calculates benchmarks for win rates, closing times, deal sizes
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface WinRateBenchmark {
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date | string;
    endDate: Date | string;
  };
  metrics: {
    winRate: number;
    opportunityCount: number;
    wonCount: number;
    lostCount: number;
  };
  calculatedAt: Date | string;
}

export interface ClosingTimeBenchmark {
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date | string;
    endDate: Date | string;
  };
  metrics: {
    averageDays: number;
    medianDays: number;
    opportunityCount: number;
  };
  calculatedAt: Date | string;
}

export interface DealSizeBenchmark {
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date | string;
    endDate: Date | string;
  };
  metrics: {
    average: number;
    median: number;
    opportunityCount: number;
  };
  calculatedAt: Date | string;
}

/** Peer deal comparison (Plan §11.12, §945): similar by industry, size; win rate, median cycle time. */
export interface SimilarWonDealsResult {
  count: number;
  winRate: number;
  medianCycleTimeDays: number | null;
  p25CloseAmount?: number | null;
}

export class BenchmarkingService {
  private readonly DEFAULT_BENCHMARK_PERIOD_DAYS = 365;
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
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'risk-analytics',
      serviceName: 'risk-analytics',
      tenantId,
    });
  }

  /**
   * Calculate win rates by stage, industry, or overall
   */
  async calculateWinRates(
    tenantId: string,
    options?: {
      industryId?: string;
      startDate?: Date;
      endDate?: Date;
      scope?: 'tenant' | 'industry' | 'peer';
    }
  ): Promise<WinRateBenchmark> {
    try {
      const endDate = options?.endDate || new Date();
      const startDate = options?.startDate || new Date(
        endDate.getTime() - this.DEFAULT_BENCHMARK_PERIOD_DAYS * 24 * 60 * 60 * 1000
      );

      const token = this.getServiceToken(tenantId);
      const opportunities = await this.shardManagerClient.get<any>(
        `/api/v1/shards?shardType=opportunity&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const closedOpportunities = (opportunities.shards || []).filter((opp: any) => {
        const data = opp.structuredData || {};
        return data.stage === 'closed_won' || data.stage === 'closed_lost';
      });

      const wonCount = closedOpportunities.filter((opp: any) => {
        const data = opp.structuredData || {};
        return data.stage === 'closed_won';
      }).length;

      const lostCount = closedOpportunities.length - wonCount;
      const winRate = closedOpportunities.length > 0 ? wonCount / closedOpportunities.length : 0;

      const benchmark: WinRateBenchmark = {
        scope: options?.scope || 'tenant',
        industryId: options?.industryId,
        period: { startDate, endDate },
        metrics: {
          winRate,
          opportunityCount: closedOpportunities.length,
          wonCount,
          lostCount,
        },
        calculatedAt: new Date(),
      };

      return benchmark;
    } catch (error: unknown) {
      log.error('Failed to calculate win rates', error instanceof Error ? error : new Error(String(error)), { tenantId });
      throw error;
    }
  }

  /**
   * Calculate closing time benchmarks
   */
  async calculateClosingTimes(
    tenantId: string,
    options?: {
      industryId?: string;
      startDate?: Date;
      endDate?: Date;
      scope?: 'tenant' | 'industry' | 'peer';
    }
  ): Promise<ClosingTimeBenchmark> {
    try {
      const endDate = options?.endDate || new Date();
      const startDate = options?.startDate || new Date(
        endDate.getTime() - this.DEFAULT_BENCHMARK_PERIOD_DAYS * 24 * 60 * 60 * 1000
      );

      const token = this.getServiceToken(tenantId);
      const opportunities = await this.shardManagerClient.get<any>(
        `/api/v1/shards?shardType=opportunity&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const closedOpportunities = (opportunities.shards || []).filter((opp: any) => {
        const data = opp.structuredData || {};
        return data.stage === 'closed_won' || data.stage === 'closed_lost';
      });

      const closingTimes = closedOpportunities
        .map((opp: any) => {
          const data = opp.structuredData || {};
          return data.closingTimeDays || 0;
        })
        .filter((time: number) => time > 0);

      const averageDays = closingTimes.length > 0
        ? closingTimes.reduce((sum: number, time: number) => sum + time, 0) / closingTimes.length
        : 0;

      const sortedTimes = [...closingTimes].sort((a, b) => a - b);
      const medianDays = sortedTimes.length > 0
        ? sortedTimes[Math.floor(sortedTimes.length / 2)]
        : 0;

      const benchmark: ClosingTimeBenchmark = {
        scope: options?.scope || 'tenant',
        industryId: options?.industryId,
        period: { startDate, endDate },
        metrics: {
          averageDays,
          medianDays,
          opportunityCount: closedOpportunities.length,
        },
        calculatedAt: new Date(),
      };

      return benchmark;
    } catch (error: unknown) {
      log.error('Failed to calculate closing times', error instanceof Error ? error : new Error(String(error)), { tenantId });
      throw error;
    }
  }

  /**
   * Calculate deal size benchmarks
   */
  async calculateDealSizes(
    tenantId: string,
    options?: {
      industryId?: string;
      startDate?: Date;
      endDate?: Date;
      scope?: 'tenant' | 'industry' | 'peer';
    }
  ): Promise<DealSizeBenchmark> {
    try {
      const endDate = options?.endDate || new Date();
      const startDate = options?.startDate || new Date(
        endDate.getTime() - this.DEFAULT_BENCHMARK_PERIOD_DAYS * 24 * 60 * 60 * 1000
      );

      const token = this.getServiceToken(tenantId);
      const opportunities = await this.shardManagerClient.get<any>(
        `/api/v1/shards?shardType=opportunity&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const dealSizes = (opportunities.shards || [])
        .map((opp: any) => {
          const data = opp.structuredData || {};
          return data.value || 0;
        })
        .filter((size: number) => size > 0);

      const average = dealSizes.length > 0
        ? dealSizes.reduce((sum: number, size: number) => sum + size, 0) / dealSizes.length
        : 0;

      const sortedSizes = [...dealSizes].sort((a, b) => a - b);
      const median = sortedSizes.length > 0
        ? sortedSizes[Math.floor(sortedSizes.length / 2)]
        : 0;

      const benchmark: DealSizeBenchmark = {
        scope: options?.scope || 'tenant',
        industryId: options?.industryId,
        period: { startDate, endDate },
        metrics: {
          average,
          median,
          opportunityCount: dealSizes.length,
        },
        calculatedAt: new Date(),
      };

      return benchmark;
    } catch (error: unknown) {
      log.error('Failed to calculate deal sizes', error instanceof Error ? error : new Error(String(error)), { tenantId });
      throw error;
    }
  }

  /**
   * Peer deal comparison (Plan §11.12, §945): similar by industry, size band; returns win rate,
   * median cycle time of similar won deals, optional p25 close amount. Similar = same industryId
   * (or both empty) and amount in [target*0.5, target*2]. Stage-based matching deferred when
   * StageDates/qualification is available.
   */
  async getSimilarWonDeals(tenantId: string, opportunityId: string): Promise<SimilarWonDealsResult> {
    try {
      const token = this.getServiceToken(tenantId);
      const target = await this.shardManagerClient.get<{ id?: string; structuredData?: Record<string, unknown>; createdAt?: string }>(
        `/api/v1/shards/${opportunityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      if (!target) {
        const err = new Error(`Opportunity not found: ${opportunityId}`);
        (err as { statusCode?: number }).statusCode = 404;
        throw err;
      }
      const d = target.structuredData || {};
      const targetIndustryId = String((d.IndustryId ?? d.industryId) ?? '').trim() || 'general';
      const targetAmount = Number(d.Amount ?? d.amount ?? d.value ?? 0) || 0;
      const sizeLo = targetAmount > 0 ? targetAmount * 0.5 : 0;
      const sizeHi = targetAmount > 0 ? targetAmount * 2 : Infinity;

      const list = await this.shardManagerClient.get<{ shards?: unknown[]; data?: unknown[] }>(
        `/api/v1/shards?shardType=opportunity&limit=2000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      const all = (list?.shards || list?.data || []) as Array<{ id?: string; structuredData?: Record<string, unknown>; createdAt?: string }>;

      const closedStages = ['closed_won', 'closed_lost'];
      const isClosed = (s: Record<string, unknown>) =>
        closedStages.includes(String(s?.stage ?? s?.StageName ?? '')) || s?.IsClosed === true;
      const isWon = (s: Record<string, unknown>) =>
        String(s?.stage ?? s?.StageName ?? '') === 'closed_won' || s?.IsWon === true;
      const amount = (s: Record<string, unknown>) => Number(s?.Amount ?? s?.amount ?? s?.value ?? 0) || 0;
      const industry = (s: Record<string, unknown>) => String(s?.IndustryId ?? s?.industryId ?? '').trim() || 'general';
      const inSizeBand = (a: number) => (targetAmount <= 0 ? true : a >= sizeLo && a <= sizeHi);

      const similarClosed = all.filter((o) => {
        if (o.id === opportunityId) return false;
        const s = o.structuredData || {};
        if (!isClosed(s)) return false;
        if (industry(s) !== targetIndustryId) return false;
        if (!inSizeBand(amount(s))) return false;
        return true;
      });

      const won = similarClosed.filter((o) => isWon(o.structuredData || {}));
      const count = similarClosed.length;
      const winRate = count > 0 ? won.length / count : 0;

      const parseDate = (v: unknown): number | null => {
        if (v == null) return null;
        const t = new Date(String(v)).getTime();
        return Number.isNaN(t) ? null : t;
      };
      const cycleDays: number[] = [];
      for (const o of won) {
        const s = o.structuredData || {};
        const close = parseDate(s?.CloseDate ?? s?.closeDate);
        const created = parseDate(s?.CreatedDate ?? s?.createdDate ?? o.createdAt);
        if (close != null && created != null && close >= created) {
          cycleDays.push(Math.round((close - created) / (24 * 60 * 60 * 1000)));
        }
      }
      cycleDays.sort((a, b) => a - b);
      const medianCycleTimeDays = cycleDays.length > 0 ? cycleDays[Math.floor(cycleDays.length / 2)]! : null;

      const amounts = won.map((o) => amount(o.structuredData || {})).filter((a) => a > 0);
      amounts.sort((a, b) => a - b);
      const p25CloseAmount = amounts.length > 0 ? amounts[Math.min(Math.ceil(amounts.length * 0.25) - 1, amounts.length - 1)]! : null;

      return {
        count,
        winRate,
        medianCycleTimeDays,
        p25CloseAmount: p25CloseAmount ?? undefined,
      };
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 404) throw error;
      log.error('Failed to get similar won deals', error instanceof Error ? error : new Error(String(error)), { tenantId, opportunityId });
      throw error;
    }
  }
}

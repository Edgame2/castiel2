/**
 * Quota Service
 * Manages quota definitions and performance tracking
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { RevenueAtRiskService } from './RevenueAtRiskService';
import { publishRiskAnalyticsEvent } from '../events/publishers/RiskAnalyticsEventPublisher';

export type QuotaType = 'individual' | 'team' | 'tenant';
export type QuotaPeriodType = 'monthly' | 'quarterly' | 'yearly';

export interface QuotaPeriod {
  type: QuotaPeriodType;
  startDate: Date | string;
  endDate: Date | string;
}

export interface QuotaTarget {
  amount: number;
  currency: string;
  opportunityCount?: number;
}

export interface QuotaPerformance {
  actual: number;
  forecasted: number;
  riskAdjusted: number;
  attainment: number;
  riskAdjustedAttainment: number;
}

export interface Quota {
  id: string;
  tenantId: string;
  quotaType: QuotaType;
  targetUserId?: string;
  teamId?: string;
  period: QuotaPeriod;
  target: QuotaTarget;
  performance: QuotaPerformance;
  parentQuotaId?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
}

export interface CreateQuotaInput {
  quotaType: QuotaType;
  targetUserId?: string;
  teamId?: string;
  period: QuotaPeriod;
  target: QuotaTarget;
  parentQuotaId?: string;
}

export interface UpdateQuotaInput {
  period?: QuotaPeriod;
  target?: Partial<QuotaTarget>;
  parentQuotaId?: string;
}

export class QuotaService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private revenueAtRiskService: RevenueAtRiskService;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance, revenueAtRiskService?: RevenueAtRiskService) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.revenueAtRiskService = revenueAtRiskService || new RevenueAtRiskService(app);
  }

  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app as any, {
      serviceId: 'risk-analytics',
      serviceName: 'risk-analytics',
      tenantId,
    });
  }

  /**
   * Create a new quota
   */
  async createQuota(
    tenantId: string,
    userId: string,
    input: CreateQuotaInput
  ): Promise<Quota> {
    try {
      this.validateQuotaInput(input);

      // Create quota shard via shard manager
      const token = this.getServiceToken(tenantId);
      const shard = await this.shardManagerClient.post<any>(
        '/api/v1/shard-types/quota/shards',
        {
          tenantId,
          userId,
          structuredData: {
            quotaType: input.quotaType,
            targetUserId: input.targetUserId,
            teamId: input.teamId,
            period: input.period,
            target: input.target,
            performance: {
              actual: 0,
              forecasted: 0,
              riskAdjusted: 0,
              attainment: 0,
              riskAdjustedAttainment: 0,
            },
            parentQuotaId: input.parentQuotaId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const quota: Quota = {
        id: shard.id,
        tenantId,
        quotaType: input.quotaType,
        targetUserId: input.targetUserId,
        teamId: input.teamId,
        period: input.period,
        target: input.target,
        performance: shard.structuredData.performance,
        parentQuotaId: input.parentQuotaId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      };

      // Store in database
      const container = getContainer('risk_quotas');
      await container.items.create(
        { ...quota, id: quota.id, tenantId },
        { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]
      );

      // Calculate initial performance
      await this.calculatePerformance(quota.id, tenantId, userId);

      await publishRiskAnalyticsEvent('quota.created', tenantId, {
        userId,
        quotaId: quota.id,
        quotaType: input.quotaType,
      });

      return quota;
    } catch (error: unknown) {
      log.error('Failed to create quota', error instanceof Error ? error : new Error(String(error)), { tenantId, userId });
      throw error;
    }
  }

  /**
   * Get a quota by ID
   */
  async getQuota(quotaId: string, tenantId: string): Promise<Quota | null> {
    try {
      const container = getContainer('risk_quotas');
      const { resource } = await container.item(quotaId, tenantId).read();
      return resource || null;
    } catch (error: unknown) {
      log.error('Failed to get quota', error instanceof Error ? error : new Error(String(error)), { tenantId, quotaId });
      throw error;
    }
  }

  /**
   * List quotas with optional filters
   */
  async listQuotas(
    tenantId: string,
    filters?: {
      quotaType?: QuotaType;
      targetUserId?: string;
      teamId?: string;
      periodType?: QuotaPeriodType;
    }
  ): Promise<Quota[]> {
    try {
      const container = getContainer('risk_quotas');
      let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
      const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

      if (filters?.quotaType) {
        query += ' AND c.quotaType = @quotaType';
        parameters.push({ name: '@quotaType', value: filters.quotaType });
      }
      if (filters?.targetUserId) {
        query += ' AND c.targetUserId = @targetUserId';
        parameters.push({ name: '@targetUserId', value: filters.targetUserId });
      }
      if (filters?.teamId) {
        query += ' AND c.teamId = @teamId';
        parameters.push({ name: '@teamId', value: filters.teamId });
      }
      if (filters?.periodType) {
        query += ' AND c.period.type = @periodType';
        parameters.push({ name: '@periodType', value: filters.periodType });
      }

      const { resources } = await container.items.query({ query, parameters }).fetchNext();
      return resources || [];
    } catch (error: unknown) {
      log.error('Failed to list quotas', error instanceof Error ? error : new Error(String(error)), { tenantId });
      throw error;
    }
  }

  /**
   * Update a quota
   */
  async updateQuota(
    quotaId: string,
    tenantId: string,
    userId: string,
    updates: UpdateQuotaInput
  ): Promise<Quota> {
    try {
      const quota = await this.getQuota(quotaId, tenantId);
      if (!quota) {
        throw new Error(`Quota not found: ${quotaId}`);
      }

      const updatedQuota: Quota = {
        ...quota,
        ...(updates.period && { period: updates.period }),
        ...(updates.target && { target: { ...quota.target, ...updates.target } }),
        ...(updates.parentQuotaId !== undefined && { parentQuotaId: updates.parentQuotaId }),
        updatedAt: new Date(),
      };

      const container = getContainer('risk_quotas');
      await container.item(quotaId, tenantId).replace(updatedQuota);

      // Recalculate performance if period or target changed
      if (updates.period || updates.target) {
        await this.calculatePerformance(quotaId, tenantId, userId);
      }

      return updatedQuota;
    } catch (error: unknown) {
      log.error('Failed to update quota', error instanceof Error ? error : new Error(String(error)), { tenantId, userId, quotaId });
      throw error;
    }
  }

  /**
   * Delete a quota
   */
  async deleteQuota(quotaId: string, tenantId: string, userId: string): Promise<void> {
    try {
      const container = getContainer('risk_quotas');
      await container.item(quotaId, tenantId).delete();

      await publishRiskAnalyticsEvent('quota.deleted', tenantId, {
        userId,
        quotaId,
      });
    } catch (error: unknown) {
      log.error('Failed to delete quota', error instanceof Error ? error : new Error(String(error)), { tenantId, userId, quotaId });
      throw error;
    }
  }

  /**
   * Calculate performance for a quota
   */
  async calculatePerformance(
    quotaId: string,
    tenantId: string,
    userId: string
  ): Promise<QuotaPerformance> {
    try {
      const quota = await this.getQuota(quotaId, tenantId);
      if (!quota) {
        throw new Error(`Quota not found: ${quotaId}`);
      }

      let portfolio;
      if (quota.quotaType === 'individual' && quota.targetUserId) {
        portfolio = await this.revenueAtRiskService.calculateForPortfolio(
          quota.targetUserId,
          tenantId
        );
      } else if (quota.quotaType === 'team' && quota.teamId) {
        const teamRisk = await this.revenueAtRiskService.calculateForTeam(
          quota.teamId,
          tenantId
        );
        portfolio = {
          userId: '',
          totalDealValue: teamRisk.totalDealValue,
          totalRevenueAtRisk: teamRisk.totalRevenueAtRisk,
          riskAdjustedValue: teamRisk.riskAdjustedValue,
          opportunityCount: teamRisk.opportunityCount,
          highRiskCount: 0,
          mediumRiskCount: 0,
          lowRiskCount: 0,
          opportunities: [],
        };
      } else {
        throw new Error('Invalid quota type for performance calculation');
      }

      const actual = portfolio.totalDealValue;
      const forecasted = portfolio.totalDealValue; // TODO: Get from forecasting service
      const riskAdjusted = portfolio.riskAdjustedValue;
      const attainment = (actual / quota.target.amount) * 100;
      const riskAdjustedAttainment = (riskAdjusted / quota.target.amount) * 100;

      const performance: QuotaPerformance = {
        actual,
        forecasted,
        riskAdjusted,
        attainment,
        riskAdjustedAttainment,
      };

      // Update quota with performance
      await this.updateQuota(quotaId, tenantId, userId, {});
      const container = getContainer('risk_quotas');
      const quotaDoc = await this.getQuota(quotaId, tenantId);
      if (quotaDoc) {
        await container.item(quotaId, tenantId).replace({
          ...quotaDoc,
          performance,
        });
      }

      return performance;
    } catch (error: unknown) {
      log.error('Failed to calculate quota performance', error instanceof Error ? error : new Error(String(error)), { tenantId, userId, quotaId });
      throw error;
    }
  }

  private validateQuotaInput(input: CreateQuotaInput): void {
    if (!input.quotaType) {
      throw new Error('Quota type is required');
    }
    if (!input.period || !input.period.startDate || !input.period.endDate) {
      throw new Error('Valid period is required');
    }
    if (!input.target || !input.target.amount) {
      throw new Error('Target amount is required');
    }
    if (input.quotaType === 'individual' && !input.targetUserId) {
      throw new Error('Target user ID is required for individual quota');
    }
    if (input.quotaType === 'team' && !input.teamId) {
      throw new Error('Team ID is required for team quota');
    }
  }
}

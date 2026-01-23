// @ts-nocheck
/**
 * Quota Service
 * Manages quota definitions and performance tracking
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import {
  ShardRepository,
  ShardTypeRepository,
} from '@castiel/api-core';
import { RevenueAtRiskService } from './revenue-at-risk.service.js';
import type {
  Quota,
  CreateQuotaInput,
  UpdateQuotaInput,
  QuotaPerformance,
  QuotaPerformanceDetails,
  QuotaForecast,
} from '../types/quota.types.js';
import type { Shard } from '../types/shard.types.js';
import { CORE_SHARD_TYPE_NAMES } from '../types/core-shard-types.js';
import { v4 as uuidv4 } from 'uuid';

export class QuotaService {
  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private shardTypeRepository: ShardTypeRepository,
    private revenueAtRiskService: RevenueAtRiskService,
    private forecastCommitmentService?: ForecastCommitmentService
  ) {}

  /**
   * Create a new quota
   */
  async createQuota(
    tenantId: string,
    userId: string,
    input: CreateQuotaInput
  ): Promise<Quota> {
    const startTime = Date.now();

    try {
      // Validate input
      this.validateQuotaInput(input);

      // Get shard type
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.QUOTA,
        'system'
      );

      if (!shardType) {
        throw new Error('Quota shard type not found');
      }

      // Create quota shard
      const shard = await this.shardRepository.create({
        tenantId,
        userId,
        shardTypeId: shardType.id,
        structuredData: {
          quotaType: input.quotaType,
          targetUserId: input.targetUserId,
          teamId: input.teamId,
          period: {
            type: input.period.type,
            startDate: input.period.startDate,
            endDate: input.period.endDate,
          },
          target: {
            amount: input.target.amount,
            currency: input.target.currency,
            opportunityCount: input.target.opportunityCount,
          },
          performance: {
            actual: 0,
            forecasted: 0,
            riskAdjusted: 0,
            attainment: 0,
            riskAdjustedAttainment: 0,
          },
          parentQuotaId: input.parentQuotaId,
        },
      });

      const quota = this.shardToQuota(shard);

      // Calculate initial performance
      await this.calculatePerformance(quota.id, tenantId, userId);

      this.monitoring.trackEvent('quota.created', {
        tenantId,
        userId,
        quotaId: quota.id,
        quotaType: input.quotaType,
        durationMs: Date.now() - startTime,
      });

      return quota;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'quota.createQuota',
        tenantId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get a quota by ID
   */
  async getQuota(quotaId: string, tenantId: string): Promise<Quota | null> {
    try {
      const quotaShard = await this.shardRepository.findById(quotaId, tenantId);
      if (!quotaShard) {
        return null;
      }
      return this.shardToQuota(quotaShard);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'quota.getQuota',
        tenantId,
        quotaId,
      });
      throw error;
    }
  }

  /**
   * List quotas with optional filters
   */
  async listQuotas(
    tenantId: string,
    filters?: {
      quotaType?: 'individual' | 'team' | 'tenant';
      targetUserId?: string;
      teamId?: string;
      periodType?: 'monthly' | 'quarterly' | 'yearly';
    }
  ): Promise<Quota[]> {
    try {
      // Get shard type
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.QUOTA,
        'system'
      );

      if (!shardType) {
        return [];
      }

      // Query all quotas for tenant
      const quotasResult = await this.shardRepository.list({
        tenantId,
        shardTypeId: shardType.id,
        limit: 1000,
      });

      let quotas = quotasResult.shards.map(shard => this.shardToQuota(shard));

      // Apply filters
      if (filters) {
        if (filters.quotaType) {
          quotas = quotas.filter(q => q.quotaType === filters.quotaType);
        }
        if (filters.targetUserId) {
          quotas = quotas.filter(q => q.targetUserId === filters.targetUserId);
        }
        if (filters.teamId) {
          quotas = quotas.filter(q => q.teamId === filters.teamId);
        }
        if (filters.periodType) {
          quotas = quotas.filter(q => q.period.type === filters.periodType);
        }
      }

      this.monitoring.trackEvent('quota.listed', {
        tenantId,
        count: quotas.length,
        filters: filters || {},
      });

      return quotas;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'quota.listQuotas',
        tenantId,
      });
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
    const startTime = Date.now();

    try {
      // Get existing quota
      const quotaShard = await this.shardRepository.findById(quotaId, tenantId);
      if (!quotaShard) {
        throw new Error(`Quota not found: ${quotaId}`);
      }

      const currentData = quotaShard.structuredData as any;

      // Validate updates
      if (updates.period) {
        this.validatePeriod(updates.period);
      }

      // Merge updates
      const updatedData = {
        ...currentData,
        ...(updates.period && {
          period: {
            type: updates.period.type,
            startDate: updates.period.startDate,
            endDate: updates.period.endDate,
          },
        }),
        ...(updates.target && {
          target: {
            ...currentData.target,
            ...updates.target,
          },
        }),
        ...(updates.parentQuotaId !== undefined && {
          parentQuotaId: updates.parentQuotaId,
        }),
      };

      // Update shard
      const updatedShard = await this.shardRepository.update(quotaId, tenantId, {
        structuredData: updatedData,
      });

      const quota = this.shardToQuota(updatedShard);

      // Recalculate performance if period or target changed
      if (updates.period || updates.target) {
        await this.calculatePerformance(quotaId, tenantId, userId);
      }

      this.monitoring.trackEvent('quota.updated', {
        tenantId,
        userId,
        quotaId,
        durationMs: Date.now() - startTime,
      });

      return quota;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'quota.updateQuota',
        tenantId,
        userId,
        quotaId,
      });
      throw error;
    }
  }

  /**
   * Delete a quota
   */
  async deleteQuota(
    quotaId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Get existing quota to verify it exists
      const quotaShard = await this.shardRepository.findById(quotaId, tenantId);
      if (!quotaShard) {
        throw new Error(`Quota not found: ${quotaId}`);
      }

      // Delete the shard
      await this.shardRepository.delete(quotaId, tenantId);

      this.monitoring.trackEvent('quota.deleted', {
        tenantId,
        userId,
        quotaId,
        durationMs: Date.now() - startTime,
      });
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'quota.deleteQuota',
        tenantId,
        userId,
        quotaId,
      });
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
  ): Promise<QuotaPerformanceDetails> {
    const startTime = Date.now();

    try {
      // Get quota
      const quotaShard = await this.shardRepository.findById(quotaId, tenantId);
      if (!quotaShard) {
        throw new Error(`Quota not found: ${quotaId}`);
      }

      const quotaData = quotaShard.structuredData as any;
      const quota = this.shardToQuota(quotaShard);

      // Get opportunities for this quota
      const opportunities = await this.getQuotaOpportunities(quota, tenantId);

      // Calculate actual (closed won opportunities in period)
      const actual = this.calculateActual(opportunities, quota.period);

      // Calculate forecasted (all active opportunities)
      const forecasted = this.calculateForecasted(opportunities, quota.period);

      // Calculate risk-adjusted forecast
      let riskAdjusted = forecasted;
      try {
        if (quota.quotaType === 'individual' && quota.targetUserId) {
          const portfolio = await this.revenueAtRiskService.calculateForPortfolio(
            quota.targetUserId,
            tenantId
          );
          // Filter to period
          const periodOpportunities = portfolio.opportunities.filter(opp => {
            const oppShard = opportunities.find(o => o.id === opp.opportunityId);
            if (!oppShard) {return false;}
            const oppData = oppShard.structuredData as any;
            const closeDate = oppData.closeDate || oppData.expectedCloseDate;
            if (!closeDate) {return false;}
            const date = new Date(closeDate);
            return date >= quota.period.startDate && date <= quota.period.endDate;
          });
          const periodRisk = periodOpportunities.reduce((sum, opp) => sum + opp.revenueAtRisk, 0);
          riskAdjusted = forecasted - periodRisk;
        }
      } catch (error: any) {
        // If risk calculation fails, use forecasted as fallback
        this.monitoring.trackException(error, {
          operation: 'quota.calculatePerformance.risk',
          tenantId,
          quotaId,
        });
      }

      // Calculate attainment percentages
      const attainment = quota.target.amount > 0 
        ? (actual / quota.target.amount) * 100 
        : 0;
      const riskAdjustedAttainment = quota.target.amount > 0
        ? (riskAdjusted / quota.target.amount) * 100
        : 0;

      const performance: QuotaPerformance = {
        actual,
        forecasted,
        riskAdjusted,
        attainment,
        riskAdjustedAttainment,
      };

      // Update quota with performance
      await this.shardRepository.update(quotaId, tenantId, {
        structuredData: {
          ...quotaData,
          performance,
        },
      });

      // Build performance details
      const performanceDetails: QuotaPerformanceDetails = {
        quotaId,
        period: quota.period,
        target: quota.target,
        performance,
        opportunities: opportunities
          .filter(opp => {
            const data = opp.structuredData as any;
            return data?.stage !== 'closed_won' && data?.stage !== 'closed_lost';
          })
          .map(opp => {
            const data = opp.structuredData as any;
            const riskEval = data?.riskEvaluation;
            return {
              opportunityId: opp.id,
              name: data?.name || 'Unknown',
              value: data?.value || 0,
              revenueAtRisk: riskEval?.revenueAtRisk || 0,
              riskAdjustedValue: (data?.value || 0) - (riskEval?.revenueAtRisk || 0),
              stage: data?.stage || 'unknown',
              probability: data?.probability || 0,
            };
          }),
        trends: {
          daily: [], // TODO: Calculate daily trends
          weekly: [], // TODO: Calculate weekly trends
        },
        calculatedAt: new Date(),
      };

      this.monitoring.trackEvent('quota.performance-calculated', {
        tenantId,
        quotaId,
        actual,
        forecasted,
        riskAdjusted,
        attainment,
        durationMs: Date.now() - startTime,
      });

      return performanceDetails;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'quota.calculatePerformance',
        tenantId,
        quotaId,
      });
      throw error;
    }
  }

  /**
   * Rollup child quotas into parent quota
   */
  async rollupQuotas(
    parentQuotaId: string,
    tenantId: string,
    userId: string
  ): Promise<Quota> {
    const startTime = Date.now();

    try {
      // Get parent quota
      const parentQuotaShard = await this.shardRepository.findById(parentQuotaId, tenantId);
      if (!parentQuotaShard) {
        throw new Error(`Parent quota not found: ${parentQuotaId}`);
      }

      // Get shard type
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.QUOTA,
        'system'
      );

      if (!shardType) {
        throw new Error('Quota shard type not found');
      }

      // Find all child quotas
      const childQuotasResult = await this.shardRepository.list({
        tenantId,
        shardTypeId: shardType.id,
        limit: 1000,
      });

      const childQuotas = childQuotasResult.shards
        .filter(shard => {
          const data = shard.structuredData as any;
          return data?.parentQuotaId === parentQuotaId;
        })
        .map(shard => this.shardToQuota(shard));

      // Aggregate child performance
      const aggregatedPerformance: QuotaPerformance = {
        actual: childQuotas.reduce((sum, q) => sum + q.performance.actual, 0),
        forecasted: childQuotas.reduce((sum, q) => sum + q.performance.forecasted, 0),
        riskAdjusted: childQuotas.reduce((sum, q) => sum + q.performance.riskAdjusted, 0),
        attainment: 0, // Will be calculated below
        riskAdjustedAttainment: 0, // Will be calculated below
      };

      // Calculate attainment percentages
      const parentData = parentQuotaShard.structuredData as any;
      const targetAmount = parentData.target?.amount || 0;
      aggregatedPerformance.attainment = targetAmount > 0
        ? (aggregatedPerformance.actual / targetAmount) * 100
        : 0;
      aggregatedPerformance.riskAdjustedAttainment = targetAmount > 0
        ? (aggregatedPerformance.riskAdjusted / targetAmount) * 100
        : 0;

      // Update parent quota
      const updatedShard = await this.shardRepository.update(parentQuotaId, tenantId, {
        structuredData: {
          ...parentData,
          performance: aggregatedPerformance,
        },
      });

      const parentQuota = this.shardToQuota(updatedShard);

      this.monitoring.trackEvent('quota.rollup-completed', {
        tenantId,
        parentQuotaId,
        childCount: childQuotas.length,
        durationMs: Date.now() - startTime,
      });

      return parentQuota;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'quota.rollupQuotas',
        tenantId,
        parentQuotaId,
      });
      throw error;
    }
  }

  /**
   * Get forecast for a quota
   */
  async getForecast(
    quotaId: string,
    tenantId: string,
    userId: string
  ): Promise<QuotaForecast> {
    const startTime = Date.now();

    try {
      // Get quota
      const quotaShard = await this.shardRepository.findById(quotaId, tenantId);
      if (!quotaShard) {
        throw new Error(`Quota not found: ${quotaId}`);
      }

      const quota = this.shardToQuota(quotaShard);

      // Get current performance
      const currentPerformance = await this.calculatePerformance(quotaId, tenantId, userId);

      // Get opportunities for forecast
      const opportunities = await this.getQuotaOpportunities(quota, tenantId);
      const activeOpportunities = opportunities.filter(opp => {
        const data = opp.structuredData as any;
        return data?.stage !== 'closed_won' && data?.stage !== 'closed_lost';
      });

      // Calculate forecast scenarios
      // Best case: All opportunities close at full value
      const bestCase = activeOpportunities.reduce((sum, opp) => {
        const data = opp.structuredData as any;
        return sum + (data?.value || 0);
      }, currentPerformance.performance.actual);

      // Base case: Weighted by probability
      const baseCase = activeOpportunities.reduce((sum, opp) => {
        const data = opp.structuredData as any;
        const value = data?.value || 0;
        const probability = (data?.probability || 0) / 100;
        return sum + (value * probability);
      }, currentPerformance.performance.actual);

      // Worst case: Only actual closed won
      const worstCase = currentPerformance.performance.actual;

      // Calculate risk-adjusted forecasts
      let riskAdjustedBestCase = bestCase;
      let riskAdjustedBaseCase = baseCase;
      let riskAdjustedWorstCase = worstCase;

      try {
        if (quota.quotaType === 'individual' && quota.targetUserId) {
          const portfolio = await this.revenueAtRiskService.calculateForPortfolio(
            quota.targetUserId,
            tenantId
          );
          const totalRisk = portfolio.totalRevenueAtRisk;
          riskAdjustedBestCase = bestCase - (totalRisk * 0.5); // Assume 50% of risk materializes
          riskAdjustedBaseCase = baseCase - totalRisk;
          riskAdjustedWorstCase = worstCase - (totalRisk * 1.5); // Assume 150% of risk materializes
        }
      } catch (error: any) {
        // If risk calculation fails, use unadjusted forecasts
        this.monitoring.trackException(error, {
          operation: 'quota.getForecast.risk',
          tenantId,
          quotaId,
        });
      }

      // Calculate projected attainment
      const targetAmount = quota.target.amount;
      const projectedAttainment = {
        bestCase: targetAmount > 0 ? (bestCase / targetAmount) * 100 : 0,
        baseCase: targetAmount > 0 ? (baseCase / targetAmount) * 100 : 0,
        worstCase: targetAmount > 0 ? (worstCase / targetAmount) * 100 : 0,
      };

      const riskAdjustedProjectedAttainment = {
        bestCase: targetAmount > 0 ? (riskAdjustedBestCase / targetAmount) * 100 : 0,
        baseCase: targetAmount > 0 ? (riskAdjustedBaseCase / targetAmount) * 100 : 0,
        worstCase: targetAmount > 0 ? (riskAdjustedWorstCase / targetAmount) * 100 : 0,
      };

      const forecast: QuotaForecast = {
        quotaId,
        period: quota.period,
        target: quota.target,
        currentPerformance: currentPerformance.performance,
        forecast: {
          bestCase,
          baseCase,
          worstCase,
        },
        riskAdjustedForecast: {
          bestCase: riskAdjustedBestCase,
          baseCase: riskAdjustedBaseCase,
          worstCase: riskAdjustedWorstCase,
        },
        projectedAttainment,
        riskAdjustedProjectedAttainment,
        assumptions: [
          `Based on ${activeOpportunities.length} active opportunities`,
          `Current actual: ${currentPerformance.performance.actual.toLocaleString()} ${quota.target.currency}`,
          `Risk-adjusted forecasts account for identified revenue at risk`,
        ],
        calculatedAt: new Date(),
      };

      this.monitoring.trackEvent('quota.forecast-calculated', {
        tenantId,
        quotaId,
        baseCase,
        riskAdjustedBaseCase,
        durationMs: Date.now() - startTime,
      });

      return forecast;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'quota.getForecast',
        tenantId,
        quotaId,
      });
      throw error;
    }
  }

  /**
   * Get opportunities for a quota based on quota type and period
   */
  private async getQuotaOpportunities(
    quota: Quota,
    tenantId: string
  ): Promise<Shard[]> {
    // Get shard type for opportunities
    const shardType = await this.shardTypeRepository.findByName(
      CORE_SHARD_TYPE_NAMES.OPPORTUNITY,
      'system'
    );

    if (!shardType) {
      return [];
    }

    // Query opportunities
    const opportunitiesResult = await this.shardRepository.list({
      tenantId,
      shardTypeId: shardType.id,
      limit: 1000,
    });

    // Filter by quota criteria
    let filtered = opportunitiesResult.shards;

    // Filter by owner/team
    if (quota.quotaType === 'individual' && quota.targetUserId) {
      filtered = filtered.filter(shard => {
        const data = shard.structuredData as any;
        return data?.ownerId === quota.targetUserId;
      });
    } else if (quota.quotaType === 'team' && quota.teamId) {
      filtered = filtered.filter(shard => {
        const data = shard.structuredData as any;
        return data?.teamId === quota.teamId;
      });
    }
    // For tenant quotas, include all opportunities

    // Filter by period (based on close date or expected close date)
    filtered = filtered.filter(shard => {
      const data = shard.structuredData as any;
      const closeDate = data?.closeDate || data?.expectedCloseDate;
      if (!closeDate) {return true;} // Include if no date (assume in period)
      const date = new Date(closeDate);
      return date >= quota.period.startDate && date <= quota.period.endDate;
    });

    return filtered;
  }

  /**
   * Calculate actual revenue (closed won in period)
   */
  private calculateActual(opportunities: Shard[], period: Quota['period']): number {
    return opportunities.reduce((sum, opp) => {
      const data = opp.structuredData as any;
      if (data?.stage === 'closed_won') {
        const closeDate = data?.actualCloseDate || data?.closeDate;
        if (closeDate) {
          const date = new Date(closeDate);
          if (date >= period.startDate && date <= period.endDate) {
            return sum + (data?.value || 0);
          }
        }
      }
      return sum;
    }, 0);
  }

  /**
   * Calculate forecasted revenue (all active opportunities weighted by probability)
   */
  private calculateForecasted(opportunities: Shard[], period: Quota['period']): number {
    return opportunities.reduce((sum, opp) => {
      const data = opp.structuredData as any;
      if (data?.stage !== 'closed_won' && data?.stage !== 'closed_lost') {
        const closeDate = data?.expectedCloseDate || data?.closeDate;
        if (!closeDate) {
          // If no close date, assume it could close in period
          const value = data?.value || 0;
          const probability = (data?.probability || 0) / 100;
          return sum + (value * probability);
        } else {
          const date = new Date(closeDate);
          if (date >= period.startDate && date <= period.endDate) {
            const value = data?.value || 0;
            const probability = (data?.probability || 0) / 100;
            return sum + (value * probability);
          }
        }
      }
      return sum;
    }, 0);
  }

  /**
   * Validate quota input
   */
  private validateQuotaInput(input: CreateQuotaInput): void {
    if (input.quotaType === 'individual' && !input.targetUserId) {
      throw new Error('targetUserId is required for individual quotas');
    }
    if (input.quotaType === 'team' && !input.teamId) {
      throw new Error('teamId is required for team quotas');
    }
    this.validatePeriod(input.period);
    if (input.target.amount <= 0) {
      throw new Error('Target amount must be greater than 0');
    }
  }

  /**
   * Validate period
   */
  private validatePeriod(period: CreateQuotaInput['period']): void {
    if (period.startDate >= period.endDate) {
      throw new Error('Start date must be before end date');
    }
  }

  /**
   * Convert shard to Quota
   */
  private shardToQuota(shard: Shard): Quota {
    const data = shard.structuredData as any;
    return {
      id: shard.id,
      tenantId: shard.tenantId,
      quotaType: data.quotaType,
      targetUserId: data.targetUserId,
      teamId: data.teamId,
      period: {
        type: data.period.type,
        startDate: new Date(data.period.startDate),
        endDate: new Date(data.period.endDate),
      },
      target: {
        amount: data.target.amount,
        currency: data.target.currency,
        opportunityCount: data.target.opportunityCount,
      },
      performance: data.performance || {
        actual: 0,
        forecasted: 0,
        riskAdjusted: 0,
        attainment: 0,
        riskAdjustedAttainment: 0,
      },
      parentQuotaId: data.parentQuotaId,
      createdAt: shard.createdAt,
      updatedAt: shard.updatedAt,
      createdBy: shard.userId,
    };
  }
}


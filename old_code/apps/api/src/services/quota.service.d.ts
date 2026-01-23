/**
 * Quota Service
 * Manages quota definitions and performance tracking
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { RevenueAtRiskService } from './revenue-at-risk.service.js';
import type { Quota, CreateQuotaInput, UpdateQuotaInput, QuotaPerformanceDetails, QuotaForecast } from '../types/quota.types.js';
export declare class QuotaService {
    private monitoring;
    private shardRepository;
    private shardTypeRepository;
    private revenueAtRiskService;
    constructor(monitoring: IMonitoringProvider, shardRepository: ShardRepository, shardTypeRepository: ShardTypeRepository, revenueAtRiskService: RevenueAtRiskService);
    /**
     * Create a new quota
     */
    createQuota(tenantId: string, userId: string, input: CreateQuotaInput): Promise<Quota>;
    /**
     * Get a quota by ID
     */
    getQuota(quotaId: string, tenantId: string): Promise<Quota | null>;
    /**
     * List quotas with optional filters
     */
    listQuotas(tenantId: string, filters?: {
        quotaType?: 'individual' | 'team' | 'tenant';
        targetUserId?: string;
        teamId?: string;
        periodType?: 'monthly' | 'quarterly' | 'yearly';
    }): Promise<Quota[]>;
    /**
     * Update a quota
     */
    updateQuota(quotaId: string, tenantId: string, userId: string, updates: UpdateQuotaInput): Promise<Quota>;
    /**
     * Delete a quota
     */
    deleteQuota(quotaId: string, tenantId: string, userId: string): Promise<void>;
    /**
     * Calculate performance for a quota
     */
    calculatePerformance(quotaId: string, tenantId: string, userId: string): Promise<QuotaPerformanceDetails>;
    /**
     * Rollup child quotas into parent quota
     */
    rollupQuotas(parentQuotaId: string, tenantId: string, userId: string): Promise<Quota>;
    /**
     * Get forecast for a quota
     */
    getForecast(quotaId: string, tenantId: string, userId: string): Promise<QuotaForecast>;
    /**
     * Get opportunities for a quota based on quota type and period
     */
    private getQuotaOpportunities;
    /**
     * Calculate actual revenue (closed won in period)
     */
    private calculateActual;
    /**
     * Calculate forecasted revenue (all active opportunities weighted by probability)
     */
    private calculateForecasted;
    /**
     * Validate quota input
     */
    private validateQuotaInput;
    /**
     * Validate period
     */
    private validatePeriod;
    /**
     * Convert shard to Quota
     */
    private shardToQuota;
}
//# sourceMappingURL=quota.service.d.ts.map
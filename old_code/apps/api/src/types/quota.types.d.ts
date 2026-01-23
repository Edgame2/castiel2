/**
 * Quota Types
 * Type definitions for quota management and performance tracking
 */
export type QuotaType = 'individual' | 'team' | 'tenant';
export type QuotaPeriodType = 'monthly' | 'quarterly' | 'yearly';
export interface QuotaPeriod {
    type: QuotaPeriodType;
    startDate: Date;
    endDate: Date;
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
    createdAt: Date;
    updatedAt: Date;
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
    target?: QuotaTarget;
    parentQuotaId?: string;
}
export interface QuotaPerformanceDetails {
    quotaId: string;
    period: QuotaPeriod;
    target: QuotaTarget;
    performance: QuotaPerformance;
    opportunities: Array<{
        opportunityId: string;
        name: string;
        value: number;
        revenueAtRisk: number;
        riskAdjustedValue: number;
        stage: string;
        probability: number;
    }>;
    trends: {
        daily: Array<{
            date: Date;
            actual: number;
            forecasted: number;
        }>;
        weekly: Array<{
            week: string;
            actual: number;
            forecasted: number;
        }>;
    };
    calculatedAt: Date;
}
export interface QuotaForecast {
    quotaId: string;
    period: QuotaPeriod;
    target: QuotaTarget;
    currentPerformance: QuotaPerformance;
    forecast: {
        bestCase: number;
        baseCase: number;
        worstCase: number;
    };
    riskAdjustedForecast: {
        bestCase: number;
        baseCase: number;
        worstCase: number;
    };
    projectedAttainment: {
        bestCase: number;
        baseCase: number;
        worstCase: number;
    };
    riskAdjustedProjectedAttainment: {
        bestCase: number;
        baseCase: number;
        worstCase: number;
    };
    assumptions: string[];
    calculatedAt: Date;
}
export interface WinRateBenchmark {
    scope: 'tenant' | 'industry' | 'peer';
    industryId?: string;
    period: {
        startDate: Date;
        endDate: Date;
    };
    metrics: {
        winRate: number;
        opportunityCount: number;
        wonCount: number;
        lostCount: number;
    };
    calculatedAt: Date;
}
export interface ClosingTimeBenchmark {
    scope: 'tenant' | 'industry' | 'peer';
    industryId?: string;
    period: {
        startDate: Date;
        endDate: Date;
    };
    metrics: {
        avgClosingTime: number;
        medianClosingTime: number;
        p25ClosingTime: number;
        p75ClosingTime: number;
        opportunityCount: number;
    };
    calculatedAt: Date;
}
export interface DealSizeBenchmark {
    scope: 'tenant' | 'industry' | 'peer';
    industryId?: string;
    period: {
        startDate: Date;
        endDate: Date;
    };
    metrics: {
        dealSizeDistribution: {
            min: number;
            p25: number;
            median: number;
            p75: number;
            max: number;
        };
        avgDealSize: number;
        opportunityCount: number;
    };
    calculatedAt: Date;
}
export interface RenewalEstimate {
    contractId: string;
    renewalProbability: number;
    factors: Array<{
        factor: string;
        impact: 'positive' | 'negative' | 'neutral';
        weight: number;
    }>;
    recommendedActions: string[];
    estimatedRenewalValue?: number;
    calculatedAt: Date;
}
//# sourceMappingURL=quota.types.d.ts.map
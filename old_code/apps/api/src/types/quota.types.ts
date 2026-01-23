/**
 * Quota Types
 * Type definitions for quota management and performance tracking
 */

// ============================================
// Quota Types
// ============================================

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
  opportunityCount?: number; // Optional: target number of deals
}

export interface QuotaPerformance {
  actual: number;
  forecasted: number;
  riskAdjusted: number; // Forecast minus revenue at risk
  attainment: number; // Percentage
  riskAdjustedAttainment: number;
}

export interface Quota {
  id: string;
  tenantId: string;
  quotaType: QuotaType;
  targetUserId?: string; // For individual quotas
  teamId?: string; // For team quotas
  period: QuotaPeriod;
  target: QuotaTarget;
  performance: QuotaPerformance;
  parentQuotaId?: string; // For hierarchical rollup
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ============================================
// Quota Input Types
// ============================================

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

// ============================================
// Quota Performance Types
// ============================================

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
    daily: Array<{ date: Date; actual: number; forecasted: number }>;
    weekly: Array<{ week: string; actual: number; forecasted: number }>;
  };
  calculatedAt: Date;
}

// ============================================
// Quota Forecast Types
// ============================================

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
    bestCase: number; // Percentage
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

// ============================================
// Benchmark Types (for quota context)
// ============================================

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
    avgClosingTime: number; // Days
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



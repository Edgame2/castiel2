/**
 * Quota Types (Frontend)
 * Frontend type definitions for quota management and performance tracking
 * Dates are strings (ISO format) for JSON serialization
 */

// ============================================
// Quota Types
// ============================================

export type QuotaType = 'individual' | 'team' | 'tenant';

export type QuotaPeriodType = 'monthly' | 'quarterly' | 'yearly';

export interface QuotaPeriod {
  type: QuotaPeriodType;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
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
  attainment: number; // Percentage
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
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
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
    daily: Array<{ date: string; actual: number; forecasted: number }>; // date is ISO string
    weekly: Array<{ week: string; actual: number; forecasted: number }>;
  };
  calculatedAt: string; // ISO date string
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
  calculatedAt: string; // ISO date string
}

// ============================================
// Benchmark Types
// ============================================

export interface WinRateBenchmark {
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: string; // ISO date string
    endDate: string; // ISO date string
  };
  metrics: {
    winRate: number;
    opportunityCount: number;
    wonCount: number;
    lostCount: number;
  };
  calculatedAt: string; // ISO date string
}

export interface ClosingTimeBenchmark {
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: string; // ISO date string
    endDate: string; // ISO date string
  };
  metrics: {
    avgClosingTime: number; // Days
    medianClosingTime: number;
    p25ClosingTime: number;
    p75ClosingTime: number;
    opportunityCount: number;
  };
  calculatedAt: string; // ISO date string
}

export interface DealSizeBenchmark {
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: string; // ISO date string
    endDate: string; // ISO date string
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
  calculatedAt: string; // ISO date string
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
  calculatedAt: string; // ISO date string
}



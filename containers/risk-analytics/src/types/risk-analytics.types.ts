/**
 * Risk Analytics Types
 * Type definitions for risk evaluation and analytics
 */

import { DetectedRisk } from './risk-catalog.types';
export type { DetectedRisk };

export type DetectionMethod = 'rule' | 'ai' | 'historical' | 'semantic' | 'ml';

export interface LearnedWeights {
  ruleBased?: number;
  ml?: number;
  ai?: number;
  historical?: number;
  [key: string]: number | undefined;
}

export interface ModelSelection {
  modelId: string;
  confidence: number;
  version?: string;
}

export interface RiskEvaluationRequest {
  opportunityId: string;
  tenantId: string;
  userId?: string;
  workflowId?: string; // For workflow tracking
  trigger: 'scheduled' | 'opportunity_updated' | 'shard_created' | 'shard_updated' | 'manual' | 'risk_catalog_created' | 'risk_catalog_updated' | 'workflow';
  priority?: 'high' | 'normal' | 'low';
  options?: {
    includeHistorical?: boolean;
    includeAI?: boolean;
    includeSemanticDiscovery?: boolean;
  };
}

/** Data quality block for evaluation API and trust-level (Plan §11.6). */
export interface EvaluationDataQuality {
  score: number; // 0–1
  completenessPct: number; // 0–100
  missingCritical: string[]; // field or message for high-severity issues
  stalenessDays: number;
}

/** Assumptions for risk evaluation (data quality, staleness, missing data). Populated for display to users. */
export interface RiskEvaluationAssumptions {
  dataQuality?: {
    completeness: number;
    issues?: { type: string; field?: string; message: string; severity?: string }[];
  };
  staleness?: {
    lastUpdated: string;
    daysSinceUpdate: number;
    isStale: boolean;
  };
  missingDataWarnings?: string[];
}

export interface RiskEvaluationResult {
  evaluationId: string;
  opportunityId: string;
  riskScore: number;
  /** ML-derived risk score when ML weight > 0 (MISSING_FEATURES 4.2) */
  mlRiskScore?: number;
  /** Data quality for trust-level (Plan §11.6): score, completenessPct, missingCritical, stalenessDays */
  dataQuality?: EvaluationDataQuality;
  categoryScores: {
    Commercial: number;
    Technical: number;
    Legal: number;
    Financial: number;
    Competitive: number;
    Operational: number;
  };
  detectedRisks: DetectedRisk[];
  /** Plan §11.11, §944: at-risk taxonomy; derived from detectedRisks.riskName; map to mitigation playbooks. */
  atRiskReasons?: string[];
  revenueAtRisk: number;
  assumptions?: RiskEvaluationAssumptions;
  trustLevel?: 'high' | 'medium' | 'low' | 'unreliable';
  qualityScore?: number;
  calculatedAt: Date;
}

export interface RiskScoringRequest {
  opportunityId: string;
  tenantId: string;
  modelId?: string;
  features?: Record<string, any>;
}

export interface RiskScoringResult {
  scoringId: string;
  opportunityId: string;
  mlRiskScore: number;
  modelId: string;
  confidence: number;
  features?: Record<string, any>;
}

export interface RevenueAtRiskCalculation {
  opportunityId: string;
  revenueAtRisk: number;
  riskScore: number;
  opportunityValue: number;
  calculatedAt: Date;
}

export interface RevenueAtRisk {
  opportunityId: string;
  dealValue: number;
  currency: string;
  riskScore: number;
  revenueAtRisk: number;
  riskAdjustedValue: number;
  calculatedAt: Date;
}

export interface PortfolioRevenueAtRisk {
  userId: string;
  totalDealValue: number;
  totalRevenueAtRisk: number;
  riskAdjustedValue: number;
  opportunityCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  opportunities: RevenueAtRisk[];
}

export interface TeamRevenueAtRisk {
  teamId: string;
  totalDealValue: number;
  totalRevenueAtRisk: number;
  riskAdjustedValue: number;
  opportunityCount: number;
  memberCount: number;
  members: PortfolioRevenueAtRisk[];
}

export interface TenantRevenueAtRisk {
  tenantId: string;
  totalDealValue: number;
  totalRevenueAtRisk: number;
  riskAdjustedValue: number;
  opportunityCount: number;
  teamCount: number;
  teams: TeamRevenueAtRisk[];
}

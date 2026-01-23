/**
 * Risk Analysis Types (Frontend)
 * Frontend type definitions for risk-aware revenue intelligence system
 * Dates are strings (ISO format) for JSON serialization
 */

// ============================================
// Risk Catalog Types
// ============================================

export type RiskCategory = 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';

export type CatalogType = 'global' | 'industry' | 'tenant';

export type DetectionRuleType = 'attribute' | 'relationship' | 'historical' | 'ai';

export type DetectionMethod = 'rule' | 'ai' | 'historical' | 'semantic';

export interface DetectionRule {
  type: DetectionRuleType;
  conditions: any[];
  confidenceThreshold: number;
}

export interface RiskPonderation {
  scope: 'tenant' | 'industry' | 'opportunity_type';
  scopeId?: string;
  ponderation: number;
  effectiveFrom: string; // ISO date string
  effectiveTo?: string; // ISO date string
}

export interface RiskCatalog {
  id: string;
  tenantId: string;
  catalogType: CatalogType;
  industryId?: string;
  riskId: string;
  name: string;
  description: string;
  category: RiskCategory;
  defaultPonderation: number;
  sourceShardTypes: string[];
  detectionRules: DetectionRule;
  explainabilityTemplate: string;
  ponderations?: RiskPonderation[];
  isActive: boolean;
  version: number;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// ============================================
// Risk Evaluation Types
// ============================================

export type RiskLifecycleState = 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';

export type TrustLevel = 'high' | 'medium' | 'low' | 'unreliable';

// ============================================
// Assumption Tracking Types
// ============================================

export interface RiskEvaluationAssumptions {
  dataCompleteness: number; // 0-1 score
  dataStaleness: number; // days since last update
  missingRelatedShards: string[]; // Expected shard types not found
  aiModelAvailable: boolean;
  aiModelVersion?: string;
  contextTokenCount: number;
  contextTruncated: boolean;
  missingRequiredFields: string[]; // Required fields that are missing
  dataQualityScore: number; // 0-1 overall quality score
  serviceAvailability: {
    groundingService: boolean;
    vectorSearch: boolean;
    historicalPatterns: boolean;
  };
}

// ============================================
// Structured Explainability Types
// ============================================

export interface RiskExplainability {
  detectionMethod: DetectionMethod;
  confidence: number;
  evidence: {
    sourceShards: string[];
    matchedRules?: string[];
    aiReasoning?: string;
    historicalPatterns?: Array<{
      similarOpportunityId: string;
      similarityScore: number;
      outcome: 'won' | 'lost';
    }>;
    semanticMatches?: Array<{
      shardId: string;
      shardType: string;
      similarityScore: number;
    }>;
  };
  reasoning: {
    summary: string; // One-sentence summary
    standard: string; // Paragraph with key evidence
    detailed?: string; // Complete reasoning
    technical?: string; // Raw data and calculations
  };
  assumptions: string[];
  alternativeInterpretations?: string[];
  confidenceContributors: Array<{
    factor: string;
    contribution: number; // 0-1
  }>;
}

export interface DetectedRisk {
  riskId: string;
  riskName: string;
  category: RiskCategory;
  ponderation: number;
  confidence: number;
  contribution: number;
  explainability: RiskExplainability | string; // Structured explainability (backward compatible with string)
  sourceShards: string[];
  lifecycleState: RiskLifecycleState;
  ownerId?: string;
  acknowledgedAt?: string; // ISO date string
  acknowledgedBy?: string;
  dismissedAt?: string; // ISO date string
  dismissedBy?: string;
  dismissedReason?: string;
}

export interface RiskEvaluation {
  evaluationDate: string; // ISO date string
  riskScore: number;
  categoryScores: {
    Commercial: number;
    Technical: number;
    Legal: number;
    Financial: number;
    Competitive: number;
    Operational: number;
  }; // Risk scores per category (0-1)
  revenueAtRisk: number;
  risks: DetectedRisk[];
  calculatedAt: string; // ISO date string
  calculatedBy: string;
  assumptions?: RiskEvaluationAssumptions;
  trustLevel?: TrustLevel; // High/medium/low/unreliable
  qualityScore?: number; // 0-1 overall quality
}

// ============================================
// Score Breakdown Types (Phase 2.2: Risk Score Transparency)
// ============================================

export interface ScoreCalculationStep {
  step: string;
  description: string;
  inputValues: Record<string, number>;
  formula: string;
  result: number;
  category?: RiskCategory;
}

export interface CategoryScoreBreakdown {
  score: number;
  contribution: number;
  risks: Array<{
    riskId: string;
    contribution: number;
    confidence: number;
    ponderation: number;
  }>;
}

export interface ConfidenceAdjustment {
  factor: string;
  adjustment: number;
  reason: string;
  source: string;
}

export interface ScoreCalculation {
  steps: ScoreCalculationStep[];
  categoryScores: Record<RiskCategory, CategoryScoreBreakdown>;
  confidenceAdjustments: ConfidenceAdjustment[];
  finalScore: number;
  formula: string; // Documented formula
}

export interface ScoreBreakdownResponse {
  opportunityId: string;
  evaluationDate: string; // ISO date string
  traceId: string;
  scoreCalculation: ScoreCalculation;
}

// ============================================
// Early Warning Signal Types
// ============================================

export type SignalType = 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';

export type SignalSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SignalEvidence {
  type: string;
  label: string;
  value: any;
}

export interface EarlyWarningSignal {
  id: string;
  signalType: SignalType;
  severity: SignalSeverity;
  description: string;
  evidence: SignalEvidence[];
  detectedAt: string; // ISO date string
  acknowledgedAt?: string; // ISO date string
  acknowledgedBy?: string;
  resolvedAt?: string; // ISO date string
}

// ============================================
// Mitigation Action Types
// ============================================

export type MitigationActionType = 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';

export type ActionPriority = 'low' | 'medium' | 'high';

export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed';

export interface MitigationAction {
  id: string;
  riskId: string;
  actionType: MitigationActionType;
  title: string;
  description: string;
  priority: ActionPriority;
  expectedImpact: number;
  explainability: string;
  status: ActionStatus;
  assignedTo?: string;
  dueDate?: string; // ISO date string
  completedAt?: string; // ISO date string
  createdAt: string; // ISO date string
  createdBy: string;
}

// ============================================
// Historical Pattern Types
// ============================================

export interface HistoricalPattern {
  similarOpportunityId: string;
  similarityScore: number;
  outcome: 'won' | 'lost';
  riskFactors: string[];
  winRate: number;
  avgClosingTime: number; // Days
}

// ============================================
// Revenue at Risk Types
// ============================================

export interface RevenueAtRisk {
  opportunityId: string;
  dealValue: number;
  currency: string;
  riskScore: number;
  revenueAtRisk: number;
  riskAdjustedValue: number;
  calculatedAt: string; // ISO date string
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

// ============================================
// Risk Simulation Types
// ============================================

export interface SimulationModifications {
  risks?: Array<{
    action: 'add' | 'remove' | 'modify';
    riskId: string;
    ponderation?: number;
  }>;
  dealParameters?: {
    value?: number;
    probability?: number;
    closeDate?: string; // ISO date string
  };
  weights?: Record<string, number>;
}

export interface SimulationScenario {
  modifications: SimulationModifications;
  description?: string;
}

export interface SimulationResults {
  riskScore: number;
  revenueAtRisk: number;
  expectedCloseDate: string; // ISO date string
  forecastScenarios: {
    bestCase: number;
    baseCase: number;
    worstCase: number;
  };
}

export interface RiskSimulation {
  id: string;
  tenantId: string;
  opportunityId: string;
  scenarioName: string;
  modifications: SimulationModifications;
  results: SimulationResults;
  createdAt: string; // ISO date string
  createdBy: string;
}

export interface ComparisonResult {
  scenarios: Array<{
    scenarioName: string;
    results: SimulationResults;
  }>;
  recommendations: string[];
}



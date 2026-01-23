/**
 * Risk Analysis Types
 * Type definitions for risk-aware revenue intelligence system
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
  ponderation: number; // 0-1 weight
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface RiskCatalog {
  id: string;
  tenantId: string;
  catalogType: CatalogType;
  industryId?: string;
  riskId: string; // Unique risk identifier
  name: string;
  description: string;
  category: RiskCategory;
  defaultPonderation: number; // 0-1 weight
  sourceShardTypes: string[]; // Which shard types can trigger this risk
  detectionRules: DetectionRule;
  explainabilityTemplate: string;
  ponderations?: RiskPonderation[]; // Weight overrides (embedded)
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRiskInput {
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
}

export interface UpdateRiskInput {
  name?: string;
  description?: string;
  category?: RiskCategory;
  defaultPonderation?: number;
  sourceShardTypes?: string[];
  detectionRules?: DetectionRule;
  explainabilityTemplate?: string;
  isActive?: boolean;
}

// ============================================
// Risk Evaluation Types
// ============================================

export type RiskLifecycleState = 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';

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
  riskId: string; // Reference to c_risk_catalog shard
  riskName: string;
  category: RiskCategory;
  ponderation: number; // Applied weight (may be overridden)
  confidence: number; // 0-1 confidence score
  contribution: number; // Contribution to overall risk score
  explainability: RiskExplainability | string; // Structured explainability (backward compatible with string)
  sourceShards: string[]; // Shard IDs that triggered this risk
  lifecycleState: RiskLifecycleState;
  ownerId?: string; // User ID of risk owner
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  dismissedAt?: Date;
  dismissedBy?: string;
  dismissedReason?: string;
}

// ============================================
// Assumption Tracking & Trust Levels
// ============================================

export type TrustLevel = 'high' | 'medium' | 'low' | 'unreliable';

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

export interface RiskEvaluation {
  evaluationDate: Date;
  riskScore: number; // 0-1 aggregated global score
  categoryScores: {
    Commercial: number;
    Technical: number;
    Legal: number;
    Financial: number;
    Competitive: number;
    Operational: number;
  }; // Risk scores per category (0-1)
  revenueAtRisk: number; // Calculated revenue at risk
  risks: DetectedRisk[];
  calculatedAt: Date;
  calculatedBy: string; // System or user ID
  assumptions?: RiskEvaluationAssumptions;
  trustLevel?: TrustLevel; // High/medium/low/unreliable
  qualityScore?: number; // 0-1 overall quality
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
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
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
  expectedImpact: number; // 0-1 impact on risk reduction
  explainability: string;
  status: ActionStatus;
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

// ============================================
// Risk Snapshot Types
// ============================================

export interface RiskSnapshot {
  id: string;
  tenantId: string;
  opportunityId: string; // Reference to c_opportunity shard
  snapshotDate: Date;
  riskScore: number;
  revenueAtRisk: number;
  risks: Array<{
    riskId: string;
    riskName: string;
    category: RiskCategory;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: RiskLifecycleState;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
  createdAt: Date;
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
    closeDate?: Date;
  };
  weights?: Record<string, number>; // Risk weight overrides
}

export interface SimulationScenario {
  scenarioName: string;
  modifications: SimulationModifications;
}

export interface SimulationResults {
  riskScore: number;
  revenueAtRisk: number;
  expectedCloseDate: Date;
  forecastScenarios: {
    bestCase: number;
    baseCase: number;
    worstCase: number;
  };
}

export interface RiskSimulation {
  id: string;
  tenantId: string;
  opportunityId: string; // Reference to c_opportunity shard
  scenarioName: string;
  modifications: SimulationModifications;
  results: SimulationResults;
  createdAt: Date;
  createdBy: string;
}

export interface ComparisonResult {
  scenarios: Array<{
    scenarioName: string;
    results: SimulationResults;
  }>;
  recommendations: string[];
}



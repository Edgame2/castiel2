/**
 * Risk Catalog Types
 * Type definitions for risk catalog service
 */

export type RiskCategory = 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';

export type CatalogType = 'global' | 'industry' | 'tenant';

export type DetectionRuleType = 'attribute' | 'relationship' | 'historical' | 'ai';

export interface DetectionRule {
  type: DetectionRuleType;
  conditions: any[];
  confidenceThreshold: number;
}

export interface RiskPonderation {
  scope: 'tenant' | 'industry' | 'opportunity_type';
  scopeId?: string;
  ponderation: number; // 0-1 weight
  effectiveFrom: Date | string;
  effectiveTo?: Date | string;
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
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateRiskInput {
  catalogType?: CatalogType;
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

export interface SetPonderationInput {
  ponderations: RiskPonderation[];
}

// ============================================
// Risk Evaluation Types (used by risk-analytics)
// ============================================

export type RiskLifecycleState = 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';

export type DetectionMethod = 'rule' | 'ai' | 'historical' | 'semantic' | 'ml';

export interface RiskExplainability {
  detectionMethod: DetectionMethod;
  confidence: number;
  evidence: {
    sourceShards: string[];
    matchedRules?: string[];
    mentions?: string[];
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
  riskId: string; // Reference to risk_catalog shard
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
  assumptions?: any;
  trustLevel?: 'high' | 'medium' | 'low' | 'unreliable';
  qualityScore?: number; // 0-1 overall quality
}

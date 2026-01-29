/**
 * Layer 2 Feature Engineering types (COMPREHENSIVE_LAYER_REQUIREMENTS_SUMMARY, LAYER_2_FEATURE_ENGINEERING_REQUIREMENTS).
 * FeatureSnapshot: persisted extracted vectors. FeatureMetadata: version lineage and quality stats.
 */

/** Purpose for feature extraction (aligns with FeatureService.buildVectorForOpportunity). */
export type FeaturePurpose = 'risk-scoring' | 'win-probability' | 'lstm' | 'anomaly' | 'forecasting';

/**
 * Feature snapshot: one extracted feature vector per opportunity + purpose.
 * Partition key: tenantId.
 */
export interface FeatureSnapshot {
  id: string;
  tenantId: string;
  opportunityId: string;
  purpose: FeaturePurpose;
  /** Version tag used for this extraction (e.g. "v1", "2024-01"). */
  featureVersion: string;
  /** Numeric feature vector (all keys from pipeline). */
  features: Record<string, number>;
  extractedAt: string; // ISO
  createdAt?: string;
  // Cosmos optional
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Feature version status for FeatureVersionManager (pin/resolve/deprecate).
 */
export type FeatureVersionStatus = 'active' | 'pinned' | 'deprecated';

/**
 * Per-feature statistics for quality monitoring (missing rate, distribution).
 */
export interface FeatureStatistic {
  name: string;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  missingRate?: number;
  sampleCount?: number;
}

/**
 * Feature metadata: version lineage and quality statistics per tenant + purpose.
 * Partition key: tenantId. One doc per (tenantId, purpose, version) or "current" doc per tenant+purpose.
 */
export interface FeatureMetadata {
  id: string;
  tenantId: string;
  purpose: FeaturePurpose;
  /** Version tag (e.g. "v1"). Use "current" for latest active. */
  version: string;
  status: FeatureVersionStatus;
  /** Ordered feature names (schema). */
  featureNames: string[];
  /** Per-feature statistics (mean, std, min, max, missingRate). */
  statistics?: FeatureStatistic[];
  /** Optional drift score (0-1) vs reference. */
  driftScore?: number;
  createdAt: string;
  updatedAt: string;
  deprecatedAt?: string;
  // Cosmos optional
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Feature schema definition for GET /api/v1/ml/features/schema (Layer 2 API).
 */
export interface FeatureSchemaDefinition {
  name: string;
  type: 'number';
  description?: string;
  source?: string;
}

/**
 * Feature schema response (all feature definitions for a purpose or global).
 */
export interface FeatureSchema {
  purpose?: FeaturePurpose;
  version: string;
  features: FeatureSchemaDefinition[];
  updatedAt: string;
}

/**
 * W7 Gap 1 – Risk catalog definition per category (Layer 2 extractRiskCatalogFeatures).
 */
export interface RiskCatalogDefinition {
  name: string;
  description?: string;
  defaultPonderation?: number;
}

/**
 * W7 – Risk template view from risk-catalog (industry/stage).
 */
export interface RiskCatalogTemplateView {
  id: string;
  riskId: string;
  name: string;
  category: string;
  industryId?: string;
  applicableStages: string[];
}

/**
 * W7 Gap 1 – Risk catalog features for Layer 2 (FR-1.7).
 * Returned by extractRiskCatalogFeatures(tenantId, industry, stage).
 */
export interface RiskCatalogFeatures {
  tenantRiskCategories: string[];
  categoryDefinitions: Record<string, RiskCatalogDefinition>;
  riskTemplates: RiskCatalogTemplateView[];
  industrySpecificRisks: string[];
  methodologyRisks: string[];
}

/**
 * W8 – MEDDIC/MEDDPICC-specific features (REQUIREMENTS_GAP_ANALYSIS FR-1.8).
 */
export interface MeddicFeatures {
  metricsIdentified: boolean;
  economicBuyerIdentified: boolean;
  decisionCriteriaKnown: boolean;
  decisionProcessKnown: boolean;
  paperProcessKnown?: boolean;
  identifiedPainConfirmed: boolean;
  championIdentified: boolean;
  competitionAssessed?: boolean;
  meddicScore: number;
}

/**
 * W8 – Methodology-aware features for Layer 2 (FR-1.8).
 * Returned by extractMethodologyFeatures(tenantId, opportunity).
 */
export interface MethodologyFeatures {
  stageRequirementsMet: number;
  stageRequirementsMissing: string[];
  stageExitCriteriaReady: boolean;
  daysInCurrentStage: number;
  expectedDaysInStage: number;
  stageDurationAnomaly: boolean;
  methodologyFieldsComplete: number;
  methodologyFieldsMissing: string[];
  expectedActivitiesCompleted: number;
  unexpectedActivitiesCount: number;
  meddic?: MeddicFeatures;
}

/**
 * W9 – Dormant opportunity features for Layer 2 (REQUIREMENTS_GAP_ANALYSIS FR-1.9).
 * Returned by extractDormantOpportunityFeatures(tenantId, opportunityId).
 */
export interface DormantOpportunityFeatures {
  daysSinceLastActivity: number;
  daysSinceLastStageChange: number;
  daysSinceOwnerContact: number;
  daysSinceCustomerResponse: number;
  activityVelocityChange: number;
  activityCountLast7Days: number;
  activityCountLast30Days: number;
  activityCountLast90Days: number;
  customerEngagementScore: number;
  ownerEngagementScore: number;
  stakeholderEngagementScore: number;
  previouslyReactivated: boolean;
  reactivationSuccessRate: number;
  timeToClose: number;
  timeElapsed: number;
  recentAccountActivity: boolean;
  economicIndicators: Array<{ indicator: string; change: string }>;
  competitorActivity: boolean;
  dormancyCategory: 'recently_dormant' | 'long_dormant' | 'likely_lost';
  dormancyReason?: string;
}

/**
 * W9 – Reactivation prediction (Layer 3, REQUIREMENTS_GAP_ANALYSIS FR-3.11).
 */
export interface OptimalReactivationWindow {
  start: string;
  end: string;
  reason: string;
}

export interface RecommendedReactivationApproach {
  channel: 'email' | 'phone' | 'meeting' | 'multi-touch';
  tone: 'consultative' | 'urgent' | 'informational' | 'promotional';
  emphasis: string[];
}

export interface KeySuccessFactor {
  factor: string;
  importance: number;
  currentStatus: 'met' | 'partially_met' | 'not_met';
}

export interface ReactivationRisk {
  risk: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ReactivationPrediction {
  reactivationProbability: number;
  confidence: 'low' | 'medium' | 'high';
  optimalReactivationWindow: OptimalReactivationWindow;
  recommendedApproach: RecommendedReactivationApproach;
  keySuccessFactors: KeySuccessFactor[];
  reactivationRisks: ReactivationRisk[];
}

/**
 * Tenant ML config view (W10) – consumed from risk-analytics GET /api/v1/tenant-ml-config.
 * Used for model selection (preferIndustryModels) and prediction confidence (minConfidenceThreshold).
 */
export interface TenantMLConfigView {
  modelPreferences?: {
    preferIndustryModels?: boolean;
    minConfidenceThreshold?: number;
  };
}

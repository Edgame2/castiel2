/**
 * Action Catalog Types
 * Unified catalog for risks and recommendations per RECOMMENDATION_FEEDBACK_COMPLETE_REQUIREMENTS
 */

export type ActionCatalogEntryType = 'risk' | 'recommendation';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskImpactType = 'commercial' | 'technical' | 'legal' | 'competitive' | 'timeline' | 'resource';

export type RecommendationTypeCatalog = 'next_action' | 'risk_mitigation' | 'reactivation' | 'content' | 'methodology';

export interface ActionTemplate {
  title: string;
  description: string;
  actionItemsTemplate: string[];
  reasoningTemplate: string;
  expectedOutcomeTemplate: string;
}

/** Impact assessment per §2.1.2 Create Risk Entry (SUPER_ADMIN_CONFIGURATION_REQUIREMENTS) */
export interface RiskImpactAssessment {
  probabilityDecrease?: number;
  revenueAtRisk?: number;
  timelineDelay?: number;
  description?: string;
}

/** §2.1.2 Step 4 Decision Rules: notification options for risk detection */
export interface RiskNotificationRules {
  notifyOwner?: boolean;
  notifyManager?: boolean;
  escalateIfCritical?: boolean;
  escalationDelayHours?: number;
}

export interface RiskDetails {
  severity: RiskSeverity;
  impactType: RiskImpactType;
  indicators: string[];
  mitigatingRecommendations: string[];
  /** Impact assessment (§2.1.2) */
  impact?: RiskImpactAssessment;
  /** ML feature names for detection (§2.1.2) */
  mlFeatures?: string[];
  /** Feature value threshold for detection (§2.1.2) */
  mlThreshold?: number;
  /** §2.1.2 Step 4: auto-detect this risk */
  autoDetect?: boolean;
  /** §2.1.2 Step 4: notification rules when risk is detected */
  notificationRules?: RiskNotificationRules;
}

/** Action type per §2.1.3 Create Recommendation Entry (SUPER_ADMIN_CONFIGURATION_REQUIREMENTS) */
export type RecommendationActionType = 'meeting' | 'email' | 'task' | 'document' | 'question' | 'analysis';

/** Expected outcome per §2.1.3 */
export interface RecommendationExpectedOutcome {
  description: string;
  quantifiedImpact?: string;
  impactType?: 'probability' | 'revenue' | 'timeline' | 'risk_reduction' | 'efficiency';
  confidence?: 'low' | 'medium' | 'high';
  evidence?: string;
}

/** Implementation details per §2.1.3 */
export interface RecommendationImplementation {
  effort?: 'low' | 'medium' | 'high';
  complexity?: 'simple' | 'moderate' | 'complex';
  estimatedTime?: string;
  prerequisites?: string[];
  skillsRequired?: string[];
}

export interface RecommendationDetails {
  recommendationType: RecommendationTypeCatalog;
  actionTemplate: ActionTemplate;
  mitigatesRisks: string[];
  requiredData: string[];
  contentResources?: Array<{ type: string; title: string; url?: string }>;
  /** §2.1.3 */
  actionType?: RecommendationActionType;
  expectedOutcome?: RecommendationExpectedOutcome;
  implementation?: RecommendationImplementation;
}

export interface DecisionRules {
  autoGenerate: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  urgency: 'immediate' | 'this_week' | 'this_month' | 'flexible';
  suppressIfSimilarExists: boolean;
}

export interface CatalogUsage {
  timesGenerated: number;
  avgFeedbackSentiment: number;
  avgActionRate: number;
  avgImpact?: number;
}

export interface ActionCatalogEntry {
  id: string;
  partitionKey: string;
  tenantId?: string;
  type: ActionCatalogEntryType;
  category: string;
  subcategory?: string;
  name: string;
  displayName: string;
  description: string;
  applicableIndustries: string[];
  applicableStages: string[];
  applicableMethodologies: string[];
  /** §2.1.2/§2.1.3 Step 3: new_business, renewal, expansion */
  applicableOpportunityTypes?: string[];
  /** Only for opps with amount > minAmount (§2.1.2/§2.1.3) */
  minAmount?: number;
  /** Only for opps with amount < maxAmount (§2.1.2/§2.1.3) */
  maxAmount?: number;
  riskDetails?: RiskDetails;
  recommendationDetails?: RecommendationDetails;
  decisionRules?: DecisionRules;
  usage: CatalogUsage;
  status: 'active' | 'deprecated' | 'draft';
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/** Payload stored in shard structuredData (shard id/tenantId come from shard) */
export type ActionCatalogEntryStructuredData = Omit<
  ActionCatalogEntry,
  'id' | 'partitionKey' | 'tenantId'
> & { entryId: string };

export interface CreateActionCatalogEntryInput {
  type: ActionCatalogEntryType;
  category: string;
  subcategory?: string;
  name: string;
  displayName: string;
  description: string;
  applicableIndustries?: string[];
  applicableStages?: string[];
  applicableMethodologies?: string[];
  applicableOpportunityTypes?: string[];
  minAmount?: number;
  maxAmount?: number;
  riskDetails?: RiskDetails;
  recommendationDetails?: RecommendationDetails;
  decisionRules?: DecisionRules;
  status?: 'active' | 'deprecated' | 'draft';
}

export interface UpdateActionCatalogEntryInput {
  displayName?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  applicableIndustries?: string[];
  applicableStages?: string[];
  applicableMethodologies?: string[];
  applicableOpportunityTypes?: string[];
  minAmount?: number;
  maxAmount?: number;
  riskDetails?: RiskDetails;
  recommendationDetails?: RecommendationDetails;
  decisionRules?: DecisionRules;
  status?: 'active' | 'deprecated' | 'draft';
}

export interface GetApplicableCatalogEntriesInput {
  type: ActionCatalogEntryType;
  industry?: string;
  stage?: string;
  methodology?: string;
}

export interface OpportunityContext {
  opportunityId: string;
  stage: string;
  industry?: string;
  amount?: number;
  [key: string]: unknown;
}

/** Category for action catalog (§2.2). Stored as shard type action_catalog_category. */
export type ActionCatalogCategoryType = 'risk' | 'recommendation' | 'both';

export interface ActionCatalogCategory {
  id: string;
  displayName: string;
  type: ActionCatalogCategoryType;
  icon: string;
  color: string;
  description: string;
  order: number;
  entriesCount?: number;
  activeEntriesCount?: number;
  avgEffectiveness?: number;
}

export interface CreateActionCatalogCategoryInput {
  id?: string;
  displayName: string;
  type: ActionCatalogCategoryType;
  icon: string;
  color: string;
  description?: string;
  order?: number;
}

export interface UpdateActionCatalogCategoryInput {
  displayName?: string;
  type?: ActionCatalogCategoryType;
  icon?: string;
  color?: string;
  description?: string;
  order?: number;
}

/** Risk–recommendation link for §2.3 Relationship Management. */
export interface ActionCatalogRelationship {
  riskId: string;
  recommendationId: string;
}

export interface CreateActionCatalogRelationshipInput {
  riskId: string;
  recommendationId: string;
}

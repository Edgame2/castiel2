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

export interface RiskDetails {
  severity: RiskSeverity;
  impactType: RiskImpactType;
  indicators: string[];
  mitigatingRecommendations: string[];
}

export interface RecommendationDetails {
  recommendationType: RecommendationTypeCatalog;
  actionTemplate: ActionTemplate;
  mitigatesRisks: string[];
  requiredData: string[];
  contentResources?: Array<{ type: string; title: string; url?: string }>;
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

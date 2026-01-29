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

/**
 * W7 Gap 1 – Layer 2 integration. Minimal definition per category for extractRiskCatalogFeatures.
 */
export interface RiskDefinition {
  name: string;
  description?: string;
  defaultPonderation?: number;
}

/**
 * W7 – Risk template view (industry/stage filtering; RiskCatalog entries used as templates).
 */
export interface RiskTemplateView {
  id: string;
  riskId: string;
  name: string;
  category: RiskCategory;
  industryId?: string;
  applicableStages: string[]; // Empty if not in schema; extend later
}

/**
 * W7 – Tenant catalog view for Layer 2 (ml-service extractRiskCatalogFeatures).
 */
export interface TenantCatalogView {
  tenantRiskCategories: string[];
  categoryDefinitions: Record<string, RiskDefinition>;
  riskTemplates: RiskTemplateView[];
  industrySpecificRisks: string[];
  methodologyRisks: string[];
}

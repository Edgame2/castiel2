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

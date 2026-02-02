/**
 * Tenant ML Configuration types (Plan W10 – REQUIREMENTS_GAP_ANALYSIS Gap 4).
 * Consumed by Layer 3 (model selection, thresholds) and Layer 6 (auto-mark hot, approval).
 */

export type RiskToleranceLevel = 'conservative' | 'balanced' | 'aggressive';

export interface RiskTolerance {
  overallTolerance: RiskToleranceLevel;
  categoryTolerances: Record<string, number>;
  autoEscalationThreshold: number;
}

export interface DecisionPreferences {
  autoMarkHot: boolean;
  autoCreateTasks: boolean;
  requireApprovalForActions: boolean;
}

export interface ModelPreferences {
  preferIndustryModels: boolean;
  abTestingEnabled: boolean;
  minConfidenceThreshold: number;
}

export interface CustomFeature {
  featureName: string;
  dataSource: string;
  transformation: string;
  enabled: boolean;
}

export interface TenantMLConfiguration {
  tenantId: string;
  riskTolerance: RiskTolerance;
  decisionPreferences: DecisionPreferences;
  modelPreferences: ModelPreferences;
  customFeatures: CustomFeature[];
}

/** Cosmos document: id = tenantId, partitionKey = tenantId */
export interface TenantMLConfigurationDocument extends TenantMLConfiguration {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertTenantMLConfigBody extends Omit<TenantMLConfiguration, 'tenantId'> {
  tenantId?: string;
}

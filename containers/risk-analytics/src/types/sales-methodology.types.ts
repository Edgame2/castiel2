/**
 * Sales Methodology types (Plan W8 – REQUIREMENTS_GAP_ANALYSIS Gap 2)
 * Tenant-specific methodology: stages, requirements, exit criteria, MEDDIC mapping.
 */

export type MethodologyType = 'MEDDIC' | 'MEDDPICC' | 'Challenger' | 'Sandler' | 'SPIN' | 'Custom';

export interface StageRequirement {
  requirementId: string;
  name: string;
  description: string;
  mandatory: boolean;
  validationRule?: string;
}

export interface StageExitCriteria {
  criteriaId: string;
  description: string;
  mandatory: boolean;
}

export interface TypicalDurationDays {
  min: number;
  avg: number;
  max: number;
}

export interface MethodologyStage {
  stageId: string;
  stageName: string;
  displayName: string;
  order: number;
  requirements: StageRequirement[];
  exitCriteria: StageExitCriteria[];
  typicalDurationDays: TypicalDurationDays;
  expectedActivities: string[];
}

export interface RequiredField {
  fieldName: string;
  stages: string[];
  dataType: string;
}

export interface MethodologyRisk {
  riskId: string;
  stage: string;
  description: string;
  severity: string;
}

/** MEDDIC component mapping (§3.1.4): which opportunity fields map to this component. */
export interface MeddicComponentMapping {
  fields: string[];
  required: boolean;
  validationRule?: string;
}

/** MEDDIC mapper: Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion, Competition. */
export interface MeddicMapping {
  metrics?: MeddicComponentMapping;
  economicBuyer?: MeddicComponentMapping;
  decisionCriteria?: MeddicComponentMapping;
  decisionProcess?: MeddicComponentMapping;
  identifyPain?: MeddicComponentMapping;
  champion?: MeddicComponentMapping;
  competition?: MeddicComponentMapping;
}

export interface SalesMethodology {
  tenantId: string;
  methodologyType: MethodologyType;
  stages: MethodologyStage[];
  requiredFields: RequiredField[];
  risks: MethodologyRisk[];
  meddic?: MeddicMapping;
}

/** Cosmos document: id = tenantId, partitionKey = tenantId */
export interface SalesMethodologyDocument extends SalesMethodology {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSalesMethodologyBody extends SalesMethodology {
  tenantId?: string;
}

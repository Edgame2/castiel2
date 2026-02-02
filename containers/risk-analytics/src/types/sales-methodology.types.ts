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

/** §3.1.2 Tab 5: Integration – how methodology is used in CAIS. */
export interface MethodologyIntegrationConfig {
  featureEngineering?: { enabled: boolean; features: string[] };
  riskDetection?: { enabled: boolean; detectNonCompliance: boolean };
  recommendations?: { enabled: boolean; suggestMissingSteps: boolean };
}

export interface SalesMethodology {
  tenantId: string;
  methodologyType: MethodologyType;
  /** §3.1.2 Basic info: optional display name for this tenant's methodology. */
  name?: string;
  /** §3.1.2 Basic info: optional display name for UI. */
  displayName?: string;
  /** §3.1.2 Basic info: optional description. */
  description?: string;
  /** §3.1.2 Basic info: whether this methodology is active for the tenant. */
  isActive?: boolean;
  /** §3.1.2 Basic info: whether this is the tenant's default methodology. */
  isDefault?: boolean;
  stages: MethodologyStage[];
  requiredFields: RequiredField[];
  risks: MethodologyRisk[];
  meddic?: MeddicMapping;
  /** §3.1.2 Tab 5: Integration (CAIS). */
  integrationConfig?: MethodologyIntegrationConfig;
}

/** Cosmos document: id = tenantId, partitionKey = tenantId */
export interface SalesMethodologyDocument extends SalesMethodology {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSalesMethodologyBody extends Omit<SalesMethodology, 'tenantId'> {
  tenantId?: string;
}

/** §3.1.1 View All Methodologies: card grid item (templates list). */
export interface MethodologyCard {
  id: string;
  name: string;
  type: 'standard' | 'custom';
  description: string;
  stages: number;
  requiredFields: number;
  exitCriteria: number;
  tenantsUsing: number;
  activeOpportunities: number | null;
  avgComplianceScore: number | null;
}

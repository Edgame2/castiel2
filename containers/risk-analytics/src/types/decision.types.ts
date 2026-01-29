/**
 * Decision Engine types (Plan W5 Layer 6 – COMPREHENSIVE_LAYER_REQUIREMENTS_SUMMARY)
 */

export type ActionType = 'crm_update' | 'notification' | 'task_creation' | 'email_draft' | 'calendar_event' | 'playbook_assignment';

export interface Action {
  type: ActionType;
  details: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high';
  idempotencyKey: string;
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface Rule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  actions: Action[];
  version: number;
  previousVersionId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** W7 Gap 1 – Link to risk catalog entry for catalog-driven decisions. */
  catalogRiskId?: string;
}

export interface RuleResult {
  ruleId: string;
  matched: boolean;
  actions: Action[];
}

export interface ActionResult {
  actionId: string;
  status: 'pending' | 'executed' | 'failed' | 'rolled_back';
  executedAt?: string;
  error?: string;
}

export type DecisionSource = 'rule' | 'ml' | 'llm' | 'combined' | 'methodology';

export interface Decision {
  id: string;
  tenantId: string;
  opportunityId: string;
  decisionType: string;
  priority: string;
  rationale: string;
  source: DecisionSource;
  ruleResults?: RuleResult[];
  actions: Action[];
  actionResults?: ActionResult[];
  status: 'pending' | 'executed' | 'failed' | 'rolled_back';
  executedAt?: string;
  createdAt: string;
}

/** Request body for POST /api/v1/decisions/evaluate */
export interface EvaluateDecisionRequest {
  opportunityId: string;
  riskScore?: number;
  evaluationId?: string;
  context?: Record<string, unknown>;
}

/** Request body for POST /api/v1/decisions/execute */
export interface ExecuteDecisionRequest {
  decisionId: string;
  opportunityId: string;
  actionIds?: string[];
}

/** W7 Gap 1 – Mapped risk (detected risk linked to catalog entry). */
export interface MappedRisk {
  detectedRisk: { riskId: string; riskName: string; category: string; confidence?: number };
  catalogRiskId: string;
  mappingConfidence: number;
}

/** W7 Gap 1 – Request for applyRiskCatalogRules. */
export interface ApplyCatalogRulesRequest {
  opportunityId: string;
  evaluationId?: string;
  riskScore?: number;
  detectedRisks?: Array<{ riskId: string; riskName: string; category: string; confidence?: number }>;
  industry?: string;
}

/** W8 – Methodology features from ml-service (Layer 2) for makeMethodologyDecisions (Layer 6). */
export interface MethodologyFeaturesInput {
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
  meddic?: {
    metricsIdentified: boolean;
    economicBuyerIdentified: boolean;
    decisionCriteriaKnown: boolean;
    decisionProcessKnown: boolean;
    paperProcessKnown?: boolean;
    identifiedPainConfirmed: boolean;
    championIdentified: boolean;
    competitionAssessed?: boolean;
    meddicScore: number;
  };
}

/** W8 – Request for makeMethodologyDecisions. */
export interface MakeMethodologyDecisionRequest {
  opportunityId: string;
}

/**
 * LLM types (merged from llm-service – Plan W5 Layer 5)
 */

export type LLMOutputType = 'explanation' | 'recommendations' | 'scenarios' | 'summary' | 'playbook' | 'reactivation_strategy';

export interface Recommendation {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  rationale: string;
  estimatedImpact?: string;
  dueDate?: string;
  completedAt?: string;
}

export interface Scenario {
  type: 'best' | 'base' | 'worst';
  probability: number;
  revenue?: number;
  description: string;
  assumptions: string[];
}

export interface LLMInputContext {
  predictionId?: string;
  explanationId?: string;
  opportunityId: string;
  riskScore?: number;
  context?: Record<string, unknown>;
}

export interface LLMOutputData {
  text?: string;
  recommendations?: Recommendation[];
  scenarios?: Scenario[];
  highlights?: string[];
  reactivationStrategy?: ReactivationRecommendation;
}

export interface ReactivationImmediateAction {
  action: string;
  priority: number;
  expectedOutcome: string;
  effort: 'low' | 'medium' | 'high';
}

export interface ReactivationInitialContact {
  channel: string;
  subject: string;
  keyTalkingPoints: string[];
  callToAction: string;
  timing: string;
}

export interface ReactivationFollowUp {
  delay: number;
  channel: string;
  purpose: string;
  message: string;
}

export interface ReactivationValueProposition {
  primary: string;
  secondary: string[];
  newDevelopments: string[];
}

export interface ReactivationAnticipatedObjection {
  objection: string;
  response: string;
}

export interface ReactivationOutreachPlan {
  initialContact: ReactivationInitialContact;
  followUps: ReactivationFollowUp[];
  valueProposition: ReactivationValueProposition;
  anticipatedObjections: ReactivationAnticipatedObjection[];
}

export interface ReactivationResources {
  contentAssets: string[];
  stakeholders: string[];
  tools: string[];
}

export interface ReactivationSuccessCriteria {
  shortTerm: string[];
  mediumTerm: string[];
  longTerm: string[];
}

export interface ReactivationAlternativeStrategy {
  scenario: string;
  alternativeAction: string;
  contingencyPlan: string;
}

export interface ReactivationRecommendation {
  priority: 'high' | 'medium' | 'low';
  priorityReason: string;
  immediateActions: ReactivationImmediateAction[];
  outreachPlan: ReactivationOutreachPlan;
  resources: ReactivationResources;
  successCriteria: ReactivationSuccessCriteria;
  alternativeStrategies: ReactivationAlternativeStrategy[];
}

export interface LLMOutput {
  id: string;
  tenantId: string;
  outputType: LLMOutputType;
  opportunityId: string;
  inputContext: LLMInputContext;
  output: LLMOutputData;
  llmProvider: string;
  model: string;
  promptTemplate: string;
  latency: number;
  tokenCount: number;
  generatedAt: string;
  createdAt: string;
}

export interface LLMReasoningRequest {
  opportunityId: string;
  predictionId?: string;
  explanationId?: string;
  context?: Record<string, unknown>;
}

export interface ReactivationStrategyRequest {
  opportunityId: string;
  dormantFeatures?: Record<string, unknown>;
  reactivationPrediction?: Record<string, unknown>;
}

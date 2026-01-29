/**
 * Recommendations Types
 * Type definitions for recommendation service
 */

export type RecommendationType = 'action' | 'insight' | 'opportunity' | 'risk_mitigation' | 'forecast_adjustment';
export type RecommendationSource = 'vector_search' | 'collaborative' | 'temporal' | 'content' | 'ml' | 'ai';
export type RecommendationStatus = 'active' | 'accepted' | 'ignored' | 'irrelevant' | 'expired';
export type FeedbackAction = 'accept' | 'ignore' | 'irrelevant';

export interface Recommendation {
  id: string;
  tenantId: string;
  opportunityId?: string;
  userId?: string;
  type: RecommendationType;
  source: RecommendationSource;
  title: string;
  description: string;
  explanation?: string;
  confidence: number;
  score: number;
  metadata?: Record<string, any>;
  status: RecommendationStatus;
  createdAt: Date | string;
  expiresAt?: Date | string;
}

export interface RecommendationRequest {
  opportunityId?: string;
  userId?: string;
  tenantId: string;
  workflowId?: string; // For workflow tracking
  limit?: number;
  types?: RecommendationType[];
  includeExpired?: boolean;
}

export interface RecommendationBatch {
  recommendations: Recommendation[];
  total: number;
  generatedAt: Date | string;
  metadata?: {
    vectorSearchCount?: number;
    collaborativeCount?: number;
    temporalCount?: number;
    contentCount?: number;
    mlCount?: number;
  };
}

export interface RecommendationFeedback {
  recommendationId: string;
  action: FeedbackAction;
  userId: string;
  tenantId: string;
  timestamp: Date | string;
  comment?: string;
  /** Feedback type ID (e.g. feedback_type_act_on_it); when set, takes precedence over action for display */
  feedbackTypeId?: string;
  /** Optional full metadata per FR-1.4 */
  metadata?: {
    recommendation?: { type?: string; source?: string; confidence?: number; text?: string };
    opportunity?: { id?: string; stage?: string; amount?: number; probability?: number; industry?: string; daysToClose?: number };
    user?: { role?: string; teamId?: string; historicalActionRate?: number };
    timing?: { recommendationGeneratedAt?: string; recommendationShownAt?: string; timeToFeedbackMs?: number; timeVisibleMs?: number };
    display?: { location?: string; position?: number; deviceType?: string };
    secondaryTypes?: string[];
  };
}

export interface LearnedWeights {
  vectorSearch?: number;
  collaborative?: number;
  temporal?: number;
  content?: number;
  ml?: number;
  [key: string]: number | undefined;
}

export interface ModelSelection {
  modelId: string;
  confidence: number;
  version?: string;
}

/** Plan §3.1.4, §927–929: remediation workflow step */
export type RemediationStepStatus = 'pending' | 'current' | 'completed';

export interface RemediationWorkflowStep {
  stepNumber: number;
  actionId: string;
  description: string;
  status: RemediationStepStatus;
  estimatedEffort?: string;
  completedAt: string | null;
  completedBy: string | null;
}

export type RemediationWorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface RemediationWorkflow {
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId?: string;
  status: RemediationWorkflowStatus;
  assignedTo: string;
  steps: RemediationWorkflowStep[];
  completedSteps: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRemediationWorkflowInput {
  opportunityId: string;
  riskId?: string;
  assignedTo?: string;
  steps: { actionId: string; description: string; estimatedEffort?: string }[];
}

/** Plan §427–428, §927: ranked mitigation action for GET /opportunities/:id/mitigation-actions */
export interface RankedMitigationAction {
  id: string;
  actionId: string;
  title: string;
  description: string;
  rank: number;
  estimatedImpact?: 'high' | 'medium' | 'low';
  estimatedEffort?: 'low' | 'medium' | 'high';
}

export interface RankedMitigationResponse {
  opportunityId: string;
  tenantId: string;
  actions: RankedMitigationAction[];
}

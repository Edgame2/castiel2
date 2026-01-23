/**
 * Workflow Orchestrator Types
 * Type definitions for workflow orchestration
 */

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type WorkflowStepType = 'risk_analysis' | 'risk_scoring' | 'forecast' | 'recommendation';
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Workflow {
  workflowId: string;
  tenantId: string;
  opportunityId: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  results?: WorkflowResults;
  startedAt: Date | string;
  completedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WorkflowStep {
  stepId: string;
  workflowId: string;
  stepType: WorkflowStepType;
  status: WorkflowStepStatus;
  result?: any;
  error?: string;
  startedAt?: Date | string;
  completedAt?: Date | string;
}

export interface WorkflowResults {
  risk?: {
    evaluationId: string;
    riskScore: number;
    detectedRisks: any[];
  };
  scoring?: {
    scoringId: string;
    mlRiskScore: number;
    modelId: string;
    confidence: number;
  };
  forecast?: {
    forecastId: string;
    revenueForecast: number;
    confidence: number;
  };
  recommendations?: {
    recommendationId: string;
    recommendations: any[];
    count: number;
  };
}

export interface WorkflowExecution {
  executionId: string;
  workflowId: string;
  tenantId: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  results?: WorkflowResults;
  startedAt: Date | string;
  completedAt?: Date | string;
}

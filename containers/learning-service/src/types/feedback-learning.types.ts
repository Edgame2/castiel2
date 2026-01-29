/**
 * Types for learning-service (Plan W6 Layer 7 – Feedback Loop)
 * UserFeedback and Outcome stored in Cosmos (partitionKey tenantId)
 */

export interface UserFeedback {
  id: string;
  tenantId: string;
  modelId: string;
  predictionId?: string;
  opportunityId?: string;
  feedbackType: string;
  value?: number | string | boolean;
  comment?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  recordedAt: string;
  linkedAt?: string;
}

export interface Outcome {
  id: string;
  tenantId: string;
  modelId: string;
  predictionId?: string;
  opportunityId?: string;
  outcomeType: string;
  success: boolean;
  value?: number | string | Record<string, unknown>;
  recordedAt: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordFeedbackRequest {
  modelId: string;
  predictionId?: string;
  opportunityId?: string;
  feedbackType: string;
  value?: number | string | boolean;
  comment?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordOutcomeRequest {
  modelId: string;
  predictionId?: string;
  opportunityId?: string;
  outcomeType: string;
  success: boolean;
  value?: number | string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface FeedbackSummary {
  modelId: string;
  tenantId: string;
  period: { from: string; to: string };
  totalFeedback: number;
  byType: Record<string, number>;
  satisfactionScore?: number;
  linkedToPrediction: number;
}

export interface FeedbackTrends {
  modelId: string;
  tenantId: string;
  period: { from: string; to: string };
  series: { date: string; count: number; satisfaction?: number }[];
  alert?: boolean;
  message?: string;
}

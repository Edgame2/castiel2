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

/**
 * Prompt A/B Testing Types
 * Types for managing prompt A/B test experiments
 */

import { BaseDocument } from '../services/ai-insights/cosmos.service.js';
import { InsightType } from './ai-insights.types.js';

/**
 * Prompt A/B Test Experiment Status
 */
export enum PromptABTestStatus {
  Draft = 'draft',
  Active = 'active',
  Paused = 'paused',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

/**
 * Prompt Variant in an A/B Test
 */
export interface PromptVariant {
  variantId: string; // 'control' | 'treatment' | custom ID
  promptId: string; // ID of the prompt version
  promptSlug: string; // Slug of the prompt
  name: string; // Human-readable name
  trafficPercentage: number; // 0-100
  description?: string;
}

/**
 * Variant Metrics
 */
export interface VariantMetrics {
  impressions: number; // Number of times variant was used
  successfulResponses: number; // Successful insight generations
  failedResponses: number; // Failed generations
  averageTokens: number; // Average tokens used
  averageLatencyMs: number; // Average response latency
  userFeedbackScore: number; // 0-5 average rating
  positiveFeedback: number; // Count of positive feedback
  negativeFeedback: number; // Count of negative feedback
  totalCost: number; // Total cost in currency units
  lastUsedAt?: Date;
}

/**
 * Prompt A/B Test Experiment
 */
export interface PromptABTest extends BaseDocument {
  type: 'promptABTest';
  name: string;
  description?: string;
  hypothesis?: string;
  
  // Test configuration
  insightType: InsightType; // Which insight type this test applies to
  slug?: string; // Optional: specific prompt slug to test
  
  // Variants
  variants: PromptVariant[];
  
  // Traffic allocation (must sum to 100)
  trafficSplit: {
    [variantId: string]: number; // Percentage per variant
  };
  
  // Success criteria
  primaryMetric: 'quality' | 'latency' | 'satisfaction' | 'cost' | 'success_rate';
  successCriteria?: {
    metric: string;
    operator: '>' | '>=' | '<' | '<=';
    threshold: number; // Percentage improvement
    confidenceLevel: number; // 0.95 = 95% confidence
  };
  
  // Targeting
  targeting?: {
    tenantIds?: string[]; // Specific tenants
    userIds?: string[]; // Specific users
    tags?: string[]; // Specific prompt tags
  };
  
  // Status and timing
  status: PromptABTestStatus;
  startDate?: Date;
  endDate?: Date;
  minDuration?: number; // Minimum days to run
  minSamplesPerVariant?: number; // Minimum samples per variant
  
  // Results
  metrics: {
    [variantId: string]: VariantMetrics;
  };
  
  // Statistical analysis
  results?: {
    winner?: string; // variantId of winner
    statisticalSignificance?: number; // 0-1
    confidenceLevel?: number; // 0-1
    improvement?: number; // Percentage improvement
    completedAt?: Date;
  };
  
  // Metadata
  createdBy: {
    userId: string;
    at: Date;
  };
  updatedBy?: {
    userId: string;
    at: Date;
  };
}

/**
 * Create Prompt A/B Test Input
 */
export interface CreatePromptABTestInput {
  name: string;
  description?: string;
  hypothesis?: string;
  insightType: InsightType;
  slug?: string;
  variants: Array<{
    variantId: string;
    promptId: string;
    promptSlug: string;
    name: string;
    trafficPercentage: number;
    description?: string;
  }>;
  primaryMetric: 'quality' | 'latency' | 'satisfaction' | 'cost' | 'success_rate';
  successCriteria?: {
    metric: string;
    operator: '>' | '>=' | '<' | '<=';
    threshold: number;
    confidenceLevel: number;
  };
  targeting?: {
    tenantIds?: string[];
    userIds?: string[];
    tags?: string[];
  };
  minDuration?: number;
  minSamplesPerVariant?: number;
}

/**
 * Update Prompt A/B Test Input
 */
export interface UpdatePromptABTestInput {
  name?: string;
  description?: string;
  hypothesis?: string;
  status?: PromptABTestStatus;
  variants?: PromptVariant[];
  trafficSplit?: { [variantId: string]: number };
  successCriteria?: {
    metric: string;
    operator: '>' | '>=' | '<' | '<=';
    threshold: number;
    confidenceLevel: number;
  };
  targeting?: {
    tenantIds?: string[];
    userIds?: string[];
    tags?: string[];
  };
  endDate?: Date;
}

/**
 * Experiment Assignment (for deterministic variant selection)
 */
export interface ExperimentAssignment extends BaseDocument {
  type: 'experimentAssignment';
  experimentId: string;
  userId: string;
  variantId: string;
  assignedAt: Date;
  firstExposure?: Date;
  lastExposure?: Date;
  exposureCount: number;
}

/**
 * Experiment Event (for tracking metrics)
 */
export interface ExperimentEvent extends BaseDocument {
  type: 'experimentEvent';
  experimentId: string;
  assignmentId: string;
  userId: string;
  variantId: string;
  eventType: 'exposure' | 'success' | 'failure' | 'feedback';
  metrics: {
    tokensUsed?: number;
    latencyMs?: number;
    cost?: number;
    quality?: number;
    userFeedback?: number; // 0-5
    feedbackType?: 'positive' | 'negative' | 'neutral';
  };
  context?: {
    insightId?: string;
    conversationId?: string;
    intent?: string;
  };
  timestamp: Date;
}

/**
 * Prompt A/B Test Result
 */
export interface PromptABTestResult {
  experimentId: string;
  name: string;
  status: PromptABTestStatus;
  variants: Array<{
    variantId: string;
    name: string;
    metrics: VariantMetrics;
  }>;
  comparison?: {
    winner?: string;
    improvement?: number;
    statisticalSignificance?: number;
    confidenceLevel?: number;
  };
  charts?: {
    qualityOverTime?: Array<{ date: string; control: number; treatment: number }>;
    latencyDistribution?: Array<{ range: string; control: number; treatment: number }>;
    satisfactionBreakdown?: { control: { positive: number; neutral: number; negative: number }; treatment: { positive: number; neutral: number; negative: number } };
  };
}







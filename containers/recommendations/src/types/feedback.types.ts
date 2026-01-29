/**
 * Feedback system types per RECOMMENDATION_FEEDBACK_COMPLETE_REQUIREMENTS
 * FeedbackType, GlobalFeedbackConfig, TenantFeedbackConfig, FeedbackMetadata, FeedbackAggregation
 */

export type FeedbackTypeCategory = 'action' | 'relevance' | 'quality' | 'timing' | 'other';
export type FeedbackSentiment = 'positive' | 'neutral' | 'negative';

export interface FeedbackType {
  id: string;
  partitionKey: string;
  name: string;
  displayName: string;
  category: FeedbackTypeCategory;
  sentiment: FeedbackSentiment;
  sentimentScore: number;
  icon?: string;
  color?: string;
  order: number;
  behavior: {
    createsTask: boolean;
    hidesRecommendation: boolean;
    hideDurationDays?: number;
    suppressSimilar: boolean;
    requiresComment: boolean;
  };
  applicableToRecTypes: string[];
  isActive: boolean;
  isDefault: boolean;
  translations?: Record<string, { displayName: string; description: string }>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/** Input for creating a feedback type (Super Admin). */
export interface CreateFeedbackTypeInput {
  name: string;
  displayName: string;
  category: FeedbackTypeCategory;
  sentiment: FeedbackSentiment;
  sentimentScore: number;
  icon?: string;
  color?: string;
  order: number;
  behavior: FeedbackType['behavior'];
  applicableToRecTypes: string[];
  isActive: boolean;
  isDefault: boolean;
  translations?: Record<string, { displayName: string; description: string }>;
}

/** Input for updating a feedback type (Super Admin). */
export interface UpdateFeedbackTypeInput {
  displayName?: string;
  category?: FeedbackTypeCategory;
  sentiment?: FeedbackSentiment;
  sentimentScore?: number;
  icon?: string;
  color?: string;
  order?: number;
  behavior?: Partial<FeedbackType['behavior']>;
  applicableToRecTypes?: string[];
  isActive?: boolean;
  isDefault?: boolean;
  translations?: Record<string, { displayName: string; description: string }>;
}

export interface GlobalFeedbackConfig {
  id: string;
  partitionKey: string;
  defaultLimit: number;
  minLimit: number;
  maxLimit: number;
  availableTypes: string[];
  defaultActiveTypes: string[];
  patternDetection: {
    enabled: boolean;
    minSampleSize: number;
    thresholds: { ignoreRate: number; actionRate: number };
  };
  updatedAt: string;
  updatedBy: string;
}

export interface TenantFeedbackConfigActiveType {
  feedbackTypeId: string;
  customLabel?: string;
  order: number;
}

export interface TenantFeedbackConfig {
  id: string;
  partitionKey: string;
  tenantId: string;
  activeLimit: number;
  activeTypes: TenantFeedbackConfigActiveType[];
  perTypeConfig: Record<string, { recommendationType: string; activeTypes: string[] }>;
  requireFeedback: boolean;
  allowComments: boolean;
  commentRequired: boolean;
  allowMultipleSelection: boolean;
  patternDetection: {
    enabled: boolean;
    autoSuppressEnabled: boolean;
    autoBoostEnabled: boolean;
  };
  updatedAt: string;
  updatedBy: string;
}

/** Metadata captured with each feedback (FR-1.4) - optional fields for backward compat */
export interface FeedbackMetadata {
  feedbackId: string;
  recommendationId: string;
  userId: string;
  tenantId: string;
  recommendation?: {
    type: string;
    source: string;
    confidence?: number;
    text: string;
    reasoning?: string;
    expectedOutcome?: string;
  };
  opportunity?: {
    id: string;
    stage: string;
    amount: number;
    probability: number;
    industry: string;
    daysToClose: number;
  };
  user?: {
    id: string;
    role: string;
    teamId?: string;
    historicalActionRate?: number;
  };
  feedback: {
    type: string;
    category: string;
    sentiment: FeedbackSentiment;
    comment?: string;
    secondaryTypes?: string[];
  };
  timing?: {
    recommendationGeneratedAt: string;
    recommendationShownAt: string;
    feedbackGivenAt: string;
    timeToFeedbackMs: number;
    timeVisibleMs: number;
  };
  display?: {
    location: string;
    position: number;
    deviceType: string;
    viewportSize?: string;
  };
  abTest?: { variant: string; testId: string };
}

/** Stored RecommendationFeedback document (Cosmos) with full metadata */
export interface RecommendationFeedbackRecord {
  id: string;
  partitionKey: string;
  tenantId: string;
  recommendationId: string;
  catalogEntryId?: string;
  userId: string;
  feedbackTypeId: string;
  /** Legacy: accept | ignore | irrelevant - derived from type or provided */
  action: string;
  comment?: string;
  secondaryTypes?: string[];
  recommendation?: {
    type: string;
    category: string;
    source: string;
    confidence: number;
    text: string;
  };
  opportunity?: {
    id: string;
    stage: string;
    amount: number;
    probability: number;
    industry: string;
    daysToClose: number;
  };
  user?: {
    id: string;
    role: string;
    teamId?: string;
    historicalActionRate?: number;
  };
  feedback?: {
    type: string;
    displayName?: string;
    category: string;
    sentiment: FeedbackSentiment;
    sentimentScore?: number;
    comment?: string;
    secondaryTypes?: string[];
  };
  timing?: {
    recommendationGeneratedAt: string;
    recommendationShownAt: string;
    feedbackGivenAt: string;
    timeToFeedbackMs: number;
    timeVisibleMs: number;
  };
  display?: {
    location: string;
    position: number;
    deviceType: string;
  };
  abTest?: { variant: string; testId: string };
  version: number;
  syncedToDataLake?: boolean;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
  recordedAt: string;
}

export type FeedbackAggregationType = 'global' | 'tenant' | 'rec_type' | 'catalog_entry' | 'user';
export type FeedbackAggregationPeriod = 'daily' | 'weekly' | 'monthly';

export interface FeedbackAggregation {
  id: string;
  partitionKey: string;
  aggregationType: FeedbackAggregationType;
  aggregationKey: string;
  period: FeedbackAggregationPeriod;
  startDate: string;
  endDate: string;
  recommendations: {
    total: number;
    shown: number;
    receivedFeedback: number;
    feedbackRate: number;
  };
  feedbackByType: Record<string, { count: number; percentage: number }>;
  feedbackBySentiment: {
    positive: number;
    neutral: number;
    negative: number;
    avgSentimentScore: number;
  };
  actionMetrics: {
    actionIntended: number;
    actionTaken: number;
    actionCompleted: number;
    actionRate: number;
  };
  updatedAt: string;
}

/** Tenant template: default feedback config (and optional methodology/limits) for applying to tenants. Super Admin §7.2 */
export interface TenantTemplateFeedbackSnapshot {
  activeLimit: number;
  activeTypes: TenantFeedbackConfigActiveType[];
  requireFeedback: boolean;
  allowComments: boolean;
  commentRequired: boolean;
  allowMultipleSelection: boolean;
  patternDetection: {
    enabled: boolean;
    autoSuppressEnabled: boolean;
    autoBoostEnabled: boolean;
  };
}

export interface TenantTemplate {
  id: string;
  partitionKey: string;
  name: string;
  description?: string;
  feedbackConfig: TenantTemplateFeedbackSnapshot;
  methodology?: string;
  defaultLimits?: { maxUsers?: number; maxOpportunities?: number; maxPredictionsPerDay?: number; maxFeedbackPerDay?: number };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

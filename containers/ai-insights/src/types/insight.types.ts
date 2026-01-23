/**
 * AI Insights types
 * Core data model for AI-powered insights and recommendations
 */

export enum InsightType {
  OPPORTUNITY = 'opportunity',
  RISK = 'risk',
  TREND = 'trend',
  ANOMALY = 'anomaly',
  RECOMMENDATION = 'recommendation',
  PREDICTION = 'prediction',
  PATTERN = 'pattern',
  CUSTOM = 'custom',
}

export enum InsightPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum InsightStatus {
  NEW = 'new',
  ACKNOWLEDGED = 'acknowledged',
  DISMISSED = 'dismissed',
  ACTIONED = 'actioned',
  EXPIRED = 'expired',
}

export enum ProactiveInsightType {
  OPPORTUNITY_AT_RISK = 'opportunity_at_risk',
  STALE_OPPORTUNITY = 'stale_opportunity',
  HIGH_VALUE_OPPORTUNITY = 'high_value_opportunity',
  MISSING_INFORMATION = 'missing_information',
  ACTIVITY_GAP = 'activity_gap',
  PRICING_ANOMALY = 'pricing_anomaly',
  COMPETITIVE_THREAT = 'competitive_threat',
  RENEWAL_REMINDER = 'renewal_reminder',
  CUSTOM = 'custom',
}

export enum ProactiveInsightPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ProactiveInsightStatus {
  NEW = 'new',
  ACKNOWLEDGED = 'acknowledged',
  DISMISSED = 'dismissed',
  ACTIONED = 'actioned',
  EXPIRED = 'expired',
}

export enum DeliveryChannel {
  IN_APP = 'in_app',
  DASHBOARD = 'dashboard',
  EMAIL = 'email',
  EMAIL_DIGEST = 'email_digest',
  WEBHOOK = 'webhook',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Insight
 */
export interface Insight {
  id: string;
  tenantId: string; // Partition key
  type: InsightType;
  priority: InsightPriority;
  status: InsightStatus;
  title: string;
  summary: string;
  detailedContent?: string;
  shardId?: string;
  shardName?: string;
  shardTypeId?: string;
  confidence: number; // 0-100
  evidence?: InsightEvidence[];
  suggestedActions?: SuggestedAction[];
  relatedShards?: {
    id: string;
    name: string;
    shardTypeId: string;
    relationship: string;
  }[];
  metadata?: Record<string, any>;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  dismissedAt?: Date;
  dismissedBy?: string;
  dismissReason?: string;
  actionedAt?: Date;
  actionedBy?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Insight Evidence
 */
export interface InsightEvidence {
  type: 'metric' | 'trend' | 'comparison' | 'pattern' | 'prediction';
  label: string;
  value: any;
  description?: string;
  source?: string;
}

/**
 * Suggested Action
 */
export interface SuggestedAction {
  label: string;
  type: 'navigate' | 'create_task' | 'send_email' | 'schedule_meeting' | 'update_field' | 'custom';
  payload: Record<string, any>;
  description?: string;
}

/**
 * Create insight input
 */
export interface CreateInsightInput {
  tenantId: string;
  userId: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  summary: string;
  detailedContent?: string;
  shardId?: string;
  shardName?: string;
  shardTypeId?: string;
  confidence?: number;
  evidence?: InsightEvidence[];
  suggestedActions?: SuggestedAction[];
  relatedShards?: Insight['relatedShards'];
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

/**
 * Update insight input
 */
export interface UpdateInsightInput {
  status?: InsightStatus;
  acknowledgedBy?: string;
  dismissedBy?: string;
  dismissReason?: string;
  actionedBy?: string;
}

/**
 * Generate insight request
 */
export interface GenerateInsightRequest {
  tenantId: string;
  userId: string;
  shardIds?: string[];
  shardTypeIds?: string[];
  insightType?: InsightType;
  context?: string;
  includeEvidence?: boolean;
  includeActions?: boolean;
}

/**
 * Proactive Insight
 */
export interface ProactiveInsight {
  id: string;
  tenantId: string; // Partition key
  triggerId: string;
  triggerName: string;
  type: ProactiveInsightType;
  priority: ProactiveInsightPriority;
  status: ProactiveInsightStatus;
  shardId: string;
  shardName: string;
  shardTypeId: string;
  title: string;
  summary: string;
  detailedContent?: string;
  matchedConditions: {
    field: string;
    operator: string;
    expectedValue: any;
    actualValue: any;
  }[];
  suggestedActions?: SuggestedAction[];
  relatedShards?: {
    id: string;
    name: string;
    shardTypeId: string;
    relationship: string;
  }[];
  targetUserIds?: string[];
  deliveries: InsightDelivery[];
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  actionedAt?: Date;
  actionedBy?: string;
  dismissedAt?: Date;
  dismissedBy?: string;
  dismissReason?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Insight Delivery
 */
export interface InsightDelivery {
  id: string;
  channel: DeliveryChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  attemptedAt?: Date;
  deliveredAt?: Date;
  error?: string;
  recipientId?: string;
  recipientEmail?: string;
}

/**
 * Collaborative Insight
 */
export interface CollaborativeInsight {
  id: string;
  tenantId: string; // Partition key
  insightId: string; // Reference to base insight
  teamId?: string;
  projectId?: string;
  sharedBy: string;
  sharedWith: string[]; // User IDs
  comments?: {
    id: string;
    userId: string;
    userName?: string;
    content: string;
    createdAt: Date;
  }[];
  reactions?: {
    userId: string;
    reaction: 'like' | 'dislike' | 'helpful' | 'not_helpful';
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Risk Analysis
 */
export interface RiskAnalysis {
  id: string;
  tenantId: string; // Partition key
  shardId: string;
  shardName: string;
  shardTypeId: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  riskFactors: {
    factor: string;
    severity: RiskLevel;
    description: string;
    evidence?: any;
  }[];
  revenueAtRisk?: number;
  probability: number; // 0-100
  impact: number; // 0-100
  mitigationStrategies?: {
    strategy: string;
    priority: number;
    description: string;
  }[];
  earlyWarningIndicators?: {
    indicator: string;
    threshold: any;
    currentValue: any;
    status: 'normal' | 'warning' | 'critical';
  }[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create risk analysis input
 */
export interface CreateRiskAnalysisInput {
  tenantId: string;
  userId: string;
  shardId: string;
  shardName: string;
  shardTypeId: string;
  riskFactors: RiskAnalysis['riskFactors'];
  revenueAtRisk?: number;
  probability?: number;
  impact?: number;
  mitigationStrategies?: RiskAnalysis['mitigationStrategies'];
  earlyWarningIndicators?: RiskAnalysis['earlyWarningIndicators'];
  metadata?: Record<string, any>;
}


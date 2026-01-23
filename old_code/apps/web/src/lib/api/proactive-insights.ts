/**
 * Proactive Insights API Client
 * Handles communication with the Proactive Insights backend
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export type ProactiveInsightStatus =
  | 'pending'
  | 'delivered'
  | 'acknowledged'
  | 'actioned'
  | 'dismissed'
  | 'expired';

export type ProactiveInsightType =
  | 'deal_at_risk'
  | 'milestone_approaching'
  | 'stale_opportunity'
  | 'missing_follow_up'
  | 'relationship_cooling'
  | 'action_required';

export type ProactiveInsightPriority = 'critical' | 'high' | 'medium' | 'low';

export type DeliveryChannel = 'in_app' | 'dashboard' | 'email' | 'email_digest' | 'webhook';

export interface ProactiveInsight {
  id: string;
  tenantId: string;
  type: ProactiveInsightType;
  priority: ProactiveInsightPriority;
  status: ProactiveInsightStatus;
  title: string;
  message: string; // Maps from backend 'summary'
  recommendation?: string; // Maps from backend 'detailedContent'
  shardId?: string;
  shardName?: string;
  triggerId: string;
  triggerName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string; // Extracted from deliveries array
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  dismissedAt?: string;
  dismissedBy?: string;
  dismissedReason?: string; // Maps from backend 'dismissReason'
  actionedAt?: string;
  actionedBy?: string;
  expiresAt?: string;
}

export interface ProactiveInsightsListParams {
  status?: ProactiveInsightStatus | ProactiveInsightStatus[];
  type?: ProactiveInsightType | ProactiveInsightType[];
  priority?: ProactiveInsightPriority | ProactiveInsightPriority[];
  shardId?: string;
  triggerId?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'priority';
  order?: 'asc' | 'desc';
}

export interface ProactiveInsightsListResponse {
  insights: ProactiveInsight[];
  total: number;
  hasMore: boolean;
}

export interface DismissInsightRequest {
  reason?: string;
}

export interface CheckTriggersRequest {
  triggerIds?: string[];
  shardTypeIds?: string[];
  shardIds?: string[];
  generateAIContent?: boolean;
  limit?: number;
  dryRun?: boolean;
}

export interface CheckTriggersResponse {
  triggersEvaluated: number;
  shardsEvaluated: number;
  insightsGenerated: ProactiveInsight[];
  deliveryResults?: Array<{
    insightId: string;
    channel: string;
    status: string;
  }>;
  errors: Array<{
    triggerId?: string;
    shardId?: string;
    error: string;
  }>;
  durationMs: number;
  executedAt: string;
}

// ============================================
// API Functions
// ============================================

/**
 * Transform backend insight to frontend format
 */
function transformInsight(backendInsight: any): ProactiveInsight {
  // Extract deliveredAt from deliveries array (first successful delivery)
  const deliveredAt = backendInsight.deliveries?.find(
    (d: any) => d.status === 'sent' && d.sentAt
  )?.sentAt;

  return {
    id: backendInsight.id,
    tenantId: backendInsight.tenantId,
    type: backendInsight.type,
    priority: backendInsight.priority,
    status: backendInsight.status,
    title: backendInsight.title,
    message: backendInsight.summary || '', // Map summary to message
    recommendation: backendInsight.detailedContent, // Map detailedContent to recommendation
    shardId: backendInsight.shardId,
    shardName: backendInsight.shardName,
    triggerId: backendInsight.triggerId,
    triggerName: backendInsight.triggerName,
    metadata: backendInsight.metadata,
    createdAt: typeof backendInsight.createdAt === 'string' 
      ? backendInsight.createdAt 
      : backendInsight.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: typeof backendInsight.updatedAt === 'string'
      ? backendInsight.updatedAt
      : backendInsight.updatedAt?.toISOString() || new Date().toISOString(),
    deliveredAt: deliveredAt 
      ? (typeof deliveredAt === 'string' ? deliveredAt : deliveredAt.toISOString())
      : undefined,
    acknowledgedAt: backendInsight.acknowledgedAt
      ? (typeof backendInsight.acknowledgedAt === 'string'
          ? backendInsight.acknowledgedAt
          : backendInsight.acknowledgedAt.toISOString())
      : undefined,
    acknowledgedBy: backendInsight.acknowledgedBy,
    dismissedAt: backendInsight.dismissedAt
      ? (typeof backendInsight.dismissedAt === 'string'
          ? backendInsight.dismissedAt
          : backendInsight.dismissedAt.toISOString())
      : undefined,
    dismissedBy: backendInsight.dismissedBy,
    dismissedReason: backendInsight.dismissReason || backendInsight.dismissedReason, // Support both field names
    actionedAt: backendInsight.actionedAt
      ? (typeof backendInsight.actionedAt === 'string'
          ? backendInsight.actionedAt
          : backendInsight.actionedAt.toISOString())
      : undefined,
    actionedBy: backendInsight.actionedBy,
    expiresAt: backendInsight.expiresAt
      ? (typeof backendInsight.expiresAt === 'string'
          ? backendInsight.expiresAt
          : backendInsight.expiresAt.toISOString())
      : undefined,
  };
}

/**
 * List proactive insights
 */
export async function listProactiveInsights(
  params?: ProactiveInsightsListParams
): Promise<ProactiveInsightsListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.status) {
    if (Array.isArray(params.status)) {
      params.status.forEach((s) => searchParams.append('status', s));
    } else {
      searchParams.append('status', params.status);
    }
  }

  if (params?.type) {
    if (Array.isArray(params.type)) {
      params.type.forEach((t) => searchParams.append('type', t));
    } else {
      searchParams.append('type', params.type);
    }
  }

  if (params?.priority) {
    if (Array.isArray(params.priority)) {
      params.priority.forEach((p) => searchParams.append('priority', p));
    } else {
      searchParams.append('priority', params.priority);
    }
  }

  if (params?.shardId) {
    searchParams.append('shardId', params.shardId);
  }

  if (params?.triggerId) {
    searchParams.append('triggerId', params.triggerId);
  }

  if (params?.limit) {
    searchParams.append('limit', params.limit.toString());
  }

  if (params?.offset) {
    searchParams.append('offset', params.offset.toString());
  }

  if (params?.orderBy) {
    searchParams.append('orderBy', params.orderBy);
  }

  if (params?.order) {
    searchParams.append('order', params.order);
  }

  const response = await apiClient.get<{ insights: any[]; total: number; hasMore: boolean }>(
    `/api/v1/proactive-insights?${searchParams.toString()}`
  );
  
  return {
    insights: response.data.insights.map(transformInsight),
    total: response.data.total,
    hasMore: response.data.hasMore,
  };
}

/**
 * Get a proactive insight by ID
 */
export async function getProactiveInsight(insightId: string): Promise<ProactiveInsight> {
  const response = await apiClient.get<any>(
    `/api/v1/proactive-insights/${insightId}`
  );
  return transformInsight(response.data);
}

/**
 * Acknowledge a proactive insight
 */
export async function acknowledgeProactiveInsight(insightId: string): Promise<ProactiveInsight> {
  const response = await apiClient.post<any>(
    `/api/v1/proactive-insights/${insightId}/acknowledge`
  );
  return transformInsight(response.data);
}

/**
 * Dismiss a proactive insight
 */
export async function dismissProactiveInsight(
  insightId: string,
  request?: DismissInsightRequest
): Promise<ProactiveInsight> {
  const response = await apiClient.post<any>(
    `/api/v1/proactive-insights/${insightId}/dismiss`,
    request
  );
  return transformInsight(response.data);
}

/**
 * Mark a proactive insight as actioned
 */
export async function actionProactiveInsight(insightId: string): Promise<ProactiveInsight> {
  const response = await apiClient.post<any>(
    `/api/v1/proactive-insights/${insightId}/action`
  );
  return transformInsight(response.data);
}

/**
 * Manually trigger evaluation of proactive triggers
 */
export async function checkTriggers(
  options?: CheckTriggersRequest
): Promise<CheckTriggersResponse> {
  const response = await apiClient.post<CheckTriggersResponse>(
    '/api/v1/proactive-insights/check-triggers',
    options || {}
  );
  return response.data;
}

// ============================================
// Delivery Preferences Types
// ============================================

export interface DeliveryPreferences {
  userId: string;
  tenantId: string;
  channels: {
    in_app: {
      enabled: boolean;
      pushThreshold: ProactiveInsightPriority;
    };
    dashboard: {
      enabled: boolean;
      maxItems: number;
      groupByType: boolean;
    };
    email: {
      enabled: boolean;
      immediateThreshold: ProactiveInsightPriority;
      digestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
      digestTime?: string;
    };
    webhook: {
      enabled: boolean;
      url?: string;
      headers?: Record<string, string>;
      secret?: string;
    };
  };
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  typeOverrides?: Partial<Record<ProactiveInsightType, {
    enabled?: boolean;
    channels?: string[];
    priority?: ProactiveInsightPriority;
  }>>;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateDeliveryPreferencesRequest {
  channels?: Partial<DeliveryPreferences['channels']>;
  quietHours?: DeliveryPreferences['quietHours'];
  typeOverrides?: DeliveryPreferences['typeOverrides'];
}

// ============================================
// Delivery Preferences API Functions
// ============================================

/**
 * Get delivery preferences for the current user
 */
export async function getDeliveryPreferences(): Promise<DeliveryPreferences> {
  const response = await apiClient.get<DeliveryPreferences>(
    '/api/v1/proactive-insights/delivery-preferences'
  );
  return response.data;
}

/**
 * Update delivery preferences for the current user
 */
export async function updateDeliveryPreferences(
  preferences: UpdateDeliveryPreferencesRequest
): Promise<DeliveryPreferences> {
  const response = await apiClient.put<DeliveryPreferences>(
    '/api/v1/proactive-insights/delivery-preferences',
    preferences
  );
  return response.data;
}

/**
 * Reset delivery preferences to defaults
 */
export async function resetDeliveryPreferences(): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(
    '/api/v1/proactive-insights/delivery-preferences'
  );
  return response.data;
}

// ============================================
// Analytics Types
// ============================================

export interface DeliveryMetrics {
  period: string;
  totalInsights: number;
  totalDeliveries: number;
  insightsByType: Record<string, number>;
  insightsByPriority: Record<string, number>;
  deliveriesByChannel: Record<DeliveryChannel, number>;
  deliverySuccessRate: number;
  deliveryFailureRate: number;
  avgDeliveryLatencyMs: number;
  acknowledgmentRate: number;
  dismissalRate: number;
  actionRate: number;
  avgTimeToAcknowledgeMs: number;
  avgTimeToActionMs: number;
  insightsByTrigger: Record<string, number>;
  topTriggers: Array<{ triggerId: string; triggerName: string; count: number }>;
}

export interface DailyDeliveryMetrics {
  date: string;
  insightsGenerated: number;
  deliveriesSent: number;
  deliveriesFailed: number;
  acknowledgments: number;
  dismissals: number;
  actions: number;
}

export interface TriggerPerformance {
  triggerId: string;
  triggerName: string;
  triggerType: ProactiveInsightType;
  totalInsights: number;
  deliverySuccessRate: number;
  acknowledgmentRate: number;
  actionRate: number;
  avgTimeToAcknowledgeMs: number;
}

export interface ChannelPerformance {
  channel: DeliveryChannel;
  totalDeliveries: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgLatencyMs: number;
}

// ============================================
// Analytics API Functions
// ============================================

/**
 * Get delivery metrics for a time period
 */
export async function getDeliveryMetrics(
  period: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<DeliveryMetrics> {
  const response = await apiClient.get<DeliveryMetrics>(
    `/api/v1/proactive-insights/analytics/metrics?period=${period}`
  );
  return response.data;
}

/**
 * Get daily metrics for a date range
 */
export async function getDailyDeliveryMetrics(
  startDate: string,
  endDate: string
): Promise<{ daily: DailyDeliveryMetrics[] }> {
  const response = await apiClient.get<{ daily: DailyDeliveryMetrics[] }>(
    `/api/v1/proactive-insights/analytics/daily?startDate=${startDate}&endDate=${endDate}`
  );
  return response.data;
}

/**
 * Get trigger performance metrics
 */
export async function getTriggerPerformance(
  triggerId?: string
): Promise<{ triggers: TriggerPerformance[] }> {
  const url = triggerId
    ? `/api/v1/proactive-insights/analytics/triggers?triggerId=${triggerId}`
    : '/api/v1/proactive-insights/analytics/triggers';
  const response = await apiClient.get<{ triggers: TriggerPerformance[] }>(url);
  return response.data;
}

/**
 * Get channel performance metrics
 */
export async function getChannelPerformance(
  period: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<{ channels: ChannelPerformance[] }> {
  const response = await apiClient.get<{ channels: ChannelPerformance[] }>(
    `/api/v1/proactive-insights/analytics/channels?period=${period}`
  );
  return response.data;
}


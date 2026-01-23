/**
 * Proactive Triggers API Client
 * Handles communication with the Proactive Triggers backend
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export type ProactiveInsightType =
  | 'deal_at_risk'
  | 'milestone_approaching'
  | 'stale_opportunity'
  | 'missing_follow_up'
  | 'relationship_cooling'
  | 'action_required';

export type ProactiveInsightPriority = 'critical' | 'high' | 'medium' | 'low';

export type TriggerOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_null'
  | 'is_not_null'
  | 'changed'
  | 'changed_to'
  | 'changed_from';

export interface TriggerCondition {
  field: string;
  operator: TriggerOperator;
  value?: unknown;
  relativeDate?: string;
  description?: string;
}

export interface TriggerConditionGroup {
  operator: 'and' | 'or';
  conditions: (TriggerCondition | TriggerConditionGroup)[];
}

export interface TriggerSchedule {
  cron?: string;
  intervalMinutes?: number;
  timezone?: string;
}

export interface ProactiveTrigger {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ProactiveInsightType;
  shardTypeId: string;
  conditions: TriggerCondition[] | TriggerConditionGroup;
  priority: ProactiveInsightPriority;
  cooldownHours: number;
  schedule?: TriggerSchedule;
  eventTriggers?: string[];
  messageTemplate?: string;
  contextTemplateId?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  isSystem: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
  triggerCount: number;
}

export interface ProactiveTriggersListParams {
  shardTypeId?: string;
  type?: ProactiveInsightType;
  isActive?: boolean;
  isSystem?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'name' | 'triggerCount';
  order?: 'asc' | 'desc';
}

export interface ProactiveTriggersListResponse {
  triggers: ProactiveTrigger[];
  total: number;
  hasMore: boolean;
}

export interface CreateProactiveTriggerRequest {
  name: string;
  description?: string;
  type: ProactiveInsightType;
  shardTypeId: string;
  conditions: TriggerCondition[] | TriggerConditionGroup;
  priority: ProactiveInsightPriority;
  cooldownHours: number;
  schedule?: TriggerSchedule;
  eventTriggers?: string[];
  messageTemplate?: string;
  contextTemplateId?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateProactiveTriggerRequest {
  name?: string;
  description?: string;
  type?: ProactiveInsightType;
  shardTypeId?: string;
  conditions?: TriggerCondition[] | TriggerConditionGroup;
  priority?: ProactiveInsightPriority;
  cooldownHours?: number;
  schedule?: TriggerSchedule;
  eventTriggers?: string[];
  messageTemplate?: string;
  contextTemplateId?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

// ============================================
// API Functions
// ============================================

/**
 * List proactive triggers
 */
export async function listProactiveTriggers(
  params?: ProactiveTriggersListParams
): Promise<ProactiveTriggersListResponse> {
  const response = await apiClient.get<ProactiveTriggersListResponse>(
    '/api/v1/proactive-triggers',
    { params }
  );
  return response.data;
}

/**
 * Get a single proactive trigger
 */
export async function getProactiveTrigger(triggerId: string): Promise<ProactiveTrigger> {
  const response = await apiClient.get<ProactiveTrigger>(
    `/api/v1/proactive-triggers/${triggerId}`
  );
  return response.data;
}

/**
 * Create a new proactive trigger
 */
export async function createProactiveTrigger(
  data: CreateProactiveTriggerRequest
): Promise<ProactiveTrigger> {
  const response = await apiClient.post<ProactiveTrigger>(
    '/api/v1/proactive-triggers',
    data
  );
  return response.data;
}

/**
 * Update an existing proactive trigger
 */
export async function updateProactiveTrigger(
  triggerId: string,
  data: UpdateProactiveTriggerRequest
): Promise<ProactiveTrigger> {
  const response = await apiClient.put<ProactiveTrigger>(
    `/api/v1/proactive-triggers/${triggerId}`,
    data
  );
  return response.data;
}

/**
 * Delete a proactive trigger
 */
export async function deleteProactiveTrigger(triggerId: string): Promise<void> {
  await apiClient.delete(`/api/v1/proactive-triggers/${triggerId}`);
}

/**
 * Seed default triggers for the authenticated tenant
 */
export interface SeedTriggersResponse {
  message: string;
  results: {
    seeded: number;
    skipped: number;
    errors: number;
  };
}

export async function seedDefaultTriggers(): Promise<SeedTriggersResponse> {
  const response = await apiClient.post<SeedTriggersResponse>(
    '/api/v1/proactive-triggers/seed'
  );
  return response.data;
}


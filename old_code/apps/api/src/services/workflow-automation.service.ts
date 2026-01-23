/**
 * Workflow Automation Service
 * Connects AI insights to automated actions like task creation, notifications, and webhooks
 */

import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '@castiel/api-core';
import { ShardStatus } from '../types/shard.types.js';
import { v4 as uuid } from 'uuid';
import { PlaybookExecutionService } from './playbook-execution.service.js';

// ============================================
// Types
// ============================================

export interface Workflow {
  id: string;
  tenantId: string;

  // Configuration
  name: string;
  description?: string;

  // Trigger
  trigger: WorkflowTrigger;

  // Conditions (optional)
  conditions?: WorkflowCondition[];

  // Actions
  actions: WorkflowAction[];

  // Settings
  isActive: boolean;
  runOnce?: boolean;
  hasRun?: boolean;
  maxRuns?: number;
  currentRuns?: number;

  // Status
  lastTriggeredAt?: Date;
  lastResult?: WorkflowResult;

  createdAt: Date;
  createdBy: string;
}

export type WorkflowTrigger =
  | { type: 'insight_generated'; insightType?: string; priority?: string }
  | { type: 'proactive_insight'; agentType?: string; priority?: string }
  | { type: 'feedback_received'; rating?: 'positive' | 'negative' }
  | { type: 'schedule_completed'; scheduleId?: string }
  | { type: 'shard_event'; event: 'created' | 'updated' | 'deleted'; shardTypeId?: string }
  | { type: 'threshold_crossed'; metric: string; threshold: number; direction: 'above' | 'below' }
  | { type: 'manual' };

export interface WorkflowCondition {
  id: string;
  type: 'field' | 'expression' | 'time';

  // For field conditions
  field?: string;
  operator?: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
  value?: unknown;

  // For time conditions
  timeConstraint?: {
    days?: number[];  // 0-6
    hours?: { start: number; end: number };
  };

  // For expression
  expression?: string;
}

export type WorkflowAction =
  | CreateTaskAction
  | SendNotificationAction
  | SendEmailAction
  | CallWebhookAction
  | UpdateShardAction
  | CreateShardAction
  | AssignUserAction
  | AddTagAction
  | TriggerWorkflowAction
  | ExecutePlaybookAction;

export interface CreateTaskAction {
  type: 'create_task';
  config: {
    title: string;          // Supports {{variables}}
    description?: string;
    assignTo?: string;      // User ID or 'trigger_user'
    dueInDays?: number;
    priority?: 'low' | 'medium' | 'high';
    linkToShard?: boolean;
    tags?: string[];
  };
}

export interface SendNotificationAction {
  type: 'send_notification';
  config: {
    title: string;
    message: string;
    recipients: string[];   // User IDs, role names, or 'trigger_user'
    priority?: 'low' | 'medium' | 'high';
    actionUrl?: string;
  };
}

export interface SendEmailAction {
  type: 'send_email';
  config: {
    to: string[];           // Email addresses or user references
    subject: string;
    body: string;
    templateId?: string;
  };
}

export interface CallWebhookAction {
  type: 'call_webhook';
  config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    includePayload?: boolean;
  };
}

export interface UpdateShardAction {
  type: 'update_shard';
  config: {
    shardId?: string;       // If not specified, uses trigger shard
    updates: Record<string, unknown>;
  };
}

export interface CreateShardAction {
  type: 'create_shard';
  config: {
    shardTypeId: string;
    name: string;
    data: Record<string, unknown>;
    linkToTrigger?: boolean;
  };
}

export interface AssignUserAction {
  type: 'assign_user';
  config: {
    userId: string;
    role?: string;
  };
}

export interface AddTagAction {
  type: 'add_tag';
  config: {
    tags: string[];
  };
}

export interface TriggerWorkflowAction {
  type: 'trigger_workflow';
  config: {
    workflowId: string;
    passPayload?: boolean;
  };
}

export interface ExecutePlaybookAction {
  type: 'execute_playbook';
  config: {
    playbookId: string;
    context?: Record<string, any>; // Additional context to pass to playbook
    opportunityId?: string; // Optional opportunity ID
  };
}

export interface WorkflowResult {
  runId: string;
  triggeredAt: Date;
  completedAt: Date;
  success: boolean;
  actionResults: ActionResult[];
  error?: string;
}

export interface ActionResult {
  actionType: string;
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}

export interface WorkflowTriggerPayload {
  tenantId: string;
  userId?: string;

  // Trigger context
  trigger: string;

  // Related data
  insightId?: string;
  insightContent?: string;
  shardId?: string;
  shardData?: Record<string, unknown>;
  feedbackId?: string;
  scheduleId?: string;

  // Additional data
  metadata?: Record<string, unknown>;
}

// ============================================
// Service
// ============================================

export class WorkflowAutomationService {
  private readonly WORKFLOWS_KEY = 'workflows:';
  private readonly RUNS_KEY = 'workflow:runs:';

  constructor(
    private readonly redis: Redis,
    private readonly shardRepository: ShardRepository,
    private readonly monitoring: IMonitoringProvider,
    private readonly playbookExecutionService?: PlaybookExecutionService
  ) { }

  // ============================================
  // Workflow Management
  // ============================================

  /**
   * Create a workflow
   */
  async createWorkflow(
    tenantId: string,
    workflow: Omit<Workflow, 'id' | 'createdAt' | 'lastTriggeredAt' | 'lastResult' | 'hasRun' | 'currentRuns'>
  ): Promise<Workflow> {
    const newWorkflow: Workflow = {
      ...workflow,
      id: `wf_${uuid()}`,
      tenantId,
      createdAt: new Date(),
      hasRun: false,
      currentRuns: 0,
    };

    await this.saveWorkflow(newWorkflow);

    this.monitoring.trackEvent('workflow.created', {
      tenantId,
      workflowId: newWorkflow.id,
      triggerType: newWorkflow.trigger.type,
      actionCount: newWorkflow.actions.length,
    });

    return newWorkflow;
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(
    workflowId: string,
    tenantId: string,
    updates: Partial<Workflow>
  ): Promise<Workflow | null> {
    const workflow = await this.getWorkflow(workflowId, tenantId);
    if (!workflow) {return null;}

    const updated: Workflow = {
      ...workflow,
      ...updates,
      id: workflow.id,
      tenantId: workflow.tenantId,
      createdAt: workflow.createdAt,
    };

    await this.saveWorkflow(updated);
    return updated;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string, tenantId: string): Promise<boolean> {
    const key = `${this.WORKFLOWS_KEY}${tenantId}:${workflowId}`;
    const deleted = await this.redis.del(key);
    return deleted > 0;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string, tenantId: string): Promise<Workflow | null> {
    const key = `${this.WORKFLOWS_KEY}${tenantId}:${workflowId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * List workflows
   */
  async listWorkflows(tenantId: string): Promise<Workflow[]> {
    const pattern = `${this.WORKFLOWS_KEY}${tenantId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {return [];}

    const workflows: Workflow[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        workflows.push(JSON.parse(data));
      }
    }

    return workflows.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // ============================================
  // Trigger Handling
  // ============================================

  /**
   * Trigger workflows for an event
   */
  async triggerWorkflows(
    triggerType: string,
    payload: WorkflowTriggerPayload
  ): Promise<WorkflowResult[]> {
    const workflows = await this.listWorkflows(payload.tenantId);
    const results: WorkflowResult[] = [];

    for (const workflow of workflows) {
      if (!workflow.isActive) {continue;}
      if (workflow.trigger.type !== triggerType) {continue;}

      // Check trigger-specific filters
      if (!this.matchesTrigger(workflow.trigger, payload)) {continue;}

      // Check conditions
      if (!this.checkConditions(workflow.conditions || [], payload)) {continue;}

      // Check run limits
      if (workflow.runOnce && workflow.hasRun) {continue;}
      if (workflow.maxRuns && (workflow.currentRuns || 0) >= workflow.maxRuns) {continue;}

      // Execute workflow
      const result = await this.executeWorkflow(workflow, payload);
      results.push(result);
    }

    return results;
  }

  /**
   * Manually trigger a specific workflow
   */
  async triggerManually(
    workflowId: string,
    tenantId: string,
    payload: Partial<WorkflowTriggerPayload>
  ): Promise<WorkflowResult> {
    const workflow = await this.getWorkflow(workflowId, tenantId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const fullPayload: WorkflowTriggerPayload = {
      tenantId,
      trigger: 'manual',
      ...payload,
    };

    return this.executeWorkflow(workflow, fullPayload);
  }

  // ============================================
  // Execution
  // ============================================

  private async executeWorkflow(
    workflow: Workflow,
    payload: WorkflowTriggerPayload
  ): Promise<WorkflowResult> {
    const runId = uuid();
    const startTime = Date.now();
    const actionResults: ActionResult[] = [];
    let overallSuccess = true;

    this.monitoring.trackEvent('workflow.started', {
      workflowId: workflow.id,
      tenantId: workflow.tenantId,
      trigger: payload.trigger,
    });

    for (const action of workflow.actions) {
      const actionStart = Date.now();
      try {
        const result = await this.executeAction(action, payload);
        actionResults.push({
          actionType: action.type,
          success: true,
          result,
          durationMs: Date.now() - actionStart,
        });
      } catch (error: any) {
        overallSuccess = false;
        actionResults.push({
          actionType: action.type,
          success: false,
          error: error.message,
          durationMs: Date.now() - actionStart,
        });

        this.monitoring.trackException(error, {
          operation: 'workflow.executeAction',
          workflowId: workflow.id,
          actionType: action.type,
        });
      }
    }

    const result: WorkflowResult = {
      runId,
      triggeredAt: new Date(startTime),
      completedAt: new Date(),
      success: overallSuccess,
      actionResults,
    };

    // Update workflow
    await this.updateWorkflow(workflow.id, workflow.tenantId, {
      lastTriggeredAt: new Date(),
      lastResult: result,
      hasRun: true,
      currentRuns: (workflow.currentRuns || 0) + 1,
    });

    // Store run history
    await this.storeRun(workflow.id, workflow.tenantId, result);

    this.monitoring.trackEvent('workflow.completed', {
      workflowId: workflow.id,
      tenantId: workflow.tenantId,
      success: overallSuccess,
      durationMs: Date.now() - startTime,
      actionCount: actionResults.length,
      successfulActions: actionResults.filter(r => r.success).length,
    });

    return result;
  }

  private async executeAction(
    action: WorkflowAction,
    payload: WorkflowTriggerPayload
  ): Promise<unknown> {
    switch (action.type) {
      case 'create_task':
        return this.executeCreateTask(action.config, payload);

      case 'send_notification':
        return this.executeSendNotification(action.config, payload);

      case 'send_email':
        return this.executeSendEmail(action.config, payload);

      case 'call_webhook':
        return this.executeCallWebhook(action.config, payload);

      case 'update_shard':
        return this.executeUpdateShard(action.config, payload);

      case 'create_shard':
        return this.executeCreateShard(action.config, payload);

      case 'add_tag':
        return this.executeAddTag(action.config, payload);

      case 'trigger_workflow':
        return this.executeTriggerWorkflow(action.config, payload);

      case 'execute_playbook':
        return this.executeExecutePlaybook(action.config, payload);

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  // ============================================
  // Action Implementations
  // ============================================

  private async executeCreateTask(
    config: CreateTaskAction['config'],
    payload: WorkflowTriggerPayload
  ): Promise<{ taskId: string }> {
    // Resolve variables in title/description
    const title = this.resolveTemplate(config.title, payload);
    const description = config.description ? this.resolveTemplate(config.description, payload) : undefined;

    // Would integrate with task service
    const taskId = `task_${uuid()}`;

    this.monitoring.trackEvent('workflow.action.task_created', {
      tenantId: payload.tenantId,
      taskId,
    });

    return { taskId };
  }

  private async executeSendNotification(
    config: SendNotificationAction['config'],
    payload: WorkflowTriggerPayload
  ): Promise<{ sent: number }> {
    const title = this.resolveTemplate(config.title, payload);
    const message = this.resolveTemplate(config.message, payload);

    // Would integrate with notification service
    const sent = config.recipients.length;

    return { sent };
  }

  private async executeSendEmail(
    config: SendEmailAction['config'],
    payload: WorkflowTriggerPayload
  ): Promise<{ sent: number }> {
    const subject = this.resolveTemplate(config.subject, payload);
    const body = this.resolveTemplate(config.body, payload);

    // Would integrate with email service
    return { sent: config.to.length };
  }

  private async executeCallWebhook(
    config: CallWebhookAction['config'],
    payload: WorkflowTriggerPayload
  ): Promise<{ status: number; body: unknown }> {
    const url = this.resolveTemplate(config.url, payload);

    let body = config.body || {};
    if (config.includePayload) {
      body = { ...body, ...payload };
    }

    const response = await fetch(url, {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: config.method !== 'GET' ? JSON.stringify(body) : undefined,
    });

    const responseBody = await response.text();
    let parsedBody;
    try {
      parsedBody = JSON.parse(responseBody);
    } catch {
      parsedBody = responseBody;
    }

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    return { status: response.status, body: parsedBody };
  }

  private async executeUpdateShard(
    config: UpdateShardAction['config'],
    payload: WorkflowTriggerPayload
  ): Promise<{ updated: boolean }> {
    const shardId = config.shardId || payload.shardId;
    if (!shardId) {
      throw new Error('No shard ID available for update');
    }

    await this.shardRepository.update(shardId, payload.tenantId, {
      structuredData: config.updates,
      // updatedBy: payload.userId || 'system', // Not in interface
    });

    return { updated: true };
  }

  private async executeCreateShard(
    config: CreateShardAction['config'],
    payload: WorkflowTriggerPayload
  ): Promise<{ shardId: string }> {
    const name = this.resolveTemplate(config.name, payload);

    const shard = await this.shardRepository.create({
      tenantId: payload.tenantId,
      shardTypeId: config.shardTypeId,
      structuredData: { ...config.data, name },
      status: ShardStatus.ACTIVE,
      metadata: { tags: [] },
      createdBy: payload.userId || 'system',
    });

    // Link to trigger shard if configured
    if (config.linkToTrigger && payload.shardId) {
      // Would add relationship
    }

    return { shardId: shard.id };
  }

  private async executeAddTag(
    config: AddTagAction['config'],
    payload: WorkflowTriggerPayload
  ): Promise<{ added: string[] }> {
    if (!payload.shardId) {
      throw new Error('No shard ID available for adding tags');
    }

    const shard = await this.shardRepository.findById(payload.shardId, payload.tenantId);
    if (!shard) {
      throw new Error('Shard not found');
    }

    const newTags = [...new Set([...(shard.metadata?.tags || []), ...config.tags])];

    // Merge with existing metadata to preserve other fields
    const updatedMetadata = { ...(shard.metadata || {}), tags: newTags };

    await this.shardRepository.update(payload.shardId, payload.tenantId, {
      metadata: updatedMetadata,
      // updatedBy: payload.userId || 'system', // Not in interface
    });

    return { added: config.tags };
  }

  private async executeTriggerWorkflow(
    config: TriggerWorkflowAction['config'],
    payload: WorkflowTriggerPayload
  ): Promise<WorkflowResult> {
    return this.triggerManually(
      config.workflowId,
      payload.tenantId,
      config.passPayload ? payload : {}
    );
  }

  private async executeExecutePlaybook(
    config: ExecutePlaybookAction['config'],
    payload: WorkflowTriggerPayload
  ): Promise<{ executionId: string }> {
    if (!this.playbookExecutionService) {
      throw new Error('PlaybookExecutionService not available');
    }

    const context = {
      ...config.context,
      tenantId: payload.tenantId,
      userId: payload.userId,
      shardId: payload.shardId,
      ...payload.metadata,
    };

    const execution = await this.playbookExecutionService.executePlaybook(
      payload.tenantId,
      config.playbookId,
      {
        ...context,
        opportunityId: config.opportunityId || payload.shardId,
      }
    );

    this.monitoring.trackEvent('workflow.action.playbook_executed', {
      tenantId: payload.tenantId,
      playbookId: config.playbookId,
      executionId: execution.executionId,
    });

    return { executionId: execution.executionId };
  }

  // ============================================
  // Helpers
  // ============================================

  private matchesTrigger(trigger: WorkflowTrigger, payload: WorkflowTriggerPayload): boolean {
    switch (trigger.type) {
      case 'insight_generated':
        if (trigger.insightType && payload.metadata?.insightType !== trigger.insightType) {
          return false;
        }
        if (trigger.priority && payload.metadata?.priority !== trigger.priority) {
          return false;
        }
        return true;

      case 'proactive_insight':
        if (trigger.agentType && payload.metadata?.agentType !== trigger.agentType) {
          return false;
        }
        return true;

      case 'shard_event':
        if (trigger.shardTypeId && payload.shardData?.shardTypeId !== trigger.shardTypeId) {
          return false;
        }
        return true;

      default:
        return true;
    }
  }

  private checkConditions(conditions: WorkflowCondition[], payload: WorkflowTriggerPayload): boolean {
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, payload)) {
        return false;
      }
    }
    return true;
  }

  private evaluateCondition(condition: WorkflowCondition, payload: WorkflowTriggerPayload): boolean {
    if (condition.type === 'time' && condition.timeConstraint) {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();

      if (condition.timeConstraint.days && !condition.timeConstraint.days.includes(day)) {
        return false;
      }
      if (condition.timeConstraint.hours) {
        if (hour < condition.timeConstraint.hours.start || hour >= condition.timeConstraint.hours.end) {
          return false;
        }
      }
    }

    if (condition.type === 'field' && condition.field) {
      const value = this.getNestedValue(payload, condition.field);

      switch (condition.operator) {
        case 'eq': return value === condition.value;
        case 'ne': return value !== condition.value;
        case 'gt': return typeof value === 'number' && value > (condition.value as number);
        case 'lt': return typeof value === 'number' && value < (condition.value as number);
        case 'contains': return typeof value === 'string' && value.includes(condition.value as string);
        case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
      }
    }

    return true;
  }

  private resolveTemplate(template: string, payload: WorkflowTriggerPayload): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(payload, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): unknown {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {return undefined;}
      current = current[part];
    }

    return current;
  }

  private async saveWorkflow(workflow: Workflow): Promise<void> {
    const key = `${this.WORKFLOWS_KEY}${workflow.tenantId}:${workflow.id}`;
    await this.redis.set(key, JSON.stringify(workflow));
  }

  private async storeRun(
    workflowId: string,
    tenantId: string,
    result: WorkflowResult
  ): Promise<void> {
    const key = `${this.RUNS_KEY}${tenantId}:${workflowId}`;
    await this.redis.lpush(key, JSON.stringify(result));
    await this.redis.ltrim(key, 0, 99); // Keep last 100 runs
  }

  /**
   * Get workflow run history
   */
  async getRunHistory(
    workflowId: string,
    tenantId: string,
    limit = 20
  ): Promise<WorkflowResult[]> {
    const key = `${this.RUNS_KEY}${tenantId}:${workflowId}`;
    const runs = await this.redis.lrange(key, 0, limit - 1);
    return runs.map(r => JSON.parse(r));
  }
}

// ============================================
// Factory
// ============================================

export function createWorkflowAutomationService(
  redis: Redis,
  shardRepository: ShardRepository,
  monitoring: IMonitoringProvider
): WorkflowAutomationService {
  return new WorkflowAutomationService(redis, shardRepository, monitoring);
}












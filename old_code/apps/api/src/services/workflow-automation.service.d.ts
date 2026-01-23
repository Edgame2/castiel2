/**
 * Workflow Automation Service
 * Connects AI insights to automated actions like task creation, notifications, and webhooks
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
export interface Workflow {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    trigger: WorkflowTrigger;
    conditions?: WorkflowCondition[];
    actions: WorkflowAction[];
    isActive: boolean;
    runOnce?: boolean;
    hasRun?: boolean;
    maxRuns?: number;
    currentRuns?: number;
    lastTriggeredAt?: Date;
    lastResult?: WorkflowResult;
    createdAt: Date;
    createdBy: string;
}
export type WorkflowTrigger = {
    type: 'insight_generated';
    insightType?: string;
    priority?: string;
} | {
    type: 'proactive_insight';
    agentType?: string;
    priority?: string;
} | {
    type: 'feedback_received';
    rating?: 'positive' | 'negative';
} | {
    type: 'schedule_completed';
    scheduleId?: string;
} | {
    type: 'shard_event';
    event: 'created' | 'updated' | 'deleted';
    shardTypeId?: string;
} | {
    type: 'threshold_crossed';
    metric: string;
    threshold: number;
    direction: 'above' | 'below';
} | {
    type: 'manual';
};
export interface WorkflowCondition {
    id: string;
    type: 'field' | 'expression' | 'time';
    field?: string;
    operator?: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
    value?: unknown;
    timeConstraint?: {
        days?: number[];
        hours?: {
            start: number;
            end: number;
        };
    };
    expression?: string;
}
export type WorkflowAction = CreateTaskAction | SendNotificationAction | SendEmailAction | CallWebhookAction | UpdateShardAction | CreateShardAction | AssignUserAction | AddTagAction | TriggerWorkflowAction;
export interface CreateTaskAction {
    type: 'create_task';
    config: {
        title: string;
        description?: string;
        assignTo?: string;
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
        recipients: string[];
        priority?: 'low' | 'medium' | 'high';
        actionUrl?: string;
    };
}
export interface SendEmailAction {
    type: 'send_email';
    config: {
        to: string[];
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
        shardId?: string;
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
    trigger: string;
    insightId?: string;
    insightContent?: string;
    shardId?: string;
    shardData?: Record<string, unknown>;
    feedbackId?: string;
    scheduleId?: string;
    metadata?: Record<string, unknown>;
}
export declare class WorkflowAutomationService {
    private readonly redis;
    private readonly shardRepository;
    private readonly monitoring;
    private readonly WORKFLOWS_KEY;
    private readonly RUNS_KEY;
    constructor(redis: Redis, shardRepository: ShardRepository, monitoring: IMonitoringProvider);
    /**
     * Create a workflow
     */
    createWorkflow(tenantId: string, workflow: Omit<Workflow, 'id' | 'createdAt' | 'lastTriggeredAt' | 'lastResult' | 'hasRun' | 'currentRuns'>): Promise<Workflow>;
    /**
     * Update a workflow
     */
    updateWorkflow(workflowId: string, tenantId: string, updates: Partial<Workflow>): Promise<Workflow | null>;
    /**
     * Delete a workflow
     */
    deleteWorkflow(workflowId: string, tenantId: string): Promise<boolean>;
    /**
     * Get workflow by ID
     */
    getWorkflow(workflowId: string, tenantId: string): Promise<Workflow | null>;
    /**
     * List workflows
     */
    listWorkflows(tenantId: string): Promise<Workflow[]>;
    /**
     * Trigger workflows for an event
     */
    triggerWorkflows(triggerType: string, payload: WorkflowTriggerPayload): Promise<WorkflowResult[]>;
    /**
     * Manually trigger a specific workflow
     */
    triggerManually(workflowId: string, tenantId: string, payload: Partial<WorkflowTriggerPayload>): Promise<WorkflowResult>;
    private executeWorkflow;
    private executeAction;
    private executeCreateTask;
    private executeSendNotification;
    private executeSendEmail;
    private executeCallWebhook;
    private executeUpdateShard;
    private executeCreateShard;
    private executeAddTag;
    private executeTriggerWorkflow;
    private matchesTrigger;
    private checkConditions;
    private evaluateCondition;
    private resolveTemplate;
    private getNestedValue;
    private saveWorkflow;
    private storeRun;
    /**
     * Get workflow run history
     */
    getRunHistory(workflowId: string, tenantId: string, limit?: number): Promise<WorkflowResult[]>;
}
export declare function createWorkflowAutomationService(redis: Redis, shardRepository: ShardRepository, monitoring: IMonitoringProvider): WorkflowAutomationService;
//# sourceMappingURL=workflow-automation.service.d.ts.map
/**
 * Workflow Automation Service
 * Connects AI insights to automated actions like task creation, notifications, and webhooks
 */
import { ShardStatus } from '../types/shard.types.js';
import { v4 as uuid } from 'uuid';
// ============================================
// Service
// ============================================
export class WorkflowAutomationService {
    redis;
    shardRepository;
    monitoring;
    WORKFLOWS_KEY = 'workflows:';
    RUNS_KEY = 'workflow:runs:';
    constructor(redis, shardRepository, monitoring) {
        this.redis = redis;
        this.shardRepository = shardRepository;
        this.monitoring = monitoring;
    }
    // ============================================
    // Workflow Management
    // ============================================
    /**
     * Create a workflow
     */
    async createWorkflow(tenantId, workflow) {
        const newWorkflow = {
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
    async updateWorkflow(workflowId, tenantId, updates) {
        const workflow = await this.getWorkflow(workflowId, tenantId);
        if (!workflow) {
            return null;
        }
        const updated = {
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
    async deleteWorkflow(workflowId, tenantId) {
        const key = `${this.WORKFLOWS_KEY}${tenantId}:${workflowId}`;
        const deleted = await this.redis.del(key);
        return deleted > 0;
    }
    /**
     * Get workflow by ID
     */
    async getWorkflow(workflowId, tenantId) {
        const key = `${this.WORKFLOWS_KEY}${tenantId}:${workflowId}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    /**
     * List workflows
     */
    async listWorkflows(tenantId) {
        const pattern = `${this.WORKFLOWS_KEY}${tenantId}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length === 0) {
            return [];
        }
        const workflows = [];
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                workflows.push(JSON.parse(data));
            }
        }
        return workflows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    // ============================================
    // Trigger Handling
    // ============================================
    /**
     * Trigger workflows for an event
     */
    async triggerWorkflows(triggerType, payload) {
        const workflows = await this.listWorkflows(payload.tenantId);
        const results = [];
        for (const workflow of workflows) {
            if (!workflow.isActive) {
                continue;
            }
            if (workflow.trigger.type !== triggerType) {
                continue;
            }
            // Check trigger-specific filters
            if (!this.matchesTrigger(workflow.trigger, payload)) {
                continue;
            }
            // Check conditions
            if (!this.checkConditions(workflow.conditions || [], payload)) {
                continue;
            }
            // Check run limits
            if (workflow.runOnce && workflow.hasRun) {
                continue;
            }
            if (workflow.maxRuns && (workflow.currentRuns || 0) >= workflow.maxRuns) {
                continue;
            }
            // Execute workflow
            const result = await this.executeWorkflow(workflow, payload);
            results.push(result);
        }
        return results;
    }
    /**
     * Manually trigger a specific workflow
     */
    async triggerManually(workflowId, tenantId, payload) {
        const workflow = await this.getWorkflow(workflowId, tenantId);
        if (!workflow) {
            throw new Error('Workflow not found');
        }
        const fullPayload = {
            tenantId,
            trigger: 'manual',
            ...payload,
        };
        return this.executeWorkflow(workflow, fullPayload);
    }
    // ============================================
    // Execution
    // ============================================
    async executeWorkflow(workflow, payload) {
        const runId = uuid();
        const startTime = Date.now();
        const actionResults = [];
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
            }
            catch (error) {
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
        const result = {
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
    async executeAction(action, payload) {
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
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }
    // ============================================
    // Action Implementations
    // ============================================
    async executeCreateTask(config, payload) {
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
    async executeSendNotification(config, payload) {
        const title = this.resolveTemplate(config.title, payload);
        const message = this.resolveTemplate(config.message, payload);
        // Would integrate with notification service
        const sent = config.recipients.length;
        return { sent };
    }
    async executeSendEmail(config, payload) {
        const subject = this.resolveTemplate(config.subject, payload);
        const body = this.resolveTemplate(config.body, payload);
        // Would integrate with email service
        return { sent: config.to.length };
    }
    async executeCallWebhook(config, payload) {
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
        }
        catch {
            parsedBody = responseBody;
        }
        if (!response.ok) {
            throw new Error(`Webhook failed with status ${response.status}`);
        }
        return { status: response.status, body: parsedBody };
    }
    async executeUpdateShard(config, payload) {
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
    async executeCreateShard(config, payload) {
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
    async executeAddTag(config, payload) {
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
    async executeTriggerWorkflow(config, payload) {
        return this.triggerManually(config.workflowId, payload.tenantId, config.passPayload ? payload : {});
    }
    // ============================================
    // Helpers
    // ============================================
    matchesTrigger(trigger, payload) {
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
    checkConditions(conditions, payload) {
        for (const condition of conditions) {
            if (!this.evaluateCondition(condition, payload)) {
                return false;
            }
        }
        return true;
    }
    evaluateCondition(condition, payload) {
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
                case 'gt': return typeof value === 'number' && value > condition.value;
                case 'lt': return typeof value === 'number' && value < condition.value;
                case 'contains': return typeof value === 'string' && value.includes(condition.value);
                case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
            }
        }
        return true;
    }
    resolveTemplate(template, payload) {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.getNestedValue(payload, path.trim());
            return value !== undefined ? String(value) : match;
        });
    }
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    async saveWorkflow(workflow) {
        const key = `${this.WORKFLOWS_KEY}${workflow.tenantId}:${workflow.id}`;
        await this.redis.set(key, JSON.stringify(workflow));
    }
    async storeRun(workflowId, tenantId, result) {
        const key = `${this.RUNS_KEY}${tenantId}:${workflowId}`;
        await this.redis.lpush(key, JSON.stringify(result));
        await this.redis.ltrim(key, 0, 99); // Keep last 100 runs
    }
    /**
     * Get workflow run history
     */
    async getRunHistory(workflowId, tenantId, limit = 20) {
        const key = `${this.RUNS_KEY}${tenantId}:${workflowId}`;
        const runs = await this.redis.lrange(key, 0, limit - 1);
        return runs.map(r => JSON.parse(r));
    }
}
// ============================================
// Factory
// ============================================
export function createWorkflowAutomationService(redis, shardRepository, monitoring) {
    return new WorkflowAutomationService(redis, shardRepository, monitoring);
}
//# sourceMappingURL=workflow-automation.service.js.map
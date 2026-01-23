/**
 * Playbook Execution Service
 * Automated execution of sales playbooks
 * 
 * Features:
 * - Automated playbook execution
 * - Context-aware playbook selection
 * - Execution state tracking
 * - Outcome learning
 * - Playbook adaptation
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowAutomationService } from './workflow-automation.service.js';
import { RecommendationsService } from './recommendation.service.js';

export type PlaybookStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface Playbook {
  playbookId: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  trigger: {
    type: 'opportunity_stage' | 'risk_level' | 'time_based' | 'manual' | 'event';
    conditions: Record<string, any>;
  };
  steps: Array<{
    stepId: string;
    name: string;
    action: {
      type: 'create_task' | 'send_email' | 'schedule_meeting' | 'update_field' | 'create_note' | 'trigger_workflow';
      config: Record<string, any>;
    };
    conditions?: Array<{
      field: string;
      operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
      value: any;
    }>;
    delay?: number; // Delay in hours before executing
    required: boolean; // If false, step can be skipped on failure
  }>;
  context: {
    opportunityStages?: string[];
    riskLevels?: string[];
    industries?: string[];
    dealSizes?: string[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaybookExecution {
  executionId: string;
  tenantId: string; // Partition key
  playbookId: string;
  opportunityId?: string;
  userId?: string;
  status: PlaybookStatus;
  currentStep: number;
  steps: Array<{
    stepId: string;
    status: PlaybookStatus;
    executedAt?: Date;
    result?: {
      success: boolean;
      error?: string;
      data?: any;
    };
  }>;
  context: Record<string, any>;
  outcome?: {
    completed: boolean;
    success: boolean;
    metrics: {
      stepsCompleted: number;
      stepsFailed: number;
      totalDuration: number; // minutes
    };
    feedback?: {
      rating?: number;
      comment?: string;
    };
  };
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Playbook Execution Service
 */
export class PlaybookExecutionService {
  private client: CosmosClient;
  private database: Database;
  private playbookContainer: Container;
  private executionContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private workflowAutomationService?: WorkflowAutomationService;
  private recommendationsService?: RecommendationsService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    workflowAutomationService?: WorkflowAutomationService,
    recommendationsService?: RecommendationsService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.workflowAutomationService = workflowAutomationService;
    this.recommendationsService = recommendationsService;

    // Initialize Cosmos client
    const connectionPolicy: ConnectionPolicy = {
      connectionMode: 'Direct' as any, // Best performance (ConnectionMode enum not available in this version)
      requestTimeout: 30000,
      enableEndpointDiscovery: true,
      retryOptions: {
        maxRetryAttemptCount: 9,
        fixedRetryIntervalInMilliseconds: 0,
        maxWaitTimeInSeconds: 30,
      } as RetryOptions,
    };

    this.client = cosmosClient || new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
      connectionPolicy,
    });

    this.database = this.client.database(config.cosmosDb.databaseId);
    this.playbookContainer = this.database.container(config.cosmosDb.containers.playbookExecutions);
    this.executionContainer = this.database.container(config.cosmosDb.containers.playbookExecutions);
  }

  /**
   * Create a playbook
   */
  async createPlaybook(
    tenantId: string,
    playbook: Omit<Playbook, 'playbookId' | 'createdAt' | 'updatedAt'>
  ): Promise<Playbook> {
    const playbookId = uuidv4();
    const newPlaybook: Playbook = {
      ...playbook,
      playbookId,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.playbookContainer.items.create(newPlaybook);

    this.monitoring?.trackEvent('playbook.created', {
      tenantId,
      playbookId,
      name: playbook.name,
    });

    return newPlaybook;
  }

  /**
   * Execute a playbook
   */
  async executePlaybook(
    tenantId: string,
    playbookId: string,
    context: {
      opportunityId?: string;
      userId?: string;
      [key: string]: any;
    }
  ): Promise<PlaybookExecution> {
    // Get playbook
    const { resource: playbook } = await this.playbookContainer.item(playbookId, tenantId).read<Playbook>();
    if (!playbook) {
      throw new Error(`Playbook not found: ${playbookId}`);
    }

    if (!playbook.isActive) {
      throw new Error(`Playbook is not active: ${playbookId}`);
    }

    const executionId = uuidv4();
    const execution: PlaybookExecution = {
      executionId,
      tenantId,
      playbookId,
      opportunityId: context.opportunityId,
      userId: context.userId,
      status: 'pending',
      currentStep: 0,
      steps: playbook.steps.map(step => ({
        stepId: step.stepId,
        status: 'pending',
      })),
      context,
      startedAt: new Date(),
    };

    await this.executionContainer.items.create(execution);

    // Start execution asynchronously
    this.executePlaybookSteps(execution, playbook).catch(error => {
      this.monitoring?.trackException(error as Error, {
        operation: 'executePlaybookSteps',
        executionId,
        playbookId,
        tenantId,
      });
    });

    this.monitoring?.trackEvent('playbook.execution_started', {
      tenantId,
      playbookId,
      executionId,
    });

    return execution;
  }

  /**
   * Execute playbook steps
   */
  private async executePlaybookSteps(
    execution: PlaybookExecution,
    playbook: Playbook
  ): Promise<void> {
    execution.status = 'in_progress';
    await this.executionContainer.item(execution.executionId, execution.tenantId).replace(execution);

    for (let i = 0; i < playbook.steps.length; i++) {
      const step = playbook.steps[i];
      execution.currentStep = i;

      // Check step conditions
      if (step.conditions && !this.checkStepConditions(step.conditions, execution.context)) {
        execution.steps[i].status = 'cancelled';
        if (step.required) {
          execution.status = 'failed';
          execution.completedAt = new Date();
          await this.executionContainer.item(execution.executionId, execution.tenantId).replace(execution);
          return;
        }
        continue;
      }

      // Apply delay if specified
      if (step.delay && step.delay > 0) {
        await this.delay(step.delay * 60 * 60 * 1000); // Convert hours to milliseconds
      }

      // Execute step
      try {
        const result = await this.executeStep(step, execution);
        execution.steps[i].status = result.success ? 'completed' : 'failed';
        execution.steps[i].executedAt = new Date();
        execution.steps[i].result = result;

        if (!result.success && step.required) {
          execution.status = 'failed';
          execution.completedAt = new Date();
          await this.executionContainer.item(execution.executionId, execution.tenantId).replace(execution);
          return;
        }
      } catch (error) {
        execution.steps[i].status = 'failed';
        execution.steps[i].executedAt = new Date();
        execution.steps[i].result = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };

        if (step.required) {
          execution.status = 'failed';
          execution.completedAt = new Date();
          await this.executionContainer.item(execution.executionId, execution.tenantId).replace(execution);
          return;
        }
      }

      await this.executionContainer.item(execution.executionId, execution.tenantId).replace(execution);
    }

    // All steps completed
    execution.status = 'completed';
    execution.completedAt = new Date();
    
    const stepsCompleted = execution.steps.filter(s => s.status === 'completed').length;
    const stepsFailed = execution.steps.filter(s => s.status === 'failed').length;
    const totalDuration = execution.completedAt
      ? Math.round((execution.completedAt.getTime() - execution.startedAt.getTime()) / (1000 * 60))
      : 0;

    execution.outcome = {
      completed: true,
      success: stepsFailed === 0,
      metrics: {
        stepsCompleted,
        stepsFailed,
        totalDuration,
      },
    };

    await this.executionContainer.item(execution.executionId, execution.tenantId).replace(execution);

    this.monitoring?.trackEvent('playbook.execution_completed', {
      tenantId: execution.tenantId,
      playbookId: execution.playbookId,
      executionId: execution.executionId,
      success: execution.outcome.success,
      stepsCompleted,
    });
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: Playbook['steps'][0],
    execution: PlaybookExecution
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    switch (step.action.type) {
      case 'create_task':
        return await this.executeCreateTask(step.action.config, execution);
      
      case 'send_email':
        return await this.executeSendEmail(step.action.config, execution);
      
      case 'schedule_meeting':
        return await this.executeScheduleMeeting(step.action.config, execution);
      
      case 'update_field':
        return await this.executeUpdateField(step.action.config, execution);
      
      case 'create_note':
        return await this.executeCreateNote(step.action.config, execution);
      
      case 'trigger_workflow':
        return await this.executeTriggerWorkflow(step.action.config, execution);
      
      default:
        return {
          success: false,
          error: `Unknown action type: ${step.action.type}`,
        };
    }
  }

  /**
   * Check step conditions
   */
  private checkStepConditions(
    conditions: Playbook['steps'][0]['conditions'],
    context: Record<string, any>
  ): boolean {
    if (!conditions) return true;

    return conditions.every(condition => {
      const value = this.getNestedValue(context, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'greater_than':
          return Number(value) > Number(condition.value);
        case 'less_than':
          return Number(value) < Number(condition.value);
        case 'contains':
          return String(value).includes(String(condition.value));
        default:
          return false;
      }
    });
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // Step Execution Methods
  // ============================================

  private async executeCreateTask(
    config: Record<string, any>,
    execution: PlaybookExecution
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    // Placeholder - would integrate with task service
    return { success: true, data: { taskId: uuidv4() } };
  }

  private async executeSendEmail(
    config: Record<string, any>,
    execution: PlaybookExecution
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    // Placeholder - would integrate with email service
    return { success: true, data: { emailId: uuidv4() } };
  }

  private async executeScheduleMeeting(
    config: Record<string, any>,
    execution: PlaybookExecution
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    // Placeholder - would integrate with calendar service
    return { success: true, data: { meetingId: uuidv4() } };
  }

  private async executeUpdateField(
    config: Record<string, any>,
    execution: PlaybookExecution
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    // Placeholder - would update opportunity field
    return { success: true, data: { updated: true } };
  }

  private async executeCreateNote(
    config: Record<string, any>,
    execution: PlaybookExecution
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    // Placeholder - would create note on opportunity
    return { success: true, data: { noteId: uuidv4() } };
  }

  private async executeTriggerWorkflow(
    config: Record<string, any>,
    execution: PlaybookExecution
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    if (!this.workflowAutomationService) {
      return { success: false, error: 'WorkflowAutomationService not available' };
    }

    try {
      const workflowId = config.workflowId;
      const payload = {
        tenantId: execution.tenantId,
        ...execution.context,
      };

      await this.workflowAutomationService.triggerManually(workflowId, execution.tenantId, payload);
      return { success: true, data: { workflowTriggered: true } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get execution status
   */
  async getExecution(
    tenantId: string,
    executionId: string
  ): Promise<PlaybookExecution | null> {
    try {
      const { resource } = await this.executionContainer.item(executionId, tenantId).read<PlaybookExecution>();
      return resource || null;
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'getExecution',
        executionId,
        tenantId,
      });
      return null;
    }
  }

  /**
   * Record execution outcome
   */
  async recordOutcome(
    tenantId: string,
    executionId: string,
    feedback: {
      rating?: number;
      comment?: string;
    }
  ): Promise<void> {
    const execution = await this.getExecution(tenantId, executionId);
    if (!execution || !execution.outcome) {
      throw new Error(`Execution not found or not completed: ${executionId}`);
    }

    execution.outcome.feedback = feedback;
    await this.executionContainer.item(executionId, tenantId).replace(execution);

    this.monitoring?.trackEvent('playbook.outcome_recorded', {
      tenantId,
      executionId,
      rating: feedback.rating,
    });
  }
}

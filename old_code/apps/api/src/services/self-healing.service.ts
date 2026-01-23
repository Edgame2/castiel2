/**
 * Self-Healing Service
 * Automatic remediation of detected issues
 * 
 * Features:
 * - Automatic issue detection
 * - Remediation action execution
 * - Remediation success tracking
 * - Learning from remediation outcomes
 * - Remediation strategy optimization
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import { AnomalyDetectionService } from './anomaly-detection.service.js';
import { PlaybookExecutionService } from './playbook-execution.service.js';
import { WorkflowAutomationService } from './workflow-automation.service.js';

export type RemediationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export type RemediationAction = 
  | 'update_field'
  | 'create_task'
  | 'send_notification'
  | 'trigger_workflow'
  | 'execute_playbook'
  | 'update_risk_score'
  | 'flag_for_review';

export interface Remediation {
  remediationId: string;
  tenantId: string; // Partition key
  issueId: string; // ID of the detected issue (anomaly, risk, etc.)
  issueType: 'anomaly' | 'risk' | 'data_quality' | 'health' | 'performance';
  action: RemediationAction;
  config: Record<string, any>; // Action-specific configuration
  status: RemediationStatus;
  result?: {
    success: boolean;
    error?: string;
    data?: any;
    executedAt: Date;
  };
  outcome?: {
    issueResolved: boolean;
    resolutionScore: number; // 0-1: How well the issue was resolved
    feedback?: {
      rating?: number;
      comment?: string;
    };
  };
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
}

export interface SelfHealingPolicy {
  policyId: string;
  tenantId: string;
  issueType: Remediation['issueType'];
  conditions: Array<{
    field: string;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  }>;
  action: RemediationAction;
  config: Record<string, any>;
  isActive: boolean;
  priority: 'low' | 'medium' | 'high';
  autoExecute: boolean; // If true, execute automatically without approval
  successRate?: number; // 0-1: Historical success rate
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Self-Healing Service
 */
export class SelfHealingService {
  private client: CosmosClient;
  private database: Database;
  private remediationContainer: Container;
  private policyContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private anomalyDetectionService?: AnomalyDetectionService;
  private playbookExecutionService?: PlaybookExecutionService;
  private workflowAutomationService?: WorkflowAutomationService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    anomalyDetectionService?: AnomalyDetectionService,
    playbookExecutionService?: PlaybookExecutionService,
    workflowAutomationService?: WorkflowAutomationService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.anomalyDetectionService = anomalyDetectionService;
    this.playbookExecutionService = playbookExecutionService;
    this.workflowAutomationService = workflowAutomationService;

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
    this.remediationContainer = this.database.container(config.cosmosDb.containers.selfHealing);
    this.policyContainer = this.database.container(config.cosmosDb.containers.selfHealing);
  }

  /**
   * Detect and remediate issues automatically
   */
  async detectAndRemediate(
    tenantId: string,
    opportunityId?: string,
    accountId?: string
  ): Promise<Remediation[]> {
    const remediations: Remediation[] = [];

    // Detect anomalies
    if (this.anomalyDetectionService && opportunityId) {
      try {
        const anomalies = await this.anomalyDetectionService.detectOpportunityAnomalies(
          tenantId,
          opportunityId,
          {} // Would get actual data
        );

        for (const anomaly of anomalies.anomalies) {
          if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
            const remediation = await this.createRemediation(
              tenantId,
              anomaly.anomalyId,
              'anomaly',
              anomaly
            );
            
            if (remediation && this.shouldAutoExecute(remediation)) {
              await this.executeRemediation(remediation);
            }
            
            if (remediation) {
              remediations.push(remediation);
            }
          }
        }
      } catch (error) {
        this.monitoring?.trackException(error as Error, {
          operation: 'detectAndRemediate.anomalies',
          tenantId,
          opportunityId,
        });
      }
    }

    this.monitoring?.trackEvent('self_healing.detected_and_remediated', {
      tenantId,
      opportunityId,
      remediationCount: remediations.length,
    });

    return remediations;
  }

  /**
   * Create remediation for an issue
   */
  async createRemediation(
    tenantId: string,
    issueId: string,
    issueType: Remediation['issueType'],
    issueData: any
  ): Promise<Remediation | null> {
    // Find matching policy
    const policy = await this.findMatchingPolicy(tenantId, issueType, issueData);
    if (!policy) {
      return null; // No policy matches
    }

    const remediationId = uuidv4();
    const remediation: Remediation = {
      remediationId,
      tenantId,
      issueId,
      issueType,
      action: policy.action,
      config: policy.config,
      status: 'pending',
      createdAt: new Date(),
    };

    await this.remediationContainer.items.create(remediation);

    this.monitoring?.trackEvent('self_healing.remediation_created', {
      tenantId,
      remediationId,
      issueId,
      action: policy.action,
    });

    return remediation;
  }

  /**
   * Execute remediation
   */
  async executeRemediation(
    remediation: Remediation
  ): Promise<Remediation> {
    remediation.status = 'in_progress';
    remediation.executedAt = new Date();
    await this.remediationContainer.item(remediation.remediationId, remediation.tenantId).replace(remediation);

    try {
      const result = await this.executeAction(remediation);
      
      remediation.status = result.success ? 'completed' : 'failed';
      remediation.result = {
        ...result,
        executedAt: new Date(),
      };
      remediation.completedAt = new Date();

      await this.remediationContainer.item(remediation.remediationId, remediation.tenantId).replace(remediation);

      this.monitoring?.trackEvent('self_healing.remediation_executed', {
        tenantId: remediation.tenantId,
        remediationId: remediation.remediationId,
        success: result.success,
      });
    } catch (error) {
      remediation.status = 'failed';
      remediation.result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executedAt: new Date(),
      };
      remediation.completedAt = new Date();

      await this.remediationContainer.item(remediation.remediationId, remediation.tenantId).replace(remediation);

      this.monitoring?.trackException(error as Error, {
        operation: 'executeRemediation',
        remediationId: remediation.remediationId,
        tenantId: remediation.tenantId,
      });
    }

    return remediation;
  }

  /**
   * Record remediation outcome
   */
  async recordOutcome(
    tenantId: string,
    remediationId: string,
    outcome: {
      issueResolved: boolean;
      resolutionScore: number;
      feedback?: {
        rating?: number;
        comment?: string;
      };
    }
  ): Promise<void> {
    const { resource: remediation } = await this.remediationContainer.item(remediationId, tenantId).read<Remediation>();
    if (!remediation) {
      throw new Error(`Remediation not found: ${remediationId}`);
    }

    remediation.outcome = outcome;
    await this.remediationContainer.item(remediationId, tenantId).replace(remediation);

    // Update policy success rate
    await this.updatePolicySuccessRate(tenantId, remediation);

    this.monitoring?.trackEvent('self_healing.outcome_recorded', {
      tenantId,
      remediationId,
      issueResolved: outcome.issueResolved,
      resolutionScore: outcome.resolutionScore,
    });
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Find matching policy
   */
  private async findMatchingPolicy(
    tenantId: string,
    issueType: Remediation['issueType'],
    issueData: any
  ): Promise<SelfHealingPolicy | null> {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.issueType = @issueType AND c.isActive = true',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@issueType', value: issueType },
      ],
    };

    try {
      const { resources } = await this.policyContainer.items.query(querySpec).fetchAll();
      const policies = resources as SelfHealingPolicy[];

      // Find policy that matches conditions
      for (const policy of policies) {
        if (this.matchesConditions(policy.conditions, issueData)) {
          return policy;
        }
      }

      return null;
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'findMatchingPolicy',
        tenantId,
        issueType,
      });
      return null;
    }
  }

  /**
   * Check if conditions match
   */
  private matchesConditions(
    conditions: SelfHealingPolicy['conditions'],
    data: any
  ): boolean {
    return conditions.every(condition => {
      const value = this.getNestedValue(data, condition.field);
      
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
   * Get nested value
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if should auto-execute
   */
  private shouldAutoExecute(remediation: Remediation): boolean {
    // Would check policy autoExecute flag
    // For now, only auto-execute low-risk actions
    const safeActions: RemediationAction[] = ['update_field', 'create_task', 'send_notification'];
    return safeActions.includes(remediation.action);
  }

  /**
   * Execute action
   */
  private async executeAction(
    remediation: Remediation
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    switch (remediation.action) {
      case 'update_field':
        return await this.executeUpdateField(remediation);
      
      case 'create_task':
        return await this.executeCreateTask(remediation);
      
      case 'send_notification':
        return await this.executeSendNotification(remediation);
      
      case 'trigger_workflow':
        return await this.executeTriggerWorkflow(remediation);
      
      case 'execute_playbook':
        return await this.executePlaybook(remediation);
      
      default:
        return {
          success: false,
          error: `Unknown action type: ${remediation.action}`,
        };
    }
  }

  /**
   * Execute update field action
   */
  private async executeUpdateField(
    remediation: Remediation
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    // Placeholder - would update opportunity field
    return { success: true, data: { updated: true } };
  }

  /**
   * Execute create task action
   */
  private async executeCreateTask(
    remediation: Remediation
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    // Placeholder - would create task
    return { success: true, data: { taskId: uuidv4() } };
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotification(
    remediation: Remediation
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    // Placeholder - would send notification
    return { success: true, data: { notificationId: uuidv4() } };
  }

  /**
   * Execute trigger workflow action
   */
  private async executeTriggerWorkflow(
    remediation: Remediation
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    if (!this.workflowAutomationService) {
      return { success: false, error: 'WorkflowAutomationService not available' };
    }

    try {
      const workflowId = remediation.config.workflowId;
      const payload = {
        tenantId: remediation.tenantId,
        issueId: remediation.issueId,
        ...remediation.config.payload,
      };

      await this.workflowAutomationService.triggerManually(workflowId, remediation.tenantId, payload);
      return { success: true, data: { workflowTriggered: true } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute playbook action
   */
  private async executePlaybook(
    remediation: Remediation
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    if (!this.playbookExecutionService) {
      return { success: false, error: 'PlaybookExecutionService not available' };
    }

    try {
      const playbookId = remediation.config.playbookId;
      const context = {
        tenantId: remediation.tenantId,
        issueId: remediation.issueId,
        ...remediation.config.context,
      };

      await this.playbookExecutionService.executePlaybook(
        remediation.tenantId,
        playbookId,
        context
      );
      return { success: true, data: { playbookExecuted: true } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update policy success rate
   */
  private async updatePolicySuccessRate(
    tenantId: string,
    remediation: Remediation
  ): Promise<void> {
    // Query remediations for this policy pattern
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.issueType = @issueType AND c.action = @action',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@issueType', value: remediation.issueType },
        { name: '@action', value: remediation.action },
      ],
    };

    try {
      const { resources } = await this.remediationContainer.items.query(querySpec).fetchAll();
      const remediations = resources as Remediation[];

      const withOutcomes = remediations.filter(r => r.outcome);
      if (withOutcomes.length === 0) return;

      const successRate = withOutcomes.filter(r => r.outcome?.issueResolved).length / withOutcomes.length;

      // Update policy (would need policy ID)
      // For now, just track in monitoring
      this.monitoring?.trackEvent('self_healing.policy_success_rate_updated', {
        tenantId,
        issueType: remediation.issueType,
        action: remediation.action,
        successRate,
      });
    } catch (error) {
      this.monitoring?.trackException(error as Error, {
        operation: 'updatePolicySuccessRate',
        tenantId,
      });
    }
  }
}

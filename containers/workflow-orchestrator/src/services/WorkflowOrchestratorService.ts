/**
 * Workflow Orchestrator Service
 * Coordinates asynchronous workflows for opportunity analysis
 * Orchestrates parallel execution of: Risk Analysis, Risk Scoring, Forecasting, Recommendations
 */

import { getContainer } from '@coder/shared/database';
import { log } from '../utils/logger';
import {
  Workflow,
  WorkflowResults,
  WorkflowStepType,
} from '../types/workflow.types';
import { publishWorkflowEvent } from '../events/publishers/WorkflowOrchestratorEventPublisher';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowOrchestratorService {
  private activeWorkflows = new Map<string, Workflow>();

  constructor() {}

  /**
   * Start opportunity analysis workflow
   */
  async startOpportunityAnalysisWorkflow(
    opportunityId: string,
    tenantId: string,
    trigger?: 'integration.opportunity.updated' | 'shard.updated' | 'manual'
  ): Promise<Workflow> {
    const workflowId = uuidv4();

    try {
      log.info('Starting opportunity analysis workflow', {
        workflowId,
        opportunityId,
        tenantId,
        trigger,
        service: 'workflow-orchestrator',
      });

      // Create workflow
      const workflow: Workflow = {
        workflowId,
        tenantId,
        opportunityId,
        status: 'running',
        steps: [
          {
            stepId: uuidv4(),
            workflowId,
            stepType: 'risk_analysis',
            status: 'pending',
          },
          {
            stepId: uuidv4(),
            workflowId,
            stepType: 'risk_scoring',
            status: 'pending',
          },
          {
            stepId: uuidv4(),
            workflowId,
            stepType: 'forecast',
            status: 'pending',
          },
          {
            stepId: uuidv4(),
            workflowId,
            stepType: 'recommendation',
            status: 'pending',
          },
        ],
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store workflow
      await this.storeWorkflow(workflow, tenantId);

      // Track active workflow
      this.activeWorkflows.set(workflowId, workflow);

      // Publish started event
      await publishWorkflowEvent('workflow.opportunity.analysis.started', tenantId, {
        workflowId,
        opportunityId,
        timestamp: new Date().toISOString(),
      });

      // Publish parallel workflow step events
      await this.publishWorkflowStepEvents(workflow, tenantId);

      return workflow;
    } catch (error: any) {
      log.error('Failed to start workflow', error, {
        workflowId,
        opportunityId,
        tenantId,
        service: 'workflow-orchestrator',
      });
      throw error;
    }
  }

  /**
   * Publish workflow step events to trigger parallel execution
   */
  private async publishWorkflowStepEvents(workflow: Workflow, tenantId: string): Promise<void> {
    for (const step of workflow.steps) {
      try {
        switch (step.stepType) {
          case 'risk_analysis':
            await publishWorkflowEvent('workflow.risk.analysis.requested', tenantId, {
              workflowId: workflow.workflowId,
              opportunityId: workflow.opportunityId,
              stepId: step.stepId,
            });
            step.status = 'running';
            step.startedAt = new Date();
            break;

          case 'risk_scoring':
            await publishWorkflowEvent('workflow.risk.scoring.requested', tenantId, {
              workflowId: workflow.workflowId,
              opportunityId: workflow.opportunityId,
              stepId: step.stepId,
            });
            step.status = 'running';
            step.startedAt = new Date();
            break;

          case 'forecast':
            await publishWorkflowEvent('workflow.forecast.requested', tenantId, {
              workflowId: workflow.workflowId,
              opportunityId: workflow.opportunityId,
              stepId: step.stepId,
            });
            step.status = 'running';
            step.startedAt = new Date();
            break;

          case 'recommendation':
            await publishWorkflowEvent('workflow.recommendation.requested', tenantId, {
              workflowId: workflow.workflowId,
              opportunityId: workflow.opportunityId,
              stepId: step.stepId,
            });
            step.status = 'running';
            step.startedAt = new Date();
            break;
        }
      } catch (error: any) {
        log.error('Failed to publish workflow step event', error, {
          workflowId: workflow.workflowId,
          stepId: step.stepId,
          stepType: step.stepType,
          service: 'workflow-orchestrator',
        });
        step.status = 'failed';
        step.error = error.message;
      }
    }

    // Update workflow
    await this.updateWorkflow(workflow, tenantId);
  }

  /**
   * Handle workflow step completion
   */
  async handleStepCompletion(
    workflowId: string,
    stepType: WorkflowStepType,
    result: any,
    tenantId: string
  ): Promise<void> {
    try {
      const workflow = await this.getWorkflow(workflowId, tenantId);
      if (!workflow) {
        log.warn('Workflow not found for step completion', {
          workflowId,
          stepType,
          tenantId,
          service: 'workflow-orchestrator',
        });
        return;
      }

      // Find and update step
      const step = workflow.steps.find(s => s.stepType === stepType);
      if (!step) {
        log.warn('Step not found in workflow', {
          workflowId,
          stepType,
          service: 'workflow-orchestrator',
        });
        return;
      }

      step.status = 'completed';
      step.result = result;
      step.completedAt = new Date();

      // Publish step completed event
      await publishWorkflowEvent('workflow.step.completed', tenantId, {
        workflowId,
        stepId: step.stepId,
        stepType,
        result,
      });

      // Check if all steps are completed
      const allCompleted = workflow.steps.every(s => s.status === 'completed');
      const anyFailed = workflow.steps.some(s => s.status === 'failed');

      if (allCompleted) {
        // Build results
        const results: WorkflowResults = {};
        for (const s of workflow.steps) {
          if (s.result) {
            switch (s.stepType) {
              case 'risk_analysis':
                results.risk = s.result;
                break;
              case 'risk_scoring':
                results.scoring = s.result;
                break;
              case 'forecast':
                results.forecast = s.result;
                break;
              case 'recommendation':
                results.recommendations = s.result;
                break;
            }
          }
        }

        workflow.status = 'completed';
        workflow.results = results;
        workflow.completedAt = new Date();

        // Publish workflow completion event
        await publishWorkflowEvent('workflow.opportunity.analysis.completed', tenantId, {
          workflowId,
          opportunityId: workflow.opportunityId,
          results,
          timestamp: new Date().toISOString(),
        });

        log.info('Workflow completed', {
          workflowId,
          opportunityId: workflow.opportunityId,
          service: 'workflow-orchestrator',
        });
      } else if (anyFailed) {
        // Check if workflow should be marked as failed
        const criticalStepsFailed = workflow.steps
          .filter(s => s.stepType === 'risk_analysis' || s.stepType === 'forecast')
          .some(s => s.status === 'failed');

        if (criticalStepsFailed) {
          workflow.status = 'failed';
          workflow.completedAt = new Date();

          await publishWorkflowEvent('workflow.opportunity.analysis.failed', tenantId, {
            workflowId,
            opportunityId: workflow.opportunityId,
            error: 'Critical workflow steps failed',
            failedStep: workflow.steps.find(s => s.status === 'failed')?.stepType,
          });
        }
      }

      // Update workflow
      await this.updateWorkflow(workflow, tenantId);
    } catch (error: any) {
      log.error('Failed to handle step completion', error, {
        workflowId,
        stepType,
        tenantId,
        service: 'workflow-orchestrator',
      });
    }
  }

  /**
   * Handle workflow step failure
   */
  async handleStepFailure(
    workflowId: string,
    stepType: WorkflowStepType,
    error: string,
    tenantId: string
  ): Promise<void> {
    try {
      const workflow = await this.getWorkflow(workflowId, tenantId);
      if (!workflow) {
        return;
      }

      const step = workflow.steps.find(s => s.stepType === stepType);
      if (!step) {
        return;
      }

      step.status = 'failed';
      step.error = error;
      step.completedAt = new Date();

      // Check if workflow should be marked as failed
      const criticalStepsFailed = workflow.steps
        .filter(s => s.stepType === 'risk_analysis' || s.stepType === 'forecast')
        .some(s => s.status === 'failed');

      if (criticalStepsFailed) {
        workflow.status = 'failed';
        workflow.completedAt = new Date();

        await publishWorkflowEvent('workflow.opportunity.analysis.failed', tenantId, {
          workflowId,
          opportunityId: workflow.opportunityId,
          error,
          failedStep: stepType,
        });
      }

      await this.updateWorkflow(workflow, tenantId);
    } catch (err: any) {
      log.error('Failed to handle step failure', err, {
        workflowId,
        stepType,
        tenantId,
        service: 'workflow-orchestrator',
      });
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string, tenantId: string): Promise<Workflow | null> {
    try {
      // Check active workflows first
      const active = this.activeWorkflows.get(workflowId);
      if (active && active.tenantId === tenantId) {
        return active;
      }

      // Query database
      const container = getContainer('workflow_workflows');
      const { resource } = await container.item(workflowId, tenantId).read<Workflow>();

      return resource || null;
    } catch (error: any) {
      log.error('Failed to get workflow', error, {
        workflowId,
        tenantId,
        service: 'workflow-orchestrator',
      });
      return null;
    }
  }

  /**
   * Get workflows for opportunity
   */
  async getWorkflowsForOpportunity(opportunityId: string, tenantId: string): Promise<Workflow[]> {
    try {
      const container = getContainer('workflow_workflows');
      const { resources } = await container.items
        .query<Workflow>({
          query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId AND c.tenantId = @tenantId ORDER BY c.createdAt DESC',
          parameters: [
            { name: '@opportunityId', value: opportunityId },
            { name: '@tenantId', value: tenantId },
          ],
        })
        .fetchNext();

      return resources;
    } catch (error: any) {
      log.error('Failed to get workflows for opportunity', error, {
        opportunityId,
        tenantId,
        service: 'workflow-orchestrator',
      });
      return [];
    }
  }

  /**
   * Retry failed workflow
   */
  async retryWorkflow(workflowId: string, tenantId: string): Promise<Workflow> {
    try {
      const workflow = await this.getWorkflow(workflowId, tenantId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Reset failed steps
      for (const step of workflow.steps) {
        if (step.status === 'failed') {
          step.status = 'pending';
          step.error = undefined;
          step.startedAt = undefined;
          step.completedAt = undefined;
          step.result = undefined;
        }
      }

      workflow.status = 'running';
      workflow.completedAt = undefined;
      workflow.updatedAt = new Date();

      // Update workflow
      await this.updateWorkflow(workflow, tenantId);

      // Republish step events for failed steps
      await this.publishWorkflowStepEvents(workflow, tenantId);

      return workflow;
    } catch (error: any) {
      log.error('Failed to retry workflow', error, {
        workflowId,
        tenantId,
        service: 'workflow-orchestrator',
      });
      throw error;
    }
  }

  /**
   * Store workflow in database
   */
  private async storeWorkflow(workflow: Workflow, tenantId: string): Promise<void> {
    try {
      const container = getContainer('workflow_workflows');
      await container.items.create(
        {
          ...workflow,
          id: workflow.workflowId,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]
      );

      // Store steps
      const stepsContainer = getContainer('workflow_steps');
      for (const step of workflow.steps) {
        await stepsContainer.items.create(
          {
            ...step,
            id: step.stepId,
            tenantId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { partitionKey: tenantId } as Parameters<typeof stepsContainer.items.create>[1]
        );
      }
    } catch (error: any) {
      log.error('Failed to store workflow', error, {
        workflowId: workflow.workflowId,
        tenantId,
        service: 'workflow-orchestrator',
      });
      throw error;
    }
  }

  /**
   * Update workflow in database
   */
  private async updateWorkflow(workflow: Workflow, tenantId: string): Promise<void> {
    try {
      // Update active workflow
      this.activeWorkflows.set(workflow.workflowId, workflow);

      // Update in database
      const container = getContainer('workflow_workflows');
      await container.item(workflow.workflowId, tenantId).replace({
        ...workflow,
        id: workflow.workflowId,
        tenantId,
        updatedAt: new Date(),
      });

      // Update steps
      const stepsContainer = getContainer('workflow_steps');
      for (const step of workflow.steps) {
        await stepsContainer.item(step.stepId, tenantId).replace({
          ...step,
          id: step.stepId,
          tenantId,
          updatedAt: new Date(),
        });
      }
    } catch (error: any) {
      log.error('Failed to update workflow', error, {
        workflowId: workflow.workflowId,
        tenantId,
        service: 'workflow-orchestrator',
      });
    }
  }
}

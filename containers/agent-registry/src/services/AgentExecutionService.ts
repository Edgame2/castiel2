/**
 * Agent Execution Service
 * Handles agent execution and tracking
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { AgentService } from './AgentService';
import {
  AgentExecution,
  ExecuteAgentInput,
} from '../types/agent.types';

export class AgentExecutionService {
  private containerName = 'agent_executions';
  private agentService: AgentService;

  constructor(agentService: AgentService) {
    this.agentService = agentService;
  }

  /**
   * Execute agent
   * Note: This is a placeholder - actual execution would call AI Service
   */
  async execute(input: ExecuteAgentInput): Promise<AgentExecution> {
    if (!input.tenantId || !input.agentId || !input.task) {
      throw new BadRequestError('tenantId, agentId, and task are required');
    }

    // Get agent
    const agent = await this.agentService.getById(input.agentId, input.tenantId);

    if (agent.status !== 'active') {
      throw new BadRequestError(`Agent ${input.agentId} is not active`);
    }

    // Create execution record
    const execution: AgentExecution = {
      id: uuidv4(),
      tenantId: input.tenantId,
      agentId: input.agentId,
      task: input.task,
      input: input.input,
      status: 'pending',
      createdAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(execution, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create execution');
      }

      // Update execution status to running
      const runningExecution = await this.updateStatus(
        resource.id,
        input.tenantId,
        'running',
        { startedAt: new Date() }
      );

      // Placeholder: In a real implementation, this would:
      // 1. Call AI Service with agent's system prompt
      // 2. Execute agent's tools/capabilities
      // 3. Handle agent's memory
      // 4. Process agent's outputs
      // 5. Update execution with results

      // For now, simulate execution
      setTimeout(async () => {
        await this.updateStatus(
          resource.id,
          input.tenantId,
          'completed',
          {
            output: { result: 'Agent execution completed (placeholder)' },
            completedAt: new Date(),
            executionTime: 1000, // 1 second
          }
        );

        // Update agent metrics
        await this.updateAgentMetrics(input.agentId, input.tenantId, {
          success: true,
          executionTime: 1000,
        });
      }, 1000);

      return runningExecution;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Update execution status
   */
  async updateStatus(
    executionId: string,
    tenantId: string,
    status: AgentExecution['status'],
    updates?: {
      output?: Record<string, any>;
      error?: string;
      startedAt?: Date;
      completedAt?: Date;
      executionTime?: number;
    }
  ): Promise<AgentExecution> {
    const existing = await this.getById(executionId, tenantId);

    const updated: AgentExecution = {
      ...existing,
      status,
      ...updates,
      executionTime: updates?.executionTime || existing.executionTime,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(executionId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update execution');
      }

      return resource as AgentExecution;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Execution ${executionId} not found`);
      }
      throw error;
    }
  }

  /**
   * Get execution by ID
   */
  async getById(executionId: string, tenantId: string): Promise<AgentExecution> {
    if (!executionId || !tenantId) {
      throw new BadRequestError('executionId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(executionId, tenantId).read<AgentExecution>();

      if (!resource) {
        throw new NotFoundError(`Execution ${executionId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Execution ${executionId} not found`);
      }
      throw error;
    }
  }

  /**
   * List executions
   */
  async list(
    tenantId: string,
    filters?: {
      agentId?: string;
      status?: AgentExecution['status'];
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: AgentExecution[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.agentId) {
      query += ' AND c.agentId = @agentId';
      parameters.push({ name: '@agentId', value: filters.agentId });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<AgentExecution>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list executions: ${error.message}`);
    }
  }

  /**
   * Update agent metrics after execution
   */
  private async updateAgentMetrics(
    agentId: string,
    tenantId: string,
    executionResult: {
      success: boolean;
      executionTime: number;
    }
  ): Promise<void> {
    const agent = await this.agentService.getById(agentId, tenantId);

    const totalExecutions = (agent.metrics?.totalExecutions || 0) + 1;
    const successCount = Math.floor(
      (agent.metrics?.successRate || 0) * (totalExecutions - 1) + (executionResult.success ? 1 : 0)
    );
    const successRate = successCount / totalExecutions;

    const currentAvgTime = agent.metrics?.averageExecutionTime || 0;
    const avgExecutionTime =
      (currentAvgTime * (totalExecutions - 1) + executionResult.executionTime) / totalExecutions;

    // Update metrics directly in database
    const container = getContainer('agent_agents');
    const updatedAgent = {
      ...agent,
      metrics: {
        totalExecutions: totalExecutions,
        successRate: successRate,
        averageExecutionTime: avgExecutionTime,
        lastExecutedAt: new Date(),
      },
      updatedAt: new Date(),
    };

    await container.item(agentId, tenantId).replace(updatedAgent);
  }
}


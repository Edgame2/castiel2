/**
 * Agent Service
 * Handles agent CRUD operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
  AgentType,
  AgentScope,
  AgentStatus,
} from '../types/agent.types';

export class AgentService {
  private containerName = 'agent_agents';

  /**
   * Create agent
   */
  async create(input: CreateAgentInput): Promise<Agent> {
    if (!input.tenantId || !input.name || !input.type || !input.instructions?.systemPrompt) {
      throw new BadRequestError('tenantId, name, type, and instructions.systemPrompt are required');
    }

    const agent: Agent = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      type: input.type,
      scope: input.scope,
      ownerId: input.ownerId || input.userId,
      status: AgentStatus.ACTIVE,
      version: '1.0.0',
      instructions: input.instructions,
      capabilities: input.capabilities || {},
      constraints: input.constraints,
      memory: input.memory,
      triggers: input.triggers,
      outputs: input.outputs,
      metadata: {
        ...input.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      metrics: {
        totalExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(agent, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create agent');
      }

      return resource as Agent;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Agent with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  async getById(agentId: string, tenantId: string): Promise<Agent> {
    if (!agentId || !tenantId) {
      throw new BadRequestError('agentId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(agentId, tenantId).read<Agent>();

      if (!resource) {
        throw new NotFoundError(`Agent ${agentId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Agent ${agentId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update agent
   */
  async update(
    agentId: string,
    tenantId: string,
    input: UpdateAgentInput
  ): Promise<Agent> {
    const existing = await this.getById(agentId, tenantId);

    // Increment version if instructions or capabilities changed
    let newVersion = existing.version;
    if (input.instructions || input.capabilities) {
      const [major, minor, patch] = existing.version.split('.').map(Number);
      newVersion = `${major}.${minor + 1}.${patch}`;
    }

    const updated: Agent = {
      ...existing,
      ...input,
      instructions: input.instructions
        ? { ...existing.instructions, ...input.instructions }
        : existing.instructions,
      capabilities: input.capabilities
        ? { ...existing.capabilities, ...input.capabilities }
        : existing.capabilities,
      constraints: input.constraints || existing.constraints,
      memory: input.memory || existing.memory,
      triggers: input.triggers || existing.triggers,
      outputs: input.outputs || existing.outputs,
      metadata: {
        ...existing.metadata,
        ...input.metadata,
        updatedAt: new Date(),
      },
      version: newVersion,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(agentId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update agent');
      }

      return resource as Agent;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Agent ${agentId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete agent
   */
  async delete(agentId: string, tenantId: string): Promise<void> {
    await this.getById(agentId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(agentId, tenantId).delete();
  }

  /**
   * List agents
   */
  async list(
    tenantId: string,
    filters?: {
      type?: AgentType;
      scope?: AgentScope;
      status?: AgentStatus;
      ownerId?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Agent[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: filters.type });
    }

    if (filters?.scope) {
      query += ' AND c.scope = @scope';
      parameters.push({ name: '@scope', value: filters.scope });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    if (filters?.ownerId) {
      query += ' AND c.ownerId = @ownerId';
      parameters.push({ name: '@ownerId', value: filters.ownerId });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Agent>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list agents: ${error.message}`);
    }
  }
}


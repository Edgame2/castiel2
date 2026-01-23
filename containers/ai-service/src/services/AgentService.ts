import { getDatabaseClient } from '@coder/shared';

export interface ListAgentsInput {
  userId: string;
  organizationId?: string;
  projectId?: string;
  scope?: string;
  limit?: number;
  offset?: number;
}

export interface ExecuteAgentInput {
  agentId: string;
  userId: string;
  organizationId?: string;
  input?: any;
  context?: any;
}

export class AgentService {
  private db = getDatabaseClient();

  async listAgents(input: ListAgentsInput) {
    const where: any = {};

    if (input.scope) {
      where.scope = input.scope;
    }

    if (input.projectId) {
      where.projectId = input.projectId;
    }

    const agents = await this.db.agent_agents.findMany({
      where,
      take: input.limit || 50,
      skip: input.offset || 0,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.db.agent_agents.count({ where });

    return {
      items: agents,
      total,
      limit: input.limit || 50,
      offset: input.offset || 0,
    };
  }

  async getAgent(id: string) {
    return await this.db.agent_agents.findUnique({
      where: { id },
    });
  }

  async executeAgent(input: ExecuteAgentInput) {
    // Create execution record
    const execution = await this.db.execution_executions.create({
      data: {
        planId: input.agentId, // Using planId field for agentId
        status: 'pending',
        result: {
          input: input.input,
          context: input.context,
        },
      },
    });

    // TODO: Actually execute the agent
    // This would call the agent's execution logic

    return execution;
  }
}

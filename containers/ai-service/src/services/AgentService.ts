import { getContainer } from '@coder/shared/database';
import { v4 as uuidv4 } from 'uuid';

const AGENTS_CONTAINER = 'ai_agents';

export interface ListAgentsInput {
  tenantId: string;
  userId: string;
  projectId?: string;
  scope?: string;
  limit?: number;
  offset?: number;
}

export interface ExecuteAgentInput {
  agentId: string;
  userId: string;
  tenantId?: string;
  input?: unknown;
  context?: unknown;
}

export class AgentService {
  async listAgents(input: ListAgentsInput) {
    if (!input.tenantId) {
      throw new Error('tenantId is required');
    }
    const container = getContainer(AGENTS_CONTAINER);
    const limit = Math.min(input.limit ?? 50, 100);
    const offset = input.offset ?? 0;

    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: { name: string; value: string | number }[] = [{ name: '@tenantId', value: input.tenantId }];
    if (input.scope) {
      query += ' AND c.scope = @scope';
      parameters.push({ name: '@scope', value: input.scope });
    }
    if (input.projectId) {
      query += ' AND c.projectId = @projectId';
      parameters.push({ name: '@projectId', value: input.projectId });
    }
    query += ' ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit';
    parameters.push({ name: '@offset', value: offset }, { name: '@limit', value: limit });

    const { resources: agents } = await container.items
      .query({ query, parameters })
      .fetchNext();

    const countParams = parameters.filter((p) => p.name !== '@offset' && p.name !== '@limit');
    const countQuery =
      'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId' +
      (input.scope ? ' AND c.scope = @scope' : '') +
      (input.projectId ? ' AND c.projectId = @projectId' : '');
    const countResult = await container.items.query({ query: countQuery, parameters: countParams }).fetchNext();
    const total = countResult.resources?.[0] ?? 0;

    return {
      items: agents,
      total: typeof total === 'number' ? total : agents.length,
      limit,
      offset,
    };
  }

  async getAgent(id: string, tenantId: string) {
    if (!id || !tenantId) {
      return null;
    }
    const container = getContainer(AGENTS_CONTAINER);
    try {
      const { resource } = await container.item(id, tenantId).read();
      return resource ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Records an execution request and returns a stub execution.
   * Persistence to an executions container and actual agent run are out of scope;
   * add cosmos_db.containers.executions and execution logic when implementing.
   */
  async executeAgent(input: ExecuteAgentInput) {
    return {
      id: uuidv4(),
      planId: input.agentId,
      status: 'pending',
      result: { input: input.input, context: input.context },
    };
  }
}

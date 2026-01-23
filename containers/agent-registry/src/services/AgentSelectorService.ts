/**
 * Agent Selector Service
 * Selects appropriate agent for a task
 */

import { BadRequestError } from '@coder/shared/utils/errors';
import { AgentService } from './AgentService';
import {
  Agent,
  AgentSelectionCriteria,
  AgentType,
  AgentScope,
} from '../types/agent.types';

export class AgentSelectorService {
  private agentService: AgentService;

  constructor(agentService: AgentService) {
    this.agentService = agentService;
  }

  /**
   * Select best agent for a task
   */
  async selectAgent(
    criteria: AgentSelectionCriteria,
    tenantId: string
  ): Promise<Agent | null> {
    if (!criteria.task || !tenantId) {
      throw new BadRequestError('task and tenantId are required');
    }

    // Get all active agents
    const { items: agents } = await this.agentService.list(tenantId, {
      status: 'active' as any,
      scope: criteria.scope,
    });

    if (agents.length === 0) {
      return null;
    }

    // Score agents based on criteria
    const scoredAgents = agents.map((agent) => ({
      agent,
      score: this.scoreAgent(agent, criteria),
    }));

    // Sort by score (descending)
    scoredAgents.sort((a, b) => b.score - a.score);

    // Return best matching agent (score > 0)
    const bestMatch = scoredAgents[0];
    return bestMatch && bestMatch.score > 0 ? bestMatch.agent : null;
  }

  /**
   * Score agent for a task
   */
  private scoreAgent(agent: Agent, criteria: AgentSelectionCriteria): number {
    let score = 0;

    // Type matching
    if (criteria.preferredAgentTypes && criteria.preferredAgentTypes.includes(agent.type)) {
      score += 10;
    }

    // Capability matching
    if (criteria.requiredCapabilities && agent.capabilities.tools) {
      const matchingCapabilities = criteria.requiredCapabilities.filter((cap) =>
        agent.capabilities.tools!.includes(cap)
      );
      score += matchingCapabilities.length * 5;
    }

    // Task description matching (simple keyword matching)
    const taskLower = criteria.task.toLowerCase();
    const agentNameLower = agent.name.toLowerCase();
    const agentDescLower = agent.description.toLowerCase();

    if (agentNameLower.includes(taskLower) || taskLower.includes(agentNameLower)) {
      score += 5;
    }

    if (agentDescLower.includes(taskLower) || taskLower.includes(agentDescLower)) {
      score += 3;
    }

    // Type-specific matching
    if (criteria.taskType) {
      const taskTypeLower = criteria.taskType.toLowerCase();
      if (agent.type.toLowerCase().includes(taskTypeLower) || taskTypeLower.includes(agent.type.toLowerCase())) {
        score += 8;
      }
    }

    // Constraint matching
    if (criteria.maxTokens && agent.constraints?.maxTokens) {
      if (agent.constraints.maxTokens >= criteria.maxTokens) {
        score += 2;
      } else {
        score -= 5; // Penalize if agent can't handle token requirement
      }
    }

    if (criteria.timeout && agent.constraints?.timeout) {
      if (agent.constraints.timeout >= criteria.timeout) {
        score += 2;
      } else {
        score -= 5; // Penalize if agent can't handle timeout requirement
      }
    }

    // Metrics-based scoring (prefer agents with good track record)
    if (agent.metrics) {
      if (agent.metrics.successRate && agent.metrics.successRate > 0.8) {
        score += 3;
      }
      if (agent.metrics.totalExecutions && agent.metrics.totalExecutions > 10) {
        score += 2; // Prefer experienced agents
      }
    }

    return score;
  }

  /**
   * Get agents by type
   */
  async getAgentsByType(
    type: AgentType,
    tenantId: string,
    scope?: AgentScope
  ): Promise<Agent[]> {
    const { items } = await this.agentService.list(tenantId, {
      type,
      scope,
      status: 'active' as any,
    });

    return items;
  }
}


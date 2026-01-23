/**
 * Reinforcement Learning Service
 * Learns optimal action sequences for deal nurturing and stakeholder engagement
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { OpportunityService } from './opportunity.service.js';
import { PrescriptiveAnalyticsService } from './prescriptive-analytics.service.js';

export type ActionType = 'email' | 'call' | 'meeting' | 'proposal' | 'demo' | 'follow_up' | 'stakeholder_introduction';
export type State = 'discovery' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Action {
  actionId: string;
  type: ActionType;
  timestamp: Date;
  outcome?: 'success' | 'failure' | 'neutral';
  reward?: number; // -1 to 1: Reward signal
}

export interface StateActionPair {
  state: State;
  action: ActionType;
  reward: number;
  nextState: State;
  timestamp: Date;
}

export interface Policy {
  policyId: string;
  tenantId: string;
  opportunityId?: string; // Optional: opportunity-specific policy
  stateActionValues: Map<string, number>; // Q-values: state -> action -> value
  visitCounts: Map<string, number>; // Visit counts for exploration
  lastUpdated: Date;
}

export interface Strategy {
  strategyId: string;
  tenantId: string;
  opportunityId: string;
  actions: Array<{
    action: ActionType;
    order: number;
    expectedReward: number;
    confidence: number;
  }>;
  totalExpectedReward: number;
  generatedAt: Date;
}

/**
 * Reinforcement Learning Service
 * Uses Q-learning to learn optimal action sequences
 */
export class ReinforcementLearningService {
  private client: CosmosClient;
  private database: Database;
  private policiesContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private opportunityService?: OpportunityService;
  private prescriptiveAnalyticsService?: PrescriptiveAnalyticsService;

  // Q-learning parameters
  private readonly LEARNING_RATE = 0.1; // Alpha
  private readonly DISCOUNT_FACTOR = 0.9; // Gamma
  private readonly EXPLORATION_RATE = 0.2; // Epsilon (20% exploration)

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    opportunityService?: OpportunityService,
    prescriptiveAnalyticsService?: PrescriptiveAnalyticsService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.opportunityService = opportunityService;
    this.prescriptiveAnalyticsService = prescriptiveAnalyticsService;

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
    // Using learning_outcomes container for now, could create dedicated rl_policies container
    this.policiesContainer = this.database.container(config.cosmosDb.containers.learningOutcomes);
  }

  /**
   * Learn deal nurturing strategy
   */
  async learnDealNurturingStrategy(
    opportunityId: string,
    tenantId: string
  ): Promise<Strategy> {
    // Get or create policy
    const policy = await this.getOrCreatePolicy(tenantId, opportunityId);

    // Get current state
    const currentState = await this.getOpportunityState(opportunityId, tenantId);

    // Generate strategy using epsilon-greedy policy
    const actions = this.generateActionSequence(policy, currentState);

    const strategy: Strategy = {
      strategyId: uuidv4(),
      tenantId,
      opportunityId,
      actions,
      totalExpectedReward: actions.reduce((sum, a) => sum + a.expectedReward, 0),
      generatedAt: new Date(),
    };

    return strategy;
  }

  /**
   * Learn stakeholder engagement path
   */
  async learnStakeholderEngagementPath(
    opportunityId: string,
    tenantId: string,
    stakeholderId: string
  ): Promise<Strategy> {
    // Similar to deal nurturing but focused on stakeholder-specific actions
    const policy = await this.getOrCreatePolicy(tenantId, opportunityId);

    // Get stakeholder-specific state
    const currentState = await this.getOpportunityState(opportunityId, tenantId);

    // Generate stakeholder-focused actions
    const stakeholderActions: ActionType[] = ['stakeholder_introduction', 'meeting', 'follow_up'];
    const actions = stakeholderActions.map((actionType, index) => {
      const key = `${currentState}:${actionType}`;
      const qValue = policy.stateActionValues.get(key) || 0;
      return {
        action: actionType,
        order: index + 1,
        expectedReward: qValue,
        confidence: this.calculateConfidence(policy, key),
      };
    });

    const strategy: Strategy = {
      strategyId: uuidv4(),
      tenantId,
      opportunityId,
      actions,
      totalExpectedReward: actions.reduce((sum, a) => sum + a.expectedReward, 0),
      generatedAt: new Date(),
    };

    return strategy;
  }

  /**
   * Optimize action sequence
   */
  async optimizeActionSequence(
    state: State,
    actions: ActionType[],
    tenantId: string
  ): Promise<Array<{ action: ActionType; expectedReward: number }>> {
    const policy = await this.getOrCreatePolicy(tenantId);

    // Evaluate each action
    const evaluated = actions.map((action) => {
      const key = `${state}:${action}`;
      const qValue = policy.stateActionValues.get(key) || 0;
      return {
        action,
        expectedReward: qValue,
      };
    });

    // Sort by expected reward (descending)
    return evaluated.sort((a, b) => b.expectedReward - a.expectedReward);
  }

  /**
   * Update Q-values from experience
   */
  async learnFromExperience(
    tenantId: string,
    experience: StateActionPair
  ): Promise<void> {
    const policy = await this.getOrCreatePolicy(tenantId);

    const key = `${experience.state}:${experience.action}`;
    const currentQ = policy.stateActionValues.get(key) || 0;

    // Q-learning update: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
    const nextStateMaxQ = this.getMaxQValue(policy, experience.nextState);
    const newQ = currentQ + this.LEARNING_RATE * (
      experience.reward + this.DISCOUNT_FACTOR * nextStateMaxQ - currentQ
    );

    // Update Q-value
    policy.stateActionValues.set(key, newQ);

    // Update visit count
    const visits = policy.visitCounts.get(key) || 0;
    policy.visitCounts.set(key, visits + 1);

    policy.lastUpdated = new Date();

    // Save policy
    await this.savePolicy(policy);

    this.monitoring?.trackEvent('reinforcement_learning.q_updated', {
      tenantId,
      state: experience.state,
      action: experience.action,
      reward: experience.reward,
      newQ,
    });
  }

  /**
   * Generate action sequence using epsilon-greedy policy
   */
  private generateActionSequence(
    policy: Policy,
    currentState: State
  ): Array<{ action: ActionType; order: number; expectedReward: number; confidence: number }> {
    const availableActions: ActionType[] = ['email', 'call', 'meeting', 'proposal', 'demo', 'follow_up'];

    // Epsilon-greedy: explore 20% of the time, exploit 80%
    const shouldExplore = Math.random() < this.EXPLORATION_RATE;

    let selectedActions: Array<{ action: ActionType; expectedReward: number; confidence: number }>;

    if (shouldExplore) {
      // Exploration: random selection
      selectedActions = availableActions
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((action) => {
          const key = `${currentState}:${action}`;
          return {
            action,
            expectedReward: policy.stateActionValues.get(key) || 0,
            confidence: this.calculateConfidence(policy, key),
          };
        });
    } else {
      // Exploitation: select actions with highest Q-values
      selectedActions = availableActions
        .map((action) => {
          const key = `${currentState}:${action}`;
          return {
            action,
            expectedReward: policy.stateActionValues.get(key) || 0,
            confidence: this.calculateConfidence(policy, key),
          };
        })
        .sort((a, b) => b.expectedReward - a.expectedReward)
        .slice(0, 3);
    }

    // Add order
    return selectedActions.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
  }

  /**
   * Get maximum Q-value for a state
   */
  private getMaxQValue(policy: Policy, state: State): number {
    const availableActions: ActionType[] = ['email', 'call', 'meeting', 'proposal', 'demo', 'follow_up'];
    const qValues = availableActions.map((action) => {
      const key = `${state}:${action}`;
      return policy.stateActionValues.get(key) || 0;
    });
    return Math.max(...qValues, 0);
  }

  /**
   * Calculate confidence based on visit count
   */
  private calculateConfidence(policy: Policy, key: string): number {
    const visits = policy.visitCounts.get(key) || 0;
    // More visits = higher confidence (capped at 1.0)
    return Math.min(1.0, visits / 10);
  }

  /**
   * Get or create policy
   */
  private async getOrCreatePolicy(
    tenantId: string,
    opportunityId?: string
  ): Promise<Policy> {
    const policyId = opportunityId
      ? `policy:${tenantId}:${opportunityId}`
      : `policy:${tenantId}:global`;

    // Check cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(`rl_policy:${policyId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Convert Maps from JSON
          parsed.stateActionValues = new Map(parsed.stateActionValues);
          parsed.visitCounts = new Map(parsed.visitCounts);
          return parsed;
        }
      } catch (error) {
        // Continue to DB
      }
    }

    // Check DB
    try {
      const query = `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
        AND c.type = 'rl_policy'
        AND c.policyId = @policyId
      `;

      const { resources } = await this.policiesContainer.items
        .query<Policy>({
          query,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@policyId', value: policyId },
          ],
        })
        .fetchAll();

      if (resources.length > 0) {
        const policy = resources[0];
        // Convert Maps from JSON
        policy.stateActionValues = new Map(policy.stateActionValues);
        policy.visitCounts = new Map(policy.visitCounts);
        return policy;
      }
    } catch (error) {
      // Create new policy
    }

    // Create new policy
    const policy: Policy = {
      policyId,
      tenantId,
      opportunityId,
      stateActionValues: new Map(),
      visitCounts: new Map(),
      lastUpdated: new Date(),
    };

    return policy;
  }

  /**
   * Save policy
   */
  private async savePolicy(policy: Policy): Promise<void> {
    // Convert Maps to arrays for JSON serialization
    const serializable = {
      ...policy,
      stateActionValues: Array.from(policy.stateActionValues.entries()),
      visitCounts: Array.from(policy.visitCounts.entries()),
      type: 'rl_policy',
      partitionKey: policy.tenantId,
    };

    await this.policiesContainer.items.upsert(serializable);

    // Cache in Redis
    if (this.redis) {
      await this.redis.setex(
        `rl_policy:${policy.policyId}`,
        3600,
        JSON.stringify(serializable)
      );
    }
  }

  /**
   * Get opportunity state
   */
  private async getOpportunityState(
    opportunityId: string,
    tenantId: string
  ): Promise<State> {
    // TODO: Load actual opportunity from OpportunityService
    // For now, return default state
    return 'qualification';
  }
}

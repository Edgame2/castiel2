/**
 * A/B Test Service
 * Handles prompt A/B testing
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  PromptABTest,
  CreatePromptABTestInput,
  PromptABTestStatus,
  VariantMetrics,
} from '../types/prompt.types';

export class ABTestService {
  private containerName = 'prompt_ab_tests';

  /**
   * Create A/B test
   */
  async create(input: CreatePromptABTestInput): Promise<PromptABTest> {
    if (!input.tenantId || !input.name || !input.variants || input.variants.length < 2) {
      throw new BadRequestError('tenantId, name, and at least 2 variants are required');
    }

    // Validate traffic split sums to 100
    const totalTraffic = input.variants.reduce((sum, v) => sum + v.trafficPercentage, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new BadRequestError('Traffic percentages must sum to 100');
    }

    const trafficSplit: Record<string, number> = {};
    const metrics: Record<string, VariantMetrics> = {};

    for (const variant of input.variants) {
      trafficSplit[variant.variantId] = variant.trafficPercentage;
      metrics[variant.variantId] = {
        impressions: 0,
        successfulResponses: 0,
        failedResponses: 0,
        averageTokens: 0,
        averageLatencyMs: 0,
        userFeedbackScore: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
        totalCost: 0,
      };
    }

    const abTest: PromptABTest = {
      id: uuidv4(),
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      hypothesis: input.hypothesis,
      promptSlug: input.promptSlug,
      variants: input.variants,
      trafficSplit,
      primaryMetric: input.primaryMetric,
      successCriteria: input.successCriteria,
      targeting: input.targeting,
      status: PromptABTestStatus.DRAFT,
      minDuration: input.minDuration,
      minSamplesPerVariant: input.minSamplesPerVariant,
      metrics,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName) as any;
      const { resource } = await container.items.create(abTest, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create A/B test');
      }

      return resource as PromptABTest;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('A/B test with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get A/B test by ID
   */
  async getById(testId: string, tenantId: string): Promise<PromptABTest> {
    if (!testId || !tenantId) {
      throw new BadRequestError('testId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName) as any;
      const { resource } = await container.item(testId, tenantId).read();

      if (!resource) {
        throw new NotFoundError('A/B test', testId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('A/B test', testId);
      }
      throw error;
    }
  }

  /**
   * Update A/B test
   */
  async update(
    testId: string,
    tenantId: string,
    input: {
      status?: PromptABTestStatus;
      startDate?: Date;
      endDate?: Date;
      results?: PromptABTest['results'];
      metrics?: Record<string, VariantMetrics>;
    }
  ): Promise<PromptABTest> {
    const existing = await this.getById(testId, tenantId);

    const updated: PromptABTest = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName) as any;
      const { resource } = await container.item(testId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update A/B test');
      }

      return resource as PromptABTest;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('A/B test', testId);
      }
      throw error;
    }
  }

  /**
   * Record variant usage
   */
  async recordUsage(
    testId: string,
    tenantId: string,
    variantId: string,
    metrics: {
      success: boolean;
      tokens?: number;
      latencyMs?: number;
      cost?: number;
      feedbackScore?: number;
      positiveFeedback?: boolean;
      negativeFeedback?: boolean;
    }
  ): Promise<void> {
    const test = await this.getById(testId, tenantId);
    const variantMetrics = test.metrics[variantId];

    if (!variantMetrics) {
      throw new BadRequestError(`Variant ${variantId} not found in test`);
    }

    variantMetrics.impressions++;
    if (metrics.success) {
      variantMetrics.successfulResponses++;
    } else {
      variantMetrics.failedResponses++;
    }

    if (metrics.tokens !== undefined) {
      const totalTokens = variantMetrics.averageTokens * (variantMetrics.impressions - 1) + metrics.tokens;
      variantMetrics.averageTokens = totalTokens / variantMetrics.impressions;
    }

    if (metrics.latencyMs !== undefined) {
      const totalLatency = variantMetrics.averageLatencyMs * (variantMetrics.impressions - 1) + metrics.latencyMs;
      variantMetrics.averageLatencyMs = totalLatency / variantMetrics.impressions;
    }

    if (metrics.cost !== undefined) {
      variantMetrics.totalCost += metrics.cost;
    }

    if (metrics.feedbackScore !== undefined) {
      const totalScore = variantMetrics.userFeedbackScore * (variantMetrics.impressions - 1) + metrics.feedbackScore;
      variantMetrics.userFeedbackScore = totalScore / variantMetrics.impressions;
    }

    if (metrics.positiveFeedback) {
      variantMetrics.positiveFeedback++;
    }

    if (metrics.negativeFeedback) {
      variantMetrics.negativeFeedback++;
    }

    variantMetrics.lastUsedAt = new Date();

    await this.update(testId, tenantId, {
      metrics: test.metrics,
    });
  }

  /**
   * Select variant for A/B test (consistent hashing based on userId)
   */
  async selectVariant(testId: string, tenantId: string, userId: string): Promise<string> {
    const test = await this.getById(testId, tenantId);

    if (test.status !== PromptABTestStatus.ACTIVE) {
      throw new BadRequestError('A/B test is not active');
    }

    // Check targeting
    if (test.targeting) {
      if (test.targeting.tenantIds && !test.targeting.tenantIds.includes(tenantId)) {
        throw new BadRequestError('User not in test targeting');
      }
      if (test.targeting.userIds && !test.targeting.userIds.includes(userId)) {
        throw new BadRequestError('User not in test targeting');
      }
    }

    // Simple consistent hashing based on userId
    const hash = this.hashString(userId + testId);
    const random = hash % 100;

    let cumulative = 0;
    for (const variant of test.variants) {
      cumulative += variant.trafficPercentage;
      if (random < cumulative) {
        return variant.variantId;
      }
    }

    // Fallback to first variant
    return test.variants[0].variantId;
  }

  /**
   * Simple hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * List A/B tests
   */
  async list(
    tenantId: string,
    filters?: {
      status?: PromptABTestStatus;
      promptSlug?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: PromptABTest[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    if (filters?.promptSlug) {
      query += ' AND c.promptSlug = @promptSlug';
      parameters.push({ name: '@promptSlug', value: filters.promptSlug });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<PromptABTest>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list A/B tests: ${error.message}`);
    }
  }
}


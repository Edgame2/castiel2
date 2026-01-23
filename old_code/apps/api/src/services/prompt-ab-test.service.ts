// @ts-nocheck - Optional service, not used by workers
/**
 * Prompt A/B Testing Service
 * Manages prompt A/B test experiments, variant selection, and metrics tracking
 */

import { v4 as uuidv4 } from 'uuid';
import { AIInsightsCosmosService } from './ai-insights/cosmos.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  PromptABTest,
  PromptABTestStatus,
  CreatePromptABTestInput,
  UpdatePromptABTestInput,
  ExperimentAssignment,
  ExperimentEvent,
  PromptABTestResult,
  VariantMetrics,
} from '../types/prompt-ab-test.types.js';
import { InsightType } from '../types/ai-insights.types.js';
import { SqlQuerySpec } from '@azure/cosmos';

/**
 * Prompt A/B Testing Service
 */
export class PromptABTestService {
  constructor(
    private readonly cosmosService: AIInsightsCosmosService,
    private readonly monitoring: IMonitoringProvider
  ) {}

  /**
   * Create a new prompt A/B test experiment
   */
  async createExperiment(
    tenantId: string,
    input: CreatePromptABTestInput,
    userId: string
  ): Promise<PromptABTest> {
    // Validate traffic split sums to 100
    const totalTraffic = input.variants.reduce((sum, v) => sum + v.trafficPercentage, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error(`Traffic split must sum to 100%, got ${totalTraffic}%`);
    }

    // Validate at least 2 variants
    if (input.variants.length < 2) {
      throw new Error('At least 2 variants are required');
    }

    // Build traffic split object
    const trafficSplit: { [variantId: string]: number } = {};
    for (const variant of input.variants) {
      trafficSplit[variant.variantId] = variant.trafficPercentage;
    }

    // Initialize metrics for each variant
    const metrics: { [variantId: string]: VariantMetrics } = {};
    for (const variant of input.variants) {
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

    const experiment: PromptABTest = {
      id: uuidv4(),
      tenantId,
      partitionKey: this.cosmosService.buildPartitionKey(tenantId, 'system', 'system'),
      type: 'promptABTest',
      name: input.name,
      description: input.description,
      hypothesis: input.hypothesis,
      insightType: input.insightType,
      slug: input.slug,
      variants: input.variants,
      trafficSplit,
      primaryMetric: input.primaryMetric,
      successCriteria: input.successCriteria,
      targeting: input.targeting,
      status: PromptABTestStatus.Draft,
      minDuration: input.minDuration || 7, // Default 7 days
      minSamplesPerVariant: input.minSamplesPerVariant || 100, // Default 100 samples
      metrics,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: {
        userId,
        at: new Date(),
      },
    };

    const container = this.cosmosService.getExperimentsContainer();
    const created = await this.cosmosService.create<PromptABTest>(container, experiment);

    this.monitoring.trackEvent('promptABTest.created', {
      tenantId,
      experimentId: created.id,
      insightType: input.insightType,
    });

    return created;
  }

  /**
   * Get an experiment by ID
   */
  async getExperiment(tenantId: string, experimentId: string): Promise<PromptABTest | null> {
    const container = this.cosmosService.getExperimentsContainer();
    const partitionKey = this.cosmosService.buildPartitionKey(tenantId, experimentId, 'system');
    return this.cosmosService.read<PromptABTest>(container, experimentId, partitionKey);
  }

  /**
   * List experiments
   */
  async listExperiments(
    tenantId: string,
    options: {
      status?: PromptABTestStatus;
      insightType?: InsightType;
      limit?: number;
      continuationToken?: string;
    } = {}
  ): Promise<{ items: PromptABTest[]; continuationToken?: string; hasMore: boolean }> {
    const container = this.cosmosService.getExperimentsContainer();
    const { status, insightType, limit = 50, continuationToken } = options;

    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.type = @type';
    const parameters: any[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@type', value: 'promptABTest' },
    ];

    if (status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: status });
    }

    if (insightType) {
      query += ' AND c.insightType = @insightType';
      parameters.push({ name: '@insightType', value: insightType });
    }

    query += ' ORDER BY c.createdAt DESC';

    const querySpec: SqlQuerySpec = { query, parameters };
    const result = await this.cosmosService.query<PromptABTest>(container, querySpec, {
      maxItems: limit,
      continuationToken,
    });

    return {
      items: result.items,
      continuationToken: result.continuationToken,
      hasMore: result.hasMore,
    };
  }

  /**
   * Update an experiment
   */
  async updateExperiment(
    tenantId: string,
    experimentId: string,
    input: UpdatePromptABTestInput,
    userId: string
  ): Promise<PromptABTest> {
    const experiment = await this.getExperiment(tenantId, experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    // Validate status transitions
    if (input.status) {
      this.validateStatusTransition(experiment.status, input.status);
    }

    // Validate traffic split if provided
    if (input.trafficSplit) {
      const total = Object.values(input.trafficSplit).reduce((sum, v) => sum + v, 0);
      if (Math.abs(total - 100) > 0.01) {
        throw new Error(`Traffic split must sum to 100%, got ${total}%`);
      }
    }

    const updates: Partial<PromptABTest> = {
      ...input,
      updatedAt: new Date(),
      updatedBy: {
        userId,
        at: new Date(),
      },
    };

    // If starting experiment, set start date
    if (input.status === PromptABTestStatus.Active && !experiment.startDate) {
      updates.startDate = new Date();
    }

    // If completing experiment, set end date
    if (input.status === PromptABTestStatus.Completed && !experiment.endDate) {
      updates.endDate = new Date();
    }

    const container = this.cosmosService.getExperimentsContainer();
    const partitionKey = this.cosmosService.buildPartitionKey(tenantId, experimentId, 'system');
    const updated = await this.cosmosService.update<PromptABTest>(
      container,
      experimentId,
      partitionKey,
      updates
    );

    this.monitoring.trackEvent('promptABTest.updated', {
      tenantId,
      experimentId,
      status: input.status || experiment.status,
    });

    return updated;
  }

  /**
   * Start an experiment
   */
  async startExperiment(tenantId: string, experimentId: string, userId: string): Promise<PromptABTest> {
    return this.updateExperiment(tenantId, experimentId, { status: PromptABTestStatus.Active }, userId);
  }

  /**
   * Pause an experiment
   */
  async pauseExperiment(tenantId: string, experimentId: string, userId: string): Promise<PromptABTest> {
    return this.updateExperiment(tenantId, experimentId, { status: PromptABTestStatus.Paused }, userId);
  }

  /**
   * Complete an experiment
   */
  async completeExperiment(tenantId: string, experimentId: string, userId: string): Promise<PromptABTest> {
    // Calculate results before completing
    const results = await this.calculateResults(tenantId, experimentId);
    
    return this.updateExperiment(
      tenantId,
      experimentId,
      {
        status: PromptABTestStatus.Completed,
        results,
      },
      userId
    );
  }

  /**
   * Select a variant for a user (deterministic based on userId)
   */
  async selectVariant(
    tenantId: string,
    userId: string,
    insightType: InsightType,
    slug?: string
  ): Promise<{ promptId: string; variantId: string; experimentId?: string } | null> {
    // Find active experiments matching the criteria
    const experiments = await this.findActiveExperiments(tenantId, insightType, slug);

    if (experiments.length === 0) {
      return null; // No active experiment
    }

    // Use the first matching experiment (could be enhanced to support multiple concurrent experiments)
    const experiment = experiments[0];

    // Check targeting
    if (!this.matchesTargeting(experiment, tenantId, userId)) {
      return null;
    }

    // Get or create assignment (deterministic)
    const assignment = await this.getOrCreateAssignment(tenantId, experiment.id, userId);

    // Find the variant
    const variant = experiment.variants.find((v) => v.variantId === assignment.variantId);
    if (!variant) {
      return null;
    }

    return {
      promptId: variant.promptId,
      variantId: variant.variantId,
      experimentId: experiment.id,
    };
  }

  /**
   * Record an experiment event (exposure, success, failure, feedback)
   */
  async recordEvent(
    tenantId: string,
    experimentId: string,
    userId: string,
    event: {
      eventType: 'exposure' | 'success' | 'failure' | 'feedback';
      metrics: {
        tokensUsed?: number;
        latencyMs?: number;
        cost?: number;
        quality?: number;
        userFeedback?: number;
        feedbackType?: 'positive' | 'negative' | 'neutral';
      };
      context?: {
        insightId?: string;
        conversationId?: string;
        intent?: string;
      };
    }
  ): Promise<void> {
    // Get assignment
    const assignment = await this.getAssignment(tenantId, experimentId, userId);
    if (!assignment) {
      return; // User not assigned to this experiment
    }

    // Create event
    const eventDoc: ExperimentEvent = {
      id: uuidv4(),
      tenantId,
      partitionKey: this.cosmosService.buildPartitionKey(tenantId, experimentId, userId),
      type: 'experimentEvent',
      experimentId,
      assignmentId: assignment.id,
      userId,
      variantId: assignment.variantId,
      eventType: event.eventType,
      metrics: event.metrics,
      context: event.context,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const container = this.cosmosService.getExperimentsContainer();
    await this.cosmosService.create<ExperimentEvent>(container, eventDoc);

    // Update assignment
    await this.updateAssignment(tenantId, experimentId, userId, {
      exposureCount: assignment.exposureCount + 1,
      lastExposure: new Date(),
      firstExposure: assignment.firstExposure || new Date(),
    });

    // Update experiment metrics (async, don't wait)
    this.updateExperimentMetrics(tenantId, experimentId, assignment.variantId, event).catch(
      (err) => {
        this.monitoring.trackException(err as Error, {
          component: 'PromptABTestService',
          operation: 'updateExperimentMetrics',
          tenantId,
          experimentId,
        });
      }
    );
  }

  /**
   * Calculate experiment results
   */
  async calculateResults(tenantId: string, experimentId: string): Promise<PromptABTest['results']> {
    const experiment = await this.getExperiment(tenantId, experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    // Get all events for this experiment
    const events = await this.getExperimentEvents(tenantId, experimentId);

    // Group events by variant
    const variantEvents: { [variantId: string]: ExperimentEvent[] } = {};
    for (const variant of experiment.variants) {
      variantEvents[variant.variantId] = events.filter((e) => e.variantId === variant.variantId);
    }

    // Calculate metrics for each variant
    const variantResults: { [variantId: string]: any } = {};
    for (const variant of experiment.variants) {
      const events = variantEvents[variant.variantId];
      variantResults[variant.variantId] = this.calculateVariantMetrics(events);
    }

    // Perform statistical analysis
    const controlVariant = experiment.variants.find((v) => v.variantId === 'control') || experiment.variants[0];
    const treatmentVariant = experiment.variants.find((v) => v.variantId !== 'control') || experiment.variants[1];

    const controlMetrics = variantResults[controlVariant.variantId];
    const treatmentMetrics = variantResults[treatmentVariant.variantId];

    const statisticalSignificance = this.calculateStatisticalSignificance(
      controlMetrics,
      treatmentMetrics,
      experiment.primaryMetric
    );

    // Determine winner
    let winner: string | undefined;
    let improvement: number | undefined;

    if (statisticalSignificance >= (experiment.successCriteria?.confidenceLevel || 0.95)) {
      const controlValue = this.getMetricValue(controlMetrics, experiment.primaryMetric);
      const treatmentValue = this.getMetricValue(treatmentMetrics, experiment.primaryMetric);

      if (experiment.primaryMetric === 'latency') {
        // Lower is better
        winner = treatmentValue < controlValue ? treatmentVariant.variantId : controlVariant.variantId;
        improvement = ((controlValue - treatmentValue) / controlValue) * 100;
      } else {
        // Higher is better
        winner = treatmentValue > controlValue ? treatmentVariant.variantId : controlVariant.variantId;
        improvement = ((treatmentValue - controlValue) / controlValue) * 100;
      }
    }

    return {
      winner,
      statisticalSignificance,
      confidenceLevel: experiment.successCriteria?.confidenceLevel || 0.95,
      improvement,
      completedAt: new Date(),
    };
  }

  /**
   * Get experiment results with detailed metrics
   */
  async getResults(tenantId: string, experimentId: string): Promise<PromptABTestResult> {
    const experiment = await this.getExperiment(tenantId, experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    return {
      experimentId: experiment.id,
      name: experiment.name,
      status: experiment.status,
      variants: experiment.variants.map((v) => ({
        variantId: v.variantId,
        name: v.name,
        metrics: experiment.metrics[v.variantId],
      })),
      comparison: experiment.results,
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Find active experiments matching criteria
   */
  private async findActiveExperiments(
    tenantId: string,
    insightType: InsightType,
    slug?: string
  ): Promise<PromptABTest[]> {
    const container = this.cosmosService.getExperimentsContainer();
    let query = `
      SELECT * FROM c 
      WHERE c.tenantId = @tenantId 
      AND c.type = @type 
      AND c.status = @status 
      AND c.insightType = @insightType
    `;
    const parameters: any[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@type', value: 'promptABTest' },
      { name: '@status', value: PromptABTestStatus.Active },
      { name: '@insightType', value: insightType },
    ];

    if (slug) {
      query += ' AND (c.slug = @slug OR c.slug = null OR NOT IS_DEFINED(c.slug))';
      parameters.push({ name: '@slug', value: slug });
    }

    query += ' ORDER BY c.createdAt DESC';

    const querySpec: SqlQuerySpec = { query, parameters };
    const results = await this.cosmosService.queryAll<PromptABTest>(container, querySpec, 10);

    return results;
  }

  /**
   * Check if user matches targeting criteria
   */
  private matchesTargeting(experiment: PromptABTest, tenantId: string, userId: string): boolean {
    if (!experiment.targeting) {
      return true; // No targeting = all users
    }

    const { tenantIds, userIds } = experiment.targeting;

    if (tenantIds && tenantIds.length > 0 && !tenantIds.includes(tenantId)) {
      return false;
    }

    if (userIds && userIds.length > 0 && !userIds.includes(userId)) {
      return false;
    }

    return true;
  }

  /**
   * Get or create assignment (deterministic based on userId)
   */
  private async getOrCreateAssignment(
    tenantId: string,
    experimentId: string,
    userId: string
  ): Promise<ExperimentAssignment> {
    // Check for existing assignment
    const existing = await this.getAssignment(tenantId, experimentId, userId);
    if (existing) {
      return existing;
    }

    // Get experiment
    const experiment = await this.getExperiment(tenantId, experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    // Deterministic variant selection based on userId hash
    const hash = this.hashString(`${userId}-${experimentId}`);
    const bucket = hash % 100;

    let cumulative = 0;
    let selectedVariant = experiment.variants[0]; // Fallback

    for (const variant of experiment.variants) {
      cumulative += experiment.trafficSplit[variant.variantId] || 0;
      if (bucket < cumulative) {
        selectedVariant = variant;
        break;
      }
    }

    // Create assignment
    const assignment: ExperimentAssignment = {
      id: uuidv4(),
      tenantId,
      partitionKey: this.cosmosService.buildPartitionKey(tenantId, experimentId, userId),
      type: 'experimentAssignment',
      experimentId,
      userId,
      variantId: selectedVariant.variantId,
      assignedAt: new Date(),
      exposureCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const container = this.cosmosService.getExperimentsContainer();
    return this.cosmosService.create<ExperimentAssignment>(container, assignment);
  }

  /**
   * Get assignment
   */
  private async getAssignment(
    tenantId: string,
    experimentId: string,
    userId: string
  ): Promise<ExperimentAssignment | null> {
    const container = this.cosmosService.getExperimentsContainer();
    const partitionKey = this.cosmosService.buildPartitionKey(tenantId, experimentId, userId);

    const query: SqlQuerySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId 
        AND c.experimentId = @experimentId 
        AND c.userId = @userId 
        AND c.type = @type
      `,
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@experimentId', value: experimentId },
        { name: '@userId', value: userId },
        { name: '@type', value: 'experimentAssignment' },
      ],
    };

    const results = await this.cosmosService.queryAll<ExperimentAssignment>(container, query, 1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Update assignment
   */
  private async updateAssignment(
    tenantId: string,
    experimentId: string,
    userId: string,
    updates: Partial<ExperimentAssignment>
  ): Promise<void> {
    const assignment = await this.getAssignment(tenantId, experimentId, userId);
    if (!assignment) {
      return;
    }

    const container = this.cosmosService.getExperimentsContainer();
    const partitionKey = this.cosmosService.buildPartitionKey(tenantId, experimentId, userId);
    await this.cosmosService.update<ExperimentAssignment>(container, assignment.id, partitionKey, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * Get experiment events
   */
  private async getExperimentEvents(tenantId: string, experimentId: string): Promise<ExperimentEvent[]> {
    const container = this.cosmosService.getExperimentsContainer();
    const query: SqlQuerySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId 
        AND c.experimentId = @experimentId 
        AND c.type = @type
        ORDER BY c.timestamp DESC
      `,
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@experimentId', value: experimentId },
        { name: '@type', value: 'experimentEvent' },
      ],
    };

    return this.cosmosService.queryAll<ExperimentEvent>(container, query, 10000);
  }

  /**
   * Update experiment metrics (async aggregation)
   */
  private async updateExperimentMetrics(
    tenantId: string,
    experimentId: string,
    variantId: string,
    event: {
      eventType: 'exposure' | 'success' | 'failure' | 'feedback';
      metrics: {
        tokensUsed?: number;
        latencyMs?: number;
        cost?: number;
        quality?: number;
        userFeedback?: number;
        feedbackType?: 'positive' | 'negative' | 'neutral';
      };
    }
  ): Promise<void> {
    const experiment = await this.getExperiment(tenantId, experimentId);
    if (!experiment) {
      return;
    }

    const currentMetrics = experiment.metrics[variantId] || {
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

    const updatedMetrics: VariantMetrics = { ...currentMetrics };

    // Update based on event type
    if (event.eventType === 'exposure') {
      updatedMetrics.impressions += 1;
      updatedMetrics.lastUsedAt = new Date();
    } else if (event.eventType === 'success') {
      updatedMetrics.successfulResponses += 1;
      updatedMetrics.impressions += 1;
    } else if (event.eventType === 'failure') {
      updatedMetrics.failedResponses += 1;
      updatedMetrics.impressions += 1;
    } else if (event.eventType === 'feedback') {
      if (event.metrics.feedbackType === 'positive') {
        updatedMetrics.positiveFeedback += 1;
      } else if (event.metrics.feedbackType === 'negative') {
        updatedMetrics.negativeFeedback += 1;
      }
      if (event.metrics.userFeedback !== undefined) {
        // Update average feedback score
        const totalFeedback = updatedMetrics.positiveFeedback + updatedMetrics.negativeFeedback;
        updatedMetrics.userFeedbackScore =
          (updatedMetrics.userFeedbackScore * (totalFeedback - 1) + event.metrics.userFeedback) / totalFeedback;
      }
    }

    // Update averages
    if (event.metrics.tokensUsed !== undefined) {
      const totalResponses = updatedMetrics.successfulResponses + updatedMetrics.failedResponses;
      updatedMetrics.averageTokens =
        (updatedMetrics.averageTokens * (totalResponses - 1) + event.metrics.tokensUsed) / totalResponses;
    }

    if (event.metrics.latencyMs !== undefined) {
      const totalResponses = updatedMetrics.successfulResponses + updatedMetrics.failedResponses;
      updatedMetrics.averageLatencyMs =
        (updatedMetrics.averageLatencyMs * (totalResponses - 1) + event.metrics.latencyMs) / totalResponses;
    }

    if (event.metrics.cost !== undefined) {
      updatedMetrics.totalCost += event.metrics.cost;
    }

    // Update experiment
    const container = this.cosmosService.getExperimentsContainer();
    const partitionKey = this.cosmosService.buildPartitionKey(tenantId, experimentId, 'system');
    await this.cosmosService.update<PromptABTest>(
      container,
      experimentId,
      partitionKey,
      {
        [`metrics.${variantId}`]: updatedMetrics,
        updatedAt: new Date(),
      } as any
    );
  }

  /**
   * Calculate variant metrics from events
   */
  private calculateVariantMetrics(events: ExperimentEvent[]): any {
    if (events.length === 0) {
      return {
        samples: 0,
        metrics: {},
      };
    }

    const successEvents = events.filter((e) => e.eventType === 'success');
    const failureEvents = events.filter((e) => e.eventType === 'failure');
    const feedbackEvents = events.filter((e) => e.eventType === 'feedback');

    const tokens = events.filter((e) => e.metrics.tokensUsed !== undefined).map((e) => e.metrics.tokensUsed!);
    const latencies = events.filter((e) => e.metrics.latencyMs !== undefined).map((e) => e.metrics.latencyMs!);
    const costs = events.filter((e) => e.metrics.cost !== undefined).map((e) => e.metrics.cost!);
    const qualities = events.filter((e) => e.metrics.quality !== undefined).map((e) => e.metrics.quality!);
    const feedbacks = feedbackEvents
      .filter((e) => e.metrics.userFeedback !== undefined)
      .map((e) => e.metrics.userFeedback!);

    const positiveFeedback = feedbackEvents.filter((e) => e.metrics.feedbackType === 'positive').length;
    const negativeFeedback = feedbackEvents.filter((e) => e.metrics.feedbackType === 'negative').length;

    return {
      samples: events.length,
      metrics: {
        success_rate: {
          mean: events.length > 0 ? successEvents.length / events.length : 0,
        },
        tokens: {
          mean: tokens.length > 0 ? tokens.reduce((a, b) => a + b, 0) / tokens.length : 0,
        },
        latency: {
          mean: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
          p95: this.percentile(latencies, 0.95),
        },
        cost: {
          mean: costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0,
          total: costs.reduce((a, b) => a + b, 0),
        },
        quality: {
          mean: qualities.length > 0 ? qualities.reduce((a, b) => a + b, 0) / qualities.length : 0,
        },
        satisfaction: {
          mean: feedbacks.length > 0 ? feedbacks.reduce((a, b) => a + b, 0) / feedbacks.length : 0,
          positive: positiveFeedback,
          negative: negativeFeedback,
        },
      },
    };
  }

  /**
   * Calculate statistical significance (simplified t-test)
   */
  private calculateStatisticalSignificance(control: any, treatment: any, metric: string): number {
    // Simplified: return confidence based on sample sizes
    // In production, would use proper t-test
    const controlSamples = control.samples || 0;
    const treatmentSamples = treatment.samples || 0;

    if (controlSamples < 30 || treatmentSamples < 30) {
      return 0.5; // Low confidence with small samples
    }

    // Higher confidence with more samples
    const minSamples = Math.min(controlSamples, treatmentSamples);
    if (minSamples >= 1000) {
      return 0.95;
    } else if (minSamples >= 500) {
      return 0.90;
    } else if (minSamples >= 100) {
      return 0.85;
    }

    return 0.75;
  }

  /**
   * Get metric value from variant results
   */
  private getMetricValue(variantResults: any, metric: string): number {
    switch (metric) {
      case 'quality':
        return variantResults.metrics?.quality?.mean || 0;
      case 'latency':
        return variantResults.metrics?.latency?.mean || 0;
      case 'satisfaction':
        return variantResults.metrics?.satisfaction?.mean || 0;
      case 'cost':
        return variantResults.metrics?.cost?.mean || 0;
      case 'success_rate':
        return variantResults.metrics?.success_rate?.mean || 0;
      default:
        return 0;
    }
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) {return 0;}
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Hash string to number (deterministic)
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
   * Validate status transition
   */
  private validateStatusTransition(current: PromptABTestStatus, next: PromptABTestStatus): void {
    const validTransitions: { [key: string]: PromptABTestStatus[] } = {
      [PromptABTestStatus.Draft]: [PromptABTestStatus.Active, PromptABTestStatus.Cancelled],
      [PromptABTestStatus.Active]: [PromptABTestStatus.Paused, PromptABTestStatus.Completed, PromptABTestStatus.Cancelled],
      [PromptABTestStatus.Paused]: [PromptABTestStatus.Active, PromptABTestStatus.Completed, PromptABTestStatus.Cancelled],
      [PromptABTestStatus.Completed]: [], // Terminal state
      [PromptABTestStatus.Cancelled]: [], // Terminal state
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new Error(`Invalid status transition from ${current} to ${next}`);
    }
  }
}



/**
 * FeedbackLearningService (Plan W6 Layer 7 – Feedback Loop)
 * Records feedback and outcomes, links to predictions, aggregates and reports.
 */

import { randomUUID } from 'crypto';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import type {
  UserFeedback,
  Outcome,
  RecordFeedbackRequest,
  RecordOutcomeRequest,
  FeedbackSummary,
  FeedbackTrends,
} from '../types/feedback-learning.types';

export class FeedbackLearningService {
  private feedbackContainerName: string;
  private outcomeContainerName: string;

  constructor() {
    const config = loadConfig();
    this.feedbackContainerName = config.cosmos_db.containers.user_feedback;
    this.outcomeContainerName = config.cosmos_db.containers.outcome;
  }

  async recordFeedback(tenantId: string, userId: string | undefined, body: RecordFeedbackRequest): Promise<UserFeedback> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const doc: UserFeedback = {
      id,
      tenantId,
      modelId: body.modelId,
      predictionId: body.predictionId,
      opportunityId: body.opportunityId,
      feedbackType: body.feedbackType,
      value: body.value,
      comment: body.comment,
      userId,
      metadata: body.metadata,
      recordedAt: now,
    };
    const container = getContainer(this.feedbackContainerName);
    await container.items.upsert(doc);
    return doc;
  }

  async recordOutcome(tenantId: string, userId: string | undefined, body: RecordOutcomeRequest): Promise<Outcome> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const doc: Outcome = {
      id,
      tenantId,
      modelId: body.modelId,
      predictionId: body.predictionId,
      opportunityId: body.opportunityId,
      outcomeType: body.outcomeType,
      success: body.success,
      value: body.value,
      recordedAt: now,
      userId,
      metadata: body.metadata,
    };
    const container = getContainer(this.outcomeContainerName);
    await container.items.upsert(doc);
    return doc;
  }

  async linkFeedbackToPrediction(
    tenantId: string,
    feedbackId: string,
    predictionId: string
  ): Promise<UserFeedback | null> {
    const container = getContainer(this.feedbackContainerName);
    const { resource: existing } = await container.item(feedbackId, tenantId).read();
    if (!existing) return null;
    const now = new Date().toISOString();
    const updated: UserFeedback = {
      ...existing,
      predictionId,
      linkedAt: now,
    };
    await container.items.upsert(updated);
    return updated;
  }

  async aggregateFeedback(
    tenantId: string,
    modelId: string,
    from: string,
    to: string
  ): Promise<{ byType: Record<string, number>; total: number }> {
    const container = getContainer(this.feedbackContainerName);
    const query = {
      query:
        'SELECT c.feedbackType, COUNT(1) AS cnt FROM c WHERE c.tenantId = @tenantId AND c.modelId = @modelId AND c.recordedAt >= @from AND c.recordedAt <= @to GROUP BY c.feedbackType',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@modelId', value: modelId },
        { name: '@from', value: from },
        { name: '@to', value: to },
      ],
    };
    const { resources } = await container.items.query(query).fetchAll();
    const byType: Record<string, number> = {};
    let total = 0;
    for (const row of resources) {
      byType[row.feedbackType] = row.cnt;
      total += row.cnt;
    }
    return { byType, total };
  }

  async calculateUserSatisfaction(
    tenantId: string,
    modelId: string,
    from: string,
    to: string
  ): Promise<number> {
    const { byType } = await this.aggregateFeedback(tenantId, modelId, from, to);
    const positiveTypes = ['accepted', 'helpful', 'positive', 'relevant'];
    const negativeTypes = ['rejected', 'not_helpful', 'negative', 'irrelevant'];
    let positive = 0;
    let negative = 0;
    for (const [type, count] of Object.entries(byType)) {
      if (positiveTypes.some((p) => type.toLowerCase().includes(p))) positive += count;
      else if (negativeTypes.some((n) => type.toLowerCase().includes(n))) negative += count;
    }
    const total = positive + negative;
    if (total === 0) return 0;
    return Math.round((positive / total) * 100);
  }

  async identifyPredictionErrors(
    tenantId: string,
    modelId: string,
    from: string,
    to: string
  ): Promise<Outcome[]> {
    const container = getContainer(this.outcomeContainerName);
    const { resources } = await container.items
      .query({
        query:
          'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.modelId = @modelId AND c.success = false AND c.recordedAt >= @from AND c.recordedAt <= @to',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@modelId', value: modelId },
          { name: '@from', value: from },
          { name: '@to', value: to },
        ],
      })
      .fetchAll();
    return resources as Outcome[];
  }

  async generateFeedbackReport(
    tenantId: string,
    modelId: string,
    from: string,
    to: string
  ): Promise<FeedbackSummary> {
    const { byType, total } = await this.aggregateFeedback(tenantId, modelId, from, to);
    const satisfaction = await this.calculateUserSatisfaction(tenantId, modelId, from, to);
    const container = getContainer(this.feedbackContainerName);
    const { resources } = await container.items
      .query({
        query:
          'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.modelId = @modelId AND IS_DEFINED(c.predictionId) AND c.predictionId != null AND c.recordedAt >= @from AND c.recordedAt <= @to',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@modelId', value: modelId },
          { name: '@from', value: from },
          { name: '@to', value: to },
        ],
      })
      .fetchAll();
    const linkedToPrediction = resources[0] ?? 0;
    return {
      modelId,
      tenantId,
      period: { from, to },
      totalFeedback: total,
      byType,
      satisfactionScore: satisfaction,
      linkedToPrediction,
    };
  }

  async trackFeedbackTrends(
    tenantId: string,
    modelId: string,
    from: string,
    to: string,
    options?: { alertThreshold?: number }
  ): Promise<FeedbackTrends> {
    const container = getContainer(this.feedbackContainerName);
    const { resources } = await container.items
      .query({
        query:
          'SELECT c.recordedAt FROM c WHERE c.tenantId = @tenantId AND c.modelId = @modelId AND c.recordedAt >= @from AND c.recordedAt <= @to',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@modelId', value: modelId },
          { name: '@from', value: from },
          { name: '@to', value: to },
        ],
      })
      .fetchAll();
    const byDate: Record<string, { count: number; satisfaction?: number }> = {};
    for (const r of resources) {
      const date = (r.recordedAt as string).slice(0, 10);
      if (!byDate[date]) byDate[date] = { count: 0 };
      byDate[date].count += 1;
    }
    const series = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { count, satisfaction }]) => ({ date, count, satisfaction }));
    let alert = false;
    let message: string | undefined;
    const threshold = options?.alertThreshold ?? 0;
    if (threshold > 0) {
      const satisfaction = await this.calculateUserSatisfaction(tenantId, modelId, from, to);
      if (satisfaction < threshold) {
        alert = true;
        message = `Satisfaction ${satisfaction}% below threshold ${threshold}% for model ${modelId}`;
      }
    }
    return {
      modelId,
      tenantId,
      period: { from, to },
      series,
      alert: alert ? true : undefined,
      message,
    };
  }
}

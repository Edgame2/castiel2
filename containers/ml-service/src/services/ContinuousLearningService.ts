/**
 * Continuous Learning Service (Plan W6 Layer 8 – Learning Loop).
 * Improvement opportunities (suggestions) for models; publishes ml.improvement.suggested.
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { publishMlImprovementSuggested } from '../events/publishers/MLServiceEventPublisher';
import type { ImprovementOpportunity } from '../types/ml.types';

type Priority = 'low' | 'medium' | 'high';

export class ContinuousLearningService {
  private get containerName(): string {
    return loadConfig().cosmos_db?.containers?.improvement_opportunity ?? 'ml_improvement_opportunity';
  }

  /**
   * Get improvement suggestions for a model (tenant-scoped).
   */
  async getSuggestions(
    tenantId: string,
    modelId: string,
    options?: { acknowledged?: boolean; limit?: number }
  ): Promise<ImprovementOpportunity[]> {
    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.modelId = @modelId';
    const parameters: { name: string; value: string | boolean }[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@modelId', value: modelId },
    ];
    if (options?.acknowledged === false) {
      query += ' AND (NOT IS_DEFINED(c.acknowledgedAt) OR c.acknowledgedAt = null)';
    }
    query += ' ORDER BY c.createdAt DESC';
    const limit = options?.limit ?? 50;
    const { resources } = await container.items
      .query<ImprovementOpportunity>({ query, parameters })
      .fetchAll();
    return resources.slice(0, limit);
  }

  /**
   * Add an improvement suggestion and publish ml.improvement.suggested.
   */
  async addSuggestion(
    tenantId: string,
    modelId: string,
    type: string,
    priority: Priority,
    reason: string,
    suggestedAction?: string
  ): Promise<ImprovementOpportunity> {
    const container = getContainer(this.containerName);
    const id = uuidv4();
    const now = new Date().toISOString();
    const doc: ImprovementOpportunity = {
      id,
      tenantId,
      modelId,
      type,
      priority,
      reason,
      suggestedAction,
      createdAt: now,
    };
    await container.items.upsert(doc);
    await publishMlImprovementSuggested(tenantId, {
      modelId,
      type,
      priority,
      reason,
      suggestedAction,
    });
    return doc;
  }

  /**
   * Acknowledge a suggestion (optional).
   */
  async acknowledge(tenantId: string, suggestionId: string): Promise<ImprovementOpportunity | null> {
    const container = getContainer(this.containerName);
    const { resource: existing } = await container.item(suggestionId, tenantId).read<ImprovementOpportunity>();
    if (!existing) return null;
    const updated: ImprovementOpportunity = {
      ...existing,
      acknowledgedAt: new Date().toISOString(),
    };
    await container.items.upsert(updated);
    return updated;
  }
}

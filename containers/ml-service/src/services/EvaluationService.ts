/**
 * Evaluation Service (Plan W6 Layer 8 – Learning Loop).
 * Exposes drift metrics for models; persistence is done by ModelMonitoringService when drift is detected.
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import type { DriftMetrics } from '../types/ml.types';

export class EvaluationService {
  private get containerName(): string {
    return loadConfig().cosmos_db?.containers?.drift_metrics ?? 'ml_drift_metrics';
  }

  /**
   * Get drift metrics for a model (tenant-scoped).
   */
  async getDrift(
    tenantId: string,
    modelId: string,
    options?: { from?: string; to?: string; limit?: number }
  ): Promise<DriftMetrics[]> {
    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.modelId = @modelId';
    const parameters: { name: string; value: string | number }[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@modelId', value: modelId },
    ];
    if (options?.from) {
      query += ' AND c.recordedAt >= @from';
      parameters.push({ name: '@from', value: options.from });
    }
    if (options?.to) {
      query += ' AND c.recordedAt <= @to';
      parameters.push({ name: '@to', value: options.to });
    }
    query += ' ORDER BY c.recordedAt DESC';
    const limit = options?.limit ?? 100;
    const { resources } = await container.items
      .query<DriftMetrics>({ query, parameters })
      .fetchAll();
    return resources.slice(0, limit);
  }

  /**
   * Record drift metrics (called by ModelMonitoringService when drift is detected).
   */
  async recordDrift(
    tenantId: string,
    modelId: string,
    metric: string,
    value: number,
    options?: { threshold?: number; segment?: string; baselineVersion?: number; currentVersion?: number }
  ): Promise<DriftMetrics> {
    const container = getContainer(this.containerName);
    const id = `drift_${modelId}_${metric}_${Date.now()}`;
    const doc: DriftMetrics = {
      id,
      tenantId,
      modelId,
      metric,
      value,
      baselineVersion: options?.baselineVersion,
      currentVersion: options?.currentVersion,
      segment: options?.segment,
      recordedAt: new Date().toISOString(),
    };
    await container.items.upsert(doc);
    return doc;
  }
}

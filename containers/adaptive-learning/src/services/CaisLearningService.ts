/**
 * CaisLearningService (Phase 12)
 * Batch job: for tenants with automaticLearningEnabled, load recent outcomes from adaptive_outcomes,
 * correlate with predictions to get (predictedValue, outcomeValue) per component, then update
 * adaptive_weights (and optionally adaptive_model_selections) using a simple accuracy-based rule.
 * Algorithm: exponential moving average of accuracy per component; weights clamped to [0.1, 0.95].
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { AdaptiveWeightsService } from './AdaptiveWeightsService';
import { DEFAULT_WEIGHTS } from '../types/cais.types';
import type { LearnedWeights } from '../types/cais.types';

const ALPHA = 0.1; // smoothing for weight update
const MIN_WEIGHT = 0.1;
const MAX_WEIGHT = 0.95;
const OUTCOMES_DAYS = 30; // load outcomes from last N days

/** Map prediction component to model-selection context (risk-evaluation -> risk-scoring, etc.). */
const COMPONENT_TO_CONTEXT: Record<string, string> = {
  'risk-evaluation': 'risk-scoring',
  recommendations: 'recommendations',
  forecasting: 'forecasting',
  'ml-prediction': 'ml-prediction',
};

interface OutcomeDoc {
  id: string;
  tenantId: string;
  type: string;
  predictionId: string;
  outcomeValue: number;
  outcomeType?: string;
  context?: Record<string, unknown>;
  createdAt?: string;
}

interface PredictionDoc {
  id: string;
  tenantId: string;
  type: string;
  component: string;
  predictionId: string;
  predictedValue?: number | Record<string, unknown>;
  context?: Record<string, unknown>;
  createdAt?: string;
}

function toNumericValue(v: number | Record<string, unknown> | undefined): number {
  if (v === undefined || v === null) return 0.5;
  if (typeof v === 'number' && !Number.isNaN(v)) return Math.max(0, Math.min(1, v));
  if (typeof v === 'object' && v !== null) {
    const val = (v as Record<string, unknown>).value ?? (v as Record<string, unknown>).score;
    if (typeof val === 'number' && !Number.isNaN(val)) return Math.max(0, Math.min(1, val));
  }
  return 0.5;
}

export class CaisLearningService {
  private outcomesContainerName: string;
  private weightsService: AdaptiveWeightsService;

  constructor() {
    const config = loadConfig();
    this.outcomesContainerName = config.cosmos_db.containers?.outcomes ?? 'adaptive_outcomes';
    this.weightsService = new AdaptiveWeightsService();
  }

  /**
   * Run the CAIS learning job: for each tenant with automaticLearningEnabled, load outcomes,
   * correlate with predictions, compute accuracy per component, update weights (and optionally model selection).
   */
  async runLearningJob(options?: { outcomesDays?: number }): Promise<{ tenantsProcessed: number; weightsUpdated: number }> {
    const tenantIds = await this.weightsService.listTenantIdsWithAutomaticLearning();
    if (tenantIds.length === 0) {
      return { tenantsProcessed: 0, weightsUpdated: 0 };
    }

    const days = options?.outcomesDays ?? OUTCOMES_DAYS;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    let totalWeightsUpdated = 0;

    for (const tenantId of tenantIds) {
      try {
        const updated = await this.runLearningForTenant(tenantId, sinceIso);
        totalWeightsUpdated += updated;
      } catch (error: unknown) {
        console.warn('CaisLearningService.runLearningForTenant failed', {
          tenantId,
          error: error instanceof Error ? error.message : String(error),
          service: 'adaptive-learning',
        });
      }
    }

    return { tenantsProcessed: tenantIds.length, weightsUpdated: totalWeightsUpdated };
  }

  /**
   * Load outcomes (type=outcome) for tenant since date, correlate with predictions, update weights per component.
   */
  async runLearningForTenant(tenantId: string, sinceIso: string): Promise<number> {
    const container = getContainer(this.outcomesContainerName);

    const { resources: outcomes } = await container.items
      .query<OutcomeDoc>(
        {
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.type = @type AND c.createdAt >= @since',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@type', value: 'outcome' },
            { name: '@since', value: sinceIso },
          ],
        },
        { partitionKey: tenantId }
      )
      .fetchAll();

    if (!outcomes?.length) return 0;

    const predictionIds = [...new Set(outcomes.map((o) => o.predictionId).filter(Boolean))];
    if (predictionIds.length === 0) return 0;

    const { resources: predictions } = await container.items
      .query<PredictionDoc>(
        {
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.type = @type AND ARRAY_CONTAINS(@predictionIds, c.predictionId)',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@type', value: 'prediction' },
            { name: '@predictionIds', value: predictionIds },
          ],
        },
        { partitionKey: tenantId }
      )
      .fetchAll();

    const predictionByPredictionId = new Map<string, PredictionDoc>();
    for (const p of predictions ?? []) {
      if (p.predictionId) predictionByPredictionId.set(p.predictionId, p);
    }

    const byComponent: Record<string, { predicted: number[]; actual: number[] }> = {};

    for (const o of outcomes) {
      const pred = predictionByPredictionId.get(o.predictionId);
      if (!pred?.component) continue;
      const predictedVal = toNumericValue(pred.predictedValue);
      const actualVal = typeof o.outcomeValue === 'number' && !Number.isNaN(o.outcomeValue)
        ? Math.max(0, Math.min(1, o.outcomeValue))
        : 0.5;
      if (!byComponent[pred.component]) {
        byComponent[pred.component] = { predicted: [], actual: [] };
      }
      byComponent[pred.component].predicted.push(predictedVal);
      byComponent[pred.component].actual.push(actualVal);
    }

    let weightsUpdated = 0;
    for (const [component, { predicted, actual }] of Object.entries(byComponent)) {
      if (predicted.length === 0) continue;
      const mae = predicted.reduce((sum, p, i) => sum + Math.abs(p - (actual[i] ?? 0.5)), 0) / predicted.length;
      const accuracy = 1 - Math.min(1, mae);

      const currentWeights = await this.weightsService.getWeights(tenantId, component);
      const keys = ['ruleBased', 'ml', 'ai', 'historical'] as const;
      const updates: LearnedWeights = {};
      for (const key of keys) {
        const oldVal = currentWeights[key] ?? DEFAULT_WEIGHTS[key] ?? 0.9;
        const newVal = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, oldVal * (1 - ALPHA) + ALPHA * accuracy));
        updates[key] = newVal;
      }
      await this.weightsService.upsertWeights(tenantId, component, updates);
      weightsUpdated++;

      const context = COMPONENT_TO_CONTEXT[component] ?? component;
      const currentModel = await this.weightsService.getModelSelection(tenantId, context);
      const newConfidence = Math.max(0.5, Math.min(0.95, currentModel.confidence * 0.9 + 0.1 * accuracy));
      await this.weightsService.upsertModelSelection(tenantId, context, {
        modelId: currentModel.modelId,
        confidence: newConfidence,
      });
    }

    return weightsUpdated;
  }
}

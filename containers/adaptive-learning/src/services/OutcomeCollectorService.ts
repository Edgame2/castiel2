/**
 * OutcomeCollectorService
 * CAIS outcome collection: recordPrediction (before/at prediction), recordOutcome (when actual known).
 * MISSING_FEATURES 3.2
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';

export interface RecordPredictionInput {
  component: string;
  predictionId: string;
  context?: Record<string, unknown>;
  predictedValue?: number | Record<string, unknown>;
}

export interface RecordOutcomeInput {
  predictionId: string;
  outcomeValue: number;
  outcomeType: 'success' | 'failure' | 'partial';
  context?: Record<string, unknown>;
}

export interface RecordFromEventInput {
  component: string;
  prediction: number | Record<string, unknown>;
  context?: Record<string, unknown>;
}

export class OutcomeCollectorService {
  private containerName: string;

  constructor() {
    const config = loadConfig();
    this.containerName = config.cosmos_db.containers?.outcomes ?? 'adaptive_outcomes';
  }

  /**
   * Record a prediction (called before or when returning a prediction). Links to recordOutcome when actual is known.
   */
  async recordPrediction(tenantId: string, input: RecordPredictionInput): Promise<{ id: string }> {
    const id = uuidv4();
    const doc = {
      id,
      tenantId,
      type: 'prediction',
      component: input.component,
      predictionId: input.predictionId,
      context: input.context ?? {},
      predictedValue: input.predictedValue,
      createdAt: new Date().toISOString(),
    };
    try {
      const container = getContainer(this.containerName);
      await container.items.create(doc, { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]);
      return { id };
    } catch (error: unknown) {
      console.warn('OutcomeCollector.recordPrediction failed', {
        error: (error as Error).message,
        component: input.component,
        tenantId,
        service: 'adaptive-learning',
      });
      throw error;
    }
  }

  /**
   * Record the actual outcome for a prediction (e.g. when opportunity closes). Used for continuous learning.
   */
  async recordOutcome(tenantId: string, input: RecordOutcomeInput): Promise<{ id: string }> {
    const id = uuidv4();
    const doc = {
      id,
      tenantId,
      type: 'outcome',
      predictionId: input.predictionId,
      outcomeValue: input.outcomeValue,
      outcomeType: input.outcomeType,
      context: input.context ?? {},
      createdAt: new Date().toISOString(),
    };
    try {
      const container = getContainer(this.containerName);
      await container.items.create(doc, { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]);
      return { id };
    } catch (error: unknown) {
      console.warn('OutcomeCollector.recordOutcome failed', {
        error: (error as Error).message,
        predictionId: input.predictionId,
        tenantId,
        service: 'adaptive-learning',
      });
      throw error;
    }
  }

  /**
   * Record from adaptive.learning.outcome.recorded event (component, prediction, context). Stores as outcome with outcomeType 'prediction'.
   */
  async recordFromEvent(tenantId: string, input: RecordFromEventInput): Promise<{ id: string }> {
    const id = uuidv4();
    const pred = input.prediction;
    const outcomeValue = typeof pred === 'number' ? pred : (pred as Record<string, unknown>)?.value ?? (pred as Record<string, unknown>)?.score ?? 0.5;
    const doc = {
      id,
      tenantId,
      type: 'outcome',
      predictionId: id,
      component: input.component,
      outcomeValue: typeof outcomeValue === 'number' ? outcomeValue : 0.5,
      outcomeType: 'prediction' as const,
      context: { ...input.context, prediction: pred },
      createdAt: new Date().toISOString(),
    };
    try {
      const container = getContainer(this.containerName);
      await container.items.create(doc, { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]);
      return { id };
    } catch (error: unknown) {
      console.warn('OutcomeCollector.recordFromEvent failed', {
        error: (error as Error).message,
        component: input.component,
        tenantId,
        service: 'adaptive-learning',
      });
      throw error;
    }
  }
}

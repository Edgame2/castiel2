/**
 * ForecastAccuracyService
 * Tracks forecast accuracy over time: store predictions, record actuals, compute MAPE, bias, R²
 * MISSING_FEATURES 5.4
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import type {
  ForecastType,
  ForecastPrediction,
  RecordActualRequest,
  AccuracyMetricsOptions,
  ForecastAccuracyMetrics,
} from '../types/forecasting.types.js';

export class ForecastAccuracyService {
  private containerName: string;

  constructor() {
    const config = loadConfig();
    this.containerName = config.cosmos_db.containers.predictions;
  }

  /**
   * Store a prediction for later accuracy comparison.
   * Called from ForecastingService when a forecast is produced.
   */
  async storePrediction(params: {
    tenantId: string;
    opportunityId: string;
    forecastId: string;
    forecastType: ForecastType;
    predictedValue: number;
    predictedAt?: Date;
  }): Promise<ForecastPrediction> {
    const id = uuidv4();
    const now = new Date();
    const doc: ForecastPrediction = {
      id,
      tenantId: params.tenantId,
      opportunityId: params.opportunityId,
      forecastId: params.forecastId,
      forecastType: params.forecastType,
      predictedValue: params.predictedValue,
      predictedAt: params.predictedAt || now,
      createdAt: now,
    };
    try {
      const container = getContainer(this.containerName);
      await container.items.create(doc, { partitionKey: params.tenantId } as any);
      return doc;
    } catch (error: unknown) {
      const err = error as Error;
      log.error('Failed to store forecast prediction', err, {
        opportunityId: params.opportunityId,
        tenantId: params.tenantId,
        forecastType: params.forecastType,
        service: 'forecasting',
      });
      throw error;
    }
  }

  /**
   * Record an actual value for a prediction. If predictionId is omitted,
   * matches the most recent unstored actual for opportunityId+forecastType.
   */
  async recordActual(tenantId: string, request: RecordActualRequest): Promise<ForecastPrediction | null> {
    try {
      const container = getContainer(this.containerName);
      const actualAt = request.actualAt ? new Date(request.actualAt) : new Date();

      let pred: ForecastPrediction | null;
      if (request.predictionId) {
        const { resource } = await container.item(request.predictionId, tenantId).read<ForecastPrediction>();
        pred = resource || null;
      } else {
        const { resources } = await container.items
          .query<ForecastPrediction>(
            {
              query:
                'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.opportunityId = @opportunityId AND c.forecastType = @forecastType AND (NOT IS_DEFINED(c.actualValue) OR c.actualValue = null) ORDER BY c.predictedAt DESC OFFSET 0 LIMIT 1',
              parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@opportunityId', value: request.opportunityId },
                { name: '@forecastType', value: request.forecastType },
              ],
            },
            { partitionKey: tenantId }
          )
          .fetchAll();
        pred = resources?.[0] ?? null;
      }

      if (!pred) {
        log.warn('No matching prediction found for recordActual', {
          opportunityId: request.opportunityId,
          forecastType: request.forecastType,
          predictionId: request.predictionId,
          tenantId,
          service: 'forecasting',
        });
        return null;
      }

      const updated: ForecastPrediction = {
        ...pred,
        actualValue: request.actualValue,
        actualAt,
      };
      await container.item(pred.id, tenantId).replace(updated);
      return updated;
    } catch (error: unknown) {
      const err = error as Error;
      log.error('Failed to record actual', err, {
        opportunityId: request.opportunityId,
        tenantId,
        forecastType: request.forecastType,
        service: 'forecasting',
      });
      throw error;
    }
  }

  /**
   * Compute accuracy metrics over prediction–actual pairs: MAPE, forecast bias, R².
   */
  async getAccuracyMetrics(tenantId: string, options?: AccuracyMetricsOptions): Promise<ForecastAccuracyMetrics> {
    try {
      const container = getContainer(this.containerName);
      let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND IS_DEFINED(c.actualValue) AND c.actualValue != null';
      const parameters: { name: string; value: string }[] = [{ name: '@tenantId', value: tenantId }];

      if (options?.forecastType) {
        query += ' AND c.forecastType = @forecastType';
        parameters.push({ name: '@forecastType', value: options.forecastType });
      }
      if (options?.startDate) {
        query += ' AND c.actualAt >= @startDate';
        parameters.push({ name: '@startDate', value: options.startDate });
      }
      if (options?.endDate) {
        query += ' AND c.actualAt <= @endDate';
        parameters.push({ name: '@endDate', value: options.endDate });
      }

      const { resources } = await container.items
        .query<ForecastPrediction>({ query, parameters }, { partitionKey: tenantId } as any)
        .fetchAll();

      const pairs = (resources || []).filter(
        (r) => typeof r.actualValue === 'number' && typeof r.predictedValue === 'number'
      );
      const n = pairs.length;

      const result: ForecastAccuracyMetrics = {
        mape: 0,
        forecastBias: 0,
        r2: 0,
        sampleCount: n,
        forecastType: options?.forecastType,
        startDate: options?.startDate,
        endDate: options?.endDate,
      };

      if (n === 0) return result;

      const actuals = pairs.map((p) => p.actualValue as number);
      const predicted = pairs.map((p) => p.predictedValue);
      const meanActual = actuals.reduce((s, a) => s + a, 0) / n;

      // MAPE: mean of |actual - predicted| / |actual| * 100; skip actual=0
      const mapeValues: number[] = [];
      for (let i = 0; i < n; i++) {
        const a = actuals[i];
        if (a !== 0) mapeValues.push((Math.abs(a - predicted[i]) / Math.abs(a)) * 100);
      }
      result.mape = mapeValues.length > 0 ? mapeValues.reduce((s, v) => s + v, 0) / mapeValues.length : 0;

      // Forecast bias: mean(actual - predicted)
      const biases = pairs.map((p) => (p.actualValue as number) - p.predictedValue);
      result.forecastBias = biases.reduce((s, b) => s + b, 0) / n;

      // R² = 1 - SS_res / SS_tot
      const SS_res = pairs.reduce((s, p) => s + Math.pow((p.actualValue as number) - p.predictedValue, 2), 0);
      const SS_tot = actuals.reduce((s, a) => s + Math.pow(a - meanActual, 2), 0);
      result.r2 = SS_tot > 0 ? 1 - SS_res / SS_tot : 0;

      return result;
    } catch (error: unknown) {
      const err = error as Error;
      log.error('Failed to get accuracy metrics', err, { tenantId, service: 'forecasting' });
      throw error;
    }
  }
}

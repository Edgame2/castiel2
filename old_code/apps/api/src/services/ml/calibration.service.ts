/**
 * Calibration Service
 * 
 * Post-model calibration for risk scoring predictions.
 * Implements Platt Scaling and Isotonic Regression.
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { CosmosClient, Database } from '@azure/cosmos';
import type { CalibrationParameters, CalibrationMethod } from '../../types/ml.types.js';

export class CalibrationService {
  constructor(
    private monitoring: IMonitoringProvider,
    private cosmosClient: CosmosClient,
    private database: Database
  ) {}

  /**
   * Apply calibration to raw model output
   */
  async applyCalibration(
    rawScore: number,
    modelVersion: string
  ): Promise<number> {
    try {
      // Load calibration parameters
      const params = await this.loadCalibrationParameters(modelVersion);
      
      if (!params) {
        // No calibration parameters - return raw score
        this.monitoring.trackMetric('ml.calibration.missing', 1, { modelVersion });
        return rawScore;
      }

      // Apply calibration based on method
      switch (params.method) {
        case 'platt_scaling':
          return this.applyPlattScaling(rawScore, params.parameters);
        case 'isotonic_regression':
          return this.applyIsotonicRegression(rawScore, params.parameters);
        default:
          this.monitoring.trackException(new Error(`Unknown calibration method: ${params.method}`), {
            operation: 'calibration.apply',
            modelVersion,
          });
          return rawScore;
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'calibration.apply',
        modelVersion,
      });
      // Return raw score on error (fail gracefully)
      return rawScore;
    }
  }

  /**
   * Load calibration parameters for a model version
   */
  async loadCalibrationParameters(
    modelVersion: string
  ): Promise<CalibrationParameters | null> {
    try {
      // For Phase 1, store calibration parameters in Cosmos DB
      // In production, could be in Azure ML Registry or separate storage
      const container = this.database.container('ml_models');
      
      // Get model by version to find calibration parameters
      const query = {
        query: 'SELECT * FROM c WHERE c.version = @version',
        parameters: [{ name: '@version', value: modelVersion }],
      };

      const { resources } = await container.items.query(query).fetchAll();
      
      if (resources.length === 0) {
        return null;
      }

      const model = resources[0] as any;
      
      // Calibration parameters stored in model metadata
      if (model.calibrationParameters) {
        return model.calibrationParameters as CalibrationParameters;
      }

      return null;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'calibration.load_parameters',
        modelVersion,
      });
      return null;
    }
  }

  /**
   * Store calibration parameters for a model version
   */
  async storeCalibrationParameters(
    modelVersion: string,
    parameters: CalibrationParameters
  ): Promise<void> {
    try {
      const container = this.database.container('ml_models');
      
      // Update model document with calibration parameters
      const query = {
        query: 'SELECT * FROM c WHERE c.version = @version',
        parameters: [{ name: '@version', value: modelVersion }],
      };

      const { resources } = await container.items.query(query).fetchAll();
      
      if (resources.length === 0) {
        throw new Error(`Model version not found: ${modelVersion}`);
      }

      const model = resources[0];
      model.calibrationParameters = parameters;
      model.updatedAt = new Date();

      await container.items.upsert(model);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'calibration.store_parameters',
        modelVersion,
      });
      throw error;
    }
  }

  // ============================================================================
  // Private Methods - Calibration Algorithms
  // ============================================================================

  /**
   * Apply Platt Scaling: sigmoid(a * x + b)
   */
  private applyPlattScaling(
    rawScore: number,
    params: CalibrationParameters['parameters']
  ): number {
    const a = params.a ?? 1.0;
    const b = params.b ?? 0.0;

    // Sigmoid function: 1 / (1 + exp(-(a * x + b)))
    const z = a * rawScore + b;
    const calibrated = 1 / (1 + Math.exp(-z));

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, calibrated));
  }

  /**
   * Apply Isotonic Regression: piecewise linear function
   */
  private applyIsotonicRegression(
    rawScore: number,
    params: CalibrationParameters['parameters']
  ): number {
    const thresholds = params.thresholds || [];
    const values = params.values || [];

    if (thresholds.length === 0 || values.length === 0) {
      // No calibration data - return raw score
      return rawScore;
    }

    // Find the segment containing rawScore
    for (let i = 0; i < thresholds.length - 1; i++) {
      if (rawScore >= thresholds[i] && rawScore <= thresholds[i + 1]) {
        // Linear interpolation
        const t = (rawScore - thresholds[i]) / (thresholds[i + 1] - thresholds[i]);
        const calibrated = values[i] + t * (values[i + 1] - values[i]);
        return Math.max(0, Math.min(1, calibrated));
      }
    }

    // Out of range - use nearest endpoint
    if (rawScore <= thresholds[0]) {
      return Math.max(0, Math.min(1, values[0]));
    }
    if (rawScore >= thresholds[thresholds.length - 1]) {
      return Math.max(0, Math.min(1, values[values.length - 1]));
    }

    return rawScore;
  }
}

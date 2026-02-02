/**
 * Trust Level Service
 * Calculates trust levels for risk evaluations
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { DataQualityService } from './DataQualityService';
import type { EvaluationDataQuality } from '../types/risk-analytics.types';

export type TrustLevel = 'high' | 'medium' | 'low' | 'unreliable';

export interface TrustLevelCalculation {
  opportunityId: string;
  tenantId: string;
  trustLevel: TrustLevel;
  score: number; // 0-1
  factors: {
    dataQuality: number;
    modelConfidence: number;
    historicalAccuracy: number;
    dataCompleteness: number;
  };
  calculatedAt: Date | string;
}

export class TrustLevelService {
  private _config: ReturnType<typeof loadConfig>;
  private dataQualityService: DataQualityService;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance, dataQualityService?: DataQualityService) {
    this.app = app ?? null;
    this._config = loadConfig();
    this.dataQualityService = dataQualityService ?? new DataQualityService(app);
  }

  /**
   * Calculate trust level for a risk evaluation.
   * When evaluationData.dataQuality is provided (e.g. from latest evaluation), uses it for dataQuality and dataCompleteness factors (Plan §11.6, §906).
   */
  async calculateTrustLevel(
    opportunityId: string,
    tenantId: string,
    evaluationData: {
      modelConfidence?: number;
      dataCompleteness?: number;
      historicalAccuracy?: number;
      /** When provided (e.g. from latest evaluation), used for dataQuality and dataCompleteness; skips DataQualityService fetch. */
      dataQuality?: EvaluationDataQuality;
    }
  ): Promise<TrustLevelCalculation> {
    try {
      void this._config;
      void this.app;
      let dataQuality: number;
      let dataCompleteness: number;

      if (evaluationData.dataQuality) {
        dataQuality = evaluationData.dataQuality.score;
        dataCompleteness = evaluationData.dataQuality.completenessPct / 100;
      } else {
        const qualityScore = await this.dataQualityService.evaluateQuality(opportunityId, tenantId);
        dataQuality = qualityScore.overallScore;
        dataCompleteness = evaluationData.dataCompleteness ?? qualityScore.completeness;
      }

      const modelConfidence = evaluationData.modelConfidence || 0.8;
      const historicalAccuracy = evaluationData.historicalAccuracy || 0.7;

      // Calculate overall trust score
      const score = (
        dataQuality * 0.3 +
        modelConfidence * 0.3 +
        historicalAccuracy * 0.2 +
        dataCompleteness * 0.2
      );

      // Determine trust level
      let trustLevel: TrustLevel;
      if (score >= 0.8) {
        trustLevel = 'high';
      } else if (score >= 0.6) {
        trustLevel = 'medium';
      } else if (score >= 0.4) {
        trustLevel = 'low';
      } else {
        trustLevel = 'unreliable';
      }

      const calculation: TrustLevelCalculation = {
        opportunityId,
        tenantId,
        trustLevel,
        score,
        factors: {
          dataQuality,
          modelConfidence,
          historicalAccuracy,
          dataCompleteness,
        },
        calculatedAt: new Date(),
      };

      return calculation;
    } catch (error: unknown) {
      log.error('Failed to calculate trust level', error instanceof Error ? error : new Error(String(error)), { tenantId, opportunityId });
      throw error;
    }
  }
}

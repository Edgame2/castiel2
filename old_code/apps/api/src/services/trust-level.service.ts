/**
 * Trust Level Service
 * Calculates trust levels (high/medium/low/unreliable) based on
 * data quality, completeness, service availability, and confidence calibration
 */

import type {
  RiskEvaluationAssumptions,
  TrustLevel,
} from '../types/risk-analysis.types.js';
import type { DataQualityReport } from './data-quality.service.js';

export interface TrustLevelCalculation {
  trustLevel: TrustLevel;
  factors: string[];
  score: number; // 0-1 trust score
}

export class TrustLevelService {
  /**
   * Calculate trust level based on assumptions and data quality
   */
  calculateTrustLevel(
    assumptions: RiskEvaluationAssumptions,
    dataQuality: DataQualityReport
  ): TrustLevelCalculation {
    const factors: string[] = [];
    let trustScore = 1.0;

    // Factor 1: Data quality score (30% weight)
    if (dataQuality.qualityScore < 0.5) {
      factors.push('Low data quality score');
      trustScore -= 0.3;
    } else if (dataQuality.qualityScore < 0.7) {
      factors.push('Moderate data quality concerns');
      trustScore -= 0.15;
    }

    // Factor 2: Data completeness (20% weight)
    if (assumptions.dataCompleteness < 0.5) {
      factors.push('Incomplete data');
      trustScore -= 0.2;
    } else if (assumptions.dataCompleteness < 0.8) {
      factors.push('Some data missing');
      trustScore -= 0.1;
    }

    // Factor 3: Service availability (20% weight)
    const criticalServicesAvailable = 
      assumptions.serviceAvailability.groundingService &&
      assumptions.serviceAvailability.vectorSearch;
    
    if (!criticalServicesAvailable) {
      factors.push('Critical services unavailable');
      trustScore -= 0.2;
    } else if (!assumptions.serviceAvailability.historicalPatterns) {
      factors.push('Historical patterns unavailable');
      trustScore -= 0.05;
    }

    // Factor 4: Context completeness (15% weight)
    if (assumptions.contextTruncated) {
      factors.push('Context was truncated');
      trustScore -= 0.15;
    } else if (assumptions.contextTokenCount < 500) {
      factors.push('Limited context available');
      trustScore -= 0.08;
    }

    // Factor 5: Data staleness (10% weight)
    if (dataQuality.stalenessCategory === 'critical' || dataQuality.stalenessCategory === 'stale') {
      factors.push('Data is stale');
      trustScore -= 0.1;
    } else if (dataQuality.stalenessCategory === 'aging') {
      factors.push('Data is aging');
      trustScore -= 0.05;
    }

    // Factor 6: Missing relationships (5% weight)
    if (assumptions.missingRelatedShards.length > 0) {
      factors.push(`Missing ${assumptions.missingRelatedShards.length} expected relationship(s)`);
      trustScore -= Math.min(0.05, assumptions.missingRelatedShards.length * 0.01);
    }

    // Ensure score is between 0 and 1
    trustScore = Math.max(0, Math.min(1, trustScore));

    // Determine trust level
    let trustLevel: TrustLevel;
    if (trustScore >= 0.8) {
      trustLevel = 'high';
    } else if (trustScore >= 0.6) {
      trustLevel = 'medium';
    } else if (trustScore >= 0.4) {
      trustLevel = 'low';
    } else {
      trustLevel = 'unreliable';
    }

    // Add default factors if none identified
    if (factors.length === 0) {
      factors.push('All quality indicators are good');
    }

    return {
      trustLevel,
      factors,
      score: trustScore,
    };
  }
}

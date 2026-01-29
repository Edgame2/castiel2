/**
 * Reactivation Prediction Service (W9 Layer 3 – REQUIREMENTS_GAP_ANALYSIS FR-3.11).
 * Produces ReactivationPrediction from dormant features (heuristic until ML model is trained).
 */

import { FeatureStoreService } from './FeatureStoreService';
import type {
  ReactivationPrediction,
  OptimalReactivationWindow,
  RecommendedReactivationApproach,
  KeySuccessFactor,
  ReactivationRisk,
  DormantOpportunityFeatures,
} from '../types/feature-store.types';

export class ReactivationPredictionService {
  constructor(private featureStoreService: FeatureStoreService) {}

  /**
   * Predict reactivation probability and strategy for an opportunity (heuristic from dormant features).
   */
  async predictReactivation(tenantId: string, opportunityId: string): Promise<ReactivationPrediction | null> {
    const features = await this.featureStoreService.extractDormantOpportunityFeatures(tenantId, opportunityId);
    if (!features) return null;

    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 7);

    const { reactivationProbability, confidence } = this.computeProbabilityAndConfidence(features);
    const optimalReactivationWindow: OptimalReactivationWindow = this.buildOptimalWindow(features, now, windowEnd);
    const recommendedApproach: RecommendedReactivationApproach = this.buildRecommendedApproach(features);
    const keySuccessFactors: KeySuccessFactor[] = this.buildKeySuccessFactors(features);
    const reactivationRisks: ReactivationRisk[] = this.buildReactivationRisks(features);

    return {
      reactivationProbability,
      confidence,
      optimalReactivationWindow,
      recommendedApproach,
      keySuccessFactors,
      reactivationRisks,
    };
  }

  private computeProbabilityAndConfidence(features: DormantOpportunityFeatures): { reactivationProbability: number; confidence: 'low' | 'medium' | 'high' } {
    let reactivationProbability: number;
    let confidence: 'low' | 'medium' | 'high' = 'low';

    if (features.dormancyCategory === 'likely_lost') {
      reactivationProbability = Math.max(0.1, 0.4 - features.daysSinceLastActivity / 500);
      confidence = 'low';
    } else if (features.dormancyCategory === 'long_dormant') {
      reactivationProbability = 0.35 + (1 - Math.min(1, features.daysSinceLastActivity / 60)) * 0.25;
      confidence = 'medium';
    } else {
      reactivationProbability = 0.5 + (1 - Math.min(1, features.daysSinceLastActivity / 21)) * 0.35;
      confidence = features.activityCountLast30Days > 0 ? 'high' : 'medium';
    }

    reactivationProbability = Math.max(0, Math.min(1, reactivationProbability));
    if (features.reactivationSuccessRate > 0) {
      reactivationProbability = (reactivationProbability + features.reactivationSuccessRate) / 2;
    }
    return { reactivationProbability, confidence };
  }

  private buildOptimalWindow(features: DormantOpportunityFeatures, start: Date, end: Date): OptimalReactivationWindow {
    let reason = 'Reach out within the next 7 days while opportunity is still warm.';
    if (features.dormancyCategory === 'long_dormant') {
      reason = 'Opportunity has been dormant 30+ days; earlier contact improves reactivation odds.';
    } else if (features.dormancyCategory === 'likely_lost') {
      reason = 'Long dormancy; prioritize high-value touch with clear value proposition.';
    }
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      reason,
    };
  }

  private buildRecommendedApproach(features: DormantOpportunityFeatures): RecommendedReactivationApproach {
    const channel: RecommendedReactivationApproach['channel'] = features.daysSinceLastActivity > 30 ? 'multi-touch' : 'email';
    const tone: RecommendedReactivationApproach['tone'] = features.dormancyCategory === 'likely_lost' ? 'consultative' : 'informational';
    const emphasis: string[] = ['value'];
    if (features.daysSinceLastActivity > 14) emphasis.push('timing');
    if (features.activityCountLast90Days === 0) emphasis.push('re-engagement');
    return { channel, tone, emphasis };
  }

  private buildKeySuccessFactors(features: DormantOpportunityFeatures): KeySuccessFactor[] {
    const factors: KeySuccessFactor[] = [
      { factor: 'Recent engagement', importance: 0.8, currentStatus: features.activityCountLast30Days > 0 ? 'met' : 'not_met' },
      { factor: 'Stage progression', importance: 0.6, currentStatus: features.daysSinceLastStageChange < 90 ? 'partially_met' : 'not_met' },
      { factor: 'Owner activity', importance: 0.7, currentStatus: features.ownerEngagementScore > 0.3 ? 'met' : 'not_met' },
    ];
    return factors;
  }

  private buildReactivationRisks(features: DormantOpportunityFeatures): ReactivationRisk[] {
    const risks: ReactivationRisk[] = [];
    if (features.daysSinceLastActivity >= 60) {
      risks.push({
        risk: 'Contact may have gone cold',
        severity: 'medium',
        mitigation: 'Lead with value and relevance; avoid generic outreach.',
      });
    }
    if (features.dormancyCategory === 'likely_lost') {
      risks.push({
        risk: 'Opportunity may be lost to competitor',
        severity: 'high',
        mitigation: 'Confirm status with champion; emphasize differentiators.',
      });
    }
    if (features.activityVelocityChange < -0.5) {
      risks.push({
        risk: 'Declining engagement trend',
        severity: 'low',
        mitigation: 'Try a different channel or message angle.',
      });
    }
    return risks;
  }
}
